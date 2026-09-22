import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  PricingAnalysisSubjectType,
  useCreateOrGetReference,
  useCreateReferenceFromMethod,
} from '../../api/references';
import {
  useGetLeaseholdAnalysis,
  useGetProfitRentAnalysis,
  useGetIncomeAnalysis,
  useAddPricingAnalysisMethod,
} from '../../api';
import { mapToServerMethodType } from '../../store/saveEditingSelection';
import type { PropertyGroupItemDto } from '@/features/appraisal/api';
import { getMethodCode } from '../../utils/methodCode';

// Same real-pixel sizing AddMethodPopover uses: rem utilities scale with this repo's 13px root,
// so the Tailwind numbers (320/384) do not mean 320/384 here.
const POPOVER_WIDTH = 300;
const POPOVER_MAX_HEIGHT = 340;

/**
 * Method types that can host each kind of reference, as the board spells them. The reference's
 * anchor is NOT the method id — it is the id of the analysis that method owns, which only exists
 * once the method has been opened and saved at least once. That is why a kind can be "known" here
 * and still not be creatable yet.
 */
const HOST_METHOD_TYPES = {
  machinery: ['MC_COST'],
  leasehold: ['LH'],
  profitRent: ['PR'],
  income: ['I'],
} as const;

/**
 * Source method types the server will clone from — `CreateReferenceFromMethodCommandHandler`
 * compares against exactly these three strings. The board's own method types carry an approach
 * suffix (`WQS_COST`, `SAG_MARKET`, `DC_COST`), none of which match, so only a method typed with
 * the bare string can be offered as a copy source. Sending a suffixed one returns 400.
 */
const CLONEABLE_SOURCE_METHOD_TYPES = ['WQS', 'SaleGrid', 'DirectComparison'];

/**
 * The comparison methods a market reference can be calculated with. The server stores canonical
 * names (WQS / SaleGrid / DirectComparison) while the panels switch on these composite codes —
 * mapToServerMethodType bridges the two, and sending the composite raw is silently rejected.
 */
const REFERENCE_METHOD_TYPES = ['WQS_MARKET', 'SAG_MARKET', 'DC_MARKET'] as const;
type ReferenceMethodType = (typeof REFERENCE_METHOD_TYPES)[number];

const METHOD_SHORT_LABEL: Record<ReferenceMethodType, string> = {
  WQS_MARKET: 'WQS',
  SAG_MARKET: 'SAG',
  DC_MARKET: 'DC',
};

export interface CreatedReference {
  subjectType: PricingAnalysisSubjectType;
  anchorId: string;
  hostMethodId?: string;
  /**
   * The new reference's own PricingAnalysis id, straight from the create/clone response, so the
   * caller can open its calculation panel directly — that is the whole point of the button, and
   * landing anywhere else reads as "create did nothing".
   *
   * Required, not optional: there is one `onCreated` call and it always has this id. Optional
   * would push a `if (id)` onto every caller whose only honest branch is to do nothing — a
   * silent failure of exactly the kind this flow has already shipped twice.
   */
  referencePricingAnalysisId: string;
}

interface GroupMethod {
  id?: string;
  methodType: string;
  label: string;
}

interface CreateReferencePopoverProps {
  /** The group's PricingAnalysis id — also the source PA when cloning a method. */
  pricingAnalysisId: string;
  groupMethods: GroupMethod[];
  groupProperties: PropertyGroupItemDto[];
  onClose: () => void;
  /** Called once the reference exists, so the caller can drill straight into it. */
  onCreated: (ref: CreatedReference) => void;
}

type KindId = 'machinery' | 'leasehold' | 'profitRent' | 'income' | 'roomIncome';

export function CreateReferencePopover({
  pricingAnalysisId,
  groupMethods,
  groupProperties,
  onClose,
  onCreated,
}: CreateReferencePopoverProps) {
  const { t } = useTranslation('pricingAnalysis');
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorMarkerRef = useRef<HTMLSpanElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const [submitting, setSubmitting] = useState(false);

  const createMutation = useCreateOrGetReference();
  const cloneMutation = useCreateReferenceFromMethod();

  // ── Which method in this group hosts each kind ────────────────────────────
  const hostOf = useCallback(
    (types: readonly string[]) =>
      groupMethods.find(m => types.includes(m.methodType) && !!m.id) ?? null,
    [groupMethods],
  );

  const machineryHost = hostOf(HOST_METHOD_TYPES.machinery);
  const leaseholdHost = hostOf(HOST_METHOD_TYPES.leasehold);
  const profitRentHost = hostOf(HOST_METHOD_TYPES.profitRent);
  const incomeHost = hostOf(HOST_METHOD_TYPES.income);

  // ── Anchor lookups. Fixed hook count; each is disabled until its host exists. ──
  const leaseholdQuery = useGetLeaseholdAnalysis(
    leaseholdHost?.id ? pricingAnalysisId : undefined,
    leaseholdHost?.id,
  );
  const profitRentQuery = useGetProfitRentAnalysis(
    profitRentHost?.id ? pricingAnalysisId : undefined,
    profitRentHost?.id,
  );
  const incomeQuery = useGetIncomeAnalysis(
    incomeHost?.id ? pricingAnalysisId : undefined,
    incomeHost?.id,
  );

  // These two endpoints 404 when the method has never been saved (unlike the income one, which
  // maps 404 to undefined), so an error here means "no analysis yet", not a broken screen.
  const leaseholdAnchorId = leaseholdQuery.data?.analysis?.id;
  const profitRentAnchorId = profitRentQuery.data?.analysis?.id;
  const incomeAnchorId = incomeQuery.data?.id;

  // ── Machinery properties, the one anchor known without opening a method ────
  const machineryProperties = useMemo(
    () => groupProperties.filter(p => p.propertyType === 'MAC' && !!p.propertyId),
    [groupProperties],
  );

  // ── Kind list, in the mock's order, each with why it is or isn't available ──
  const kinds = useMemo(() => {
    const all: Array<{
      id: KindId;
      label: string;
      subjectType: PricingAnalysisSubjectType;
      host: GroupMethod | null;
      anchorId?: string;
      /** null when creatable; otherwise the reason shown next to the option. */
      blocked: string | null;
      /** Only this kind can be cloned from an existing method (server restriction). */
      cloneable: boolean;
    }> = [];

    const needsMethod = t('groupReferences.create.needsMethod');
    const needsSave = t('groupReferences.create.needsSave');

    if (machineryProperties.length > 0) {
      all.push({
        id: 'machinery',
        label: t('groupReferences.kinds.machineryCost'),
        subjectType: PricingAnalysisSubjectType.MachineryCostRef,
        host: machineryHost,
        // Anchor is the chosen property, resolved at submit time.
        blocked: machineryHost ? null : needsMethod,
        cloneable: false,
      });
    }

    all.push({
      id: 'leasehold',
      label: t('groupReferences.kinds.leaseholdLand'),
      subjectType: PricingAnalysisSubjectType.LeaseholdLandRef,
      host: leaseholdHost,
      anchorId: leaseholdAnchorId,
      blocked: !leaseholdHost ? needsMethod : !leaseholdAnchorId ? needsSave : null,
      cloneable: false,
    });

    all.push({
      id: 'profitRent',
      label: t('groupReferences.kinds.profitRent'),
      subjectType: PricingAnalysisSubjectType.ProfitRentRef,
      host: profitRentHost,
      anchorId: profitRentAnchorId,
      blocked: !profitRentHost ? needsMethod : !profitRentAnchorId ? needsSave : null,
      cloneable: false,
    });

    all.push({
      id: 'income',
      label: t('groupReferences.kinds.incomeLand'),
      subjectType: PricingAnalysisSubjectType.IncomeLandRef,
      host: incomeHost,
      anchorId: incomeAnchorId,
      blocked: !incomeHost ? needsMethod : !incomeAnchorId ? needsSave : null,
      cloneable: true,
    });

    all.push({
      id: 'roomIncome',
      label: t('groupReferences.kinds.roomIncome'),
      subjectType: PricingAnalysisSubjectType.RoomIncomeRef,
      host: incomeHost,
      // A room reference is keyed by a row inside a DCF method's own dialog; there is no row to
      // name from here, so this one is listed for completeness and always points the user there.
      blocked: t('groupReferences.create.roomOnlyInDcf'),
      cloneable: false,
    });

    return all;
  }, [
    t,
    machineryProperties.length,
    machineryHost,
    leaseholdHost,
    profitRentHost,
    incomeHost,
    leaseholdAnchorId,
    profitRentAnchorId,
    incomeAnchorId,
  ]);

  const firstAvailable = kinds.find(k => k.blocked === null);
  const [kindId, setKindId] = useState<KindId | ''>('');
  const selectedKind = kinds.find(k => k.id === kindId) ?? null;

  // Availability depends on the analysis queries above, which are still in flight on the first
  // render — picking a default only in useState's initialiser would leave the select blank (and
  // the submit button dead) for every kind whose anchor hadn't arrived yet. Re-home the selection
  // once, and again if the current pick turns out to be blocked.
  useEffect(() => {
    if (kindId && !kinds.find(k => k.id === kindId)?.blocked) return;
    if (firstAvailable) setKindId(firstAvailable.id);
  }, [kindId, kinds, firstAvailable]);

  const [propertyId, setPropertyId] = useState<string>(machineryProperties[0]?.propertyId ?? '');
  const [sourceMethodId, setSourceMethodId] = useState<string>('');
  // Which comparison method the new reference is calculated with. Without this the reference is
  // created empty and its panel opens on a "pick a method" placeholder — the button promised to
  // open the analysis, so the choice belongs here, before anything is created.
  const [methodType, setMethodType] = useState<ReferenceMethodType>('WQS_MARKET');
  const addMethodMutation = useAddPricingAnalysisMethod();

  const cloneSources = useMemo(
    () => groupMethods.filter(m => !!m.id && CLONEABLE_SOURCE_METHOD_TYPES.includes(m.methodType)),
    [groupMethods],
  );

  // ── Placement: portal to body so the table's own overflow can't clip this ──
  const getTrigger = () => anchorMarkerRef.current?.previousElementSibling as HTMLElement | null;

  const updatePlacement = useCallback(() => {
    const trigger = getTrigger();
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setAnchorRect(rect);
    const spaceBelow = window.innerHeight - rect.bottom;
    setPosition(
      spaceBelow < POPOVER_MAX_HEIGHT && rect.top > POPOVER_MAX_HEIGHT ? 'top' : 'bottom',
    );
  }, []);

  useLayoutEffect(() => {
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [updatePlacement]);

  useEffect(() => {
    containerRef.current?.focus();
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // The trigger lives outside the portalled panel; without this the click that closes the
      // popover would also re-fire the trigger's toggle and reopen it in the same gesture.
      if (getTrigger()?.contains(target)) return;
      if (containerRef.current && !containerRef.current.contains(target)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const canSubmit =
    !!selectedKind &&
    selectedKind.blocked === null &&
    !submitting &&
    (selectedKind.id !== 'machinery' || !!propertyId);

  const handleSubmit = async () => {
    if (!selectedKind || selectedKind.blocked !== null) return;

    const anchorId = selectedKind.id === 'machinery' ? propertyId : (selectedKind.anchorId ?? '');
    if (!anchorId) return;

    const hostMethodId = selectedKind.host?.id;
    setSubmitting(true);
    try {
      // Both paths return the new reference's own PricingAnalysis id. Capture it from whichever
      // ran — the clone path is just as much a "create and open" as the empty one, and handling
      // only the empty one would leave copying stranded on the list.
      const created =
        sourceMethodId && selectedKind.cloneable && hostMethodId
          ? await cloneMutation.mutateAsync({
              subjectType: selectedKind.subjectType,
              anchorId,
              hostMethodId,
              sourcePricingAnalysisId: pricingAnalysisId,
              sourceMethodId,
            })
          : await createMutation.mutateAsync({
              subjectType: selectedKind.subjectType,
              anchorId,
              hostMethodId,
            });

      // Seed the chosen comparison method so the panel opens on the analysis itself rather than
      // its empty method picker. Cloning already brings a method across, so only the from-scratch
      // path needs it.
      //
      // A failure here is deliberately NOT fatal: the reference exists and is perfectly usable —
      // its panel just shows the same WQS/SAG/DC picker it always did. Aborting instead would
      // leave that reference created but unreachable from this flow, which is strictly worse.
      // `wasCreated: false` means CreateOrGetReference matched an existing reference for this
      // (subjectType, anchor) rather than making one — seeding a method there appends a second
      // empty WQS to a reference that already had one, which is what turned a repeated click
      // into a duplicated method rather than a no-op.
      const seededMethod =
        created.wasCreated && !(sourceMethodId && selectedKind.cloneable && hostMethodId);
      if (seededMethod && created.marketApproachId) {
        try {
          await addMethodMutation.mutateAsync({
            pricingAnalysisId: created.pricingAnalysisId,
            approachId: created.marketApproachId,
            // Canonical server name (WQS / SaleGrid / DirectComparison) — the composite code the
            // panels switch on is not what the API accepts.
            request: { methodType: mapToServerMethodType(methodType), status: null },
          });
        } catch {
          toast.error(t('groupReferences.create.failed'));
        }
      }

      onCreated({
        subjectType: selectedKind.subjectType,
        anchorId,
        hostMethodId,
        referencePricingAnalysisId: created.pricingAnalysisId,
      });
      onClose();
    } catch {
      toast.error(t('groupReferences.create.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Right-align to the trigger instead of left-aligning: the button sits at the right end of the
  // board's last column, so growing rightwards from it ran the panel under the Application
  // Details column beside the board. Clamped to the viewport as a floor so a narrow window
  // cannot push it off the left edge either.
  const left = anchorRect
    ? Math.max(8, Math.min(anchorRect.right - POPOVER_WIDTH, window.innerWidth - POPOVER_WIDTH - 8))
    : 0;
  const selectClass =
    'h-[30px] w-full rounded-[7px] border border-gray-300 bg-white px-1.5 text-[12px] text-gray-700 disabled:bg-gray-50 disabled:text-gray-400';

  return (
    <>
      <span ref={anchorMarkerRef} className="hidden" aria-hidden="true" />
      {createPortal(
        <div
          ref={containerRef}
          tabIndex={-1}
          style={{
            position: 'fixed',
            width: POPOVER_WIDTH,
            maxHeight: POPOVER_MAX_HEIGHT,
            left,
            ...(position === 'bottom'
              ? { top: (anchorRect?.bottom ?? 0) + 4 }
              : { bottom: window.innerHeight - (anchorRect?.top ?? 0) + 4 }),
            visibility: anchorRect ? 'visible' : 'hidden',
          }}
          className="z-[100] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg flex flex-col outline-none text-left"
        >
          {/* mock:3258 `.addh` */}
          <div className="px-3 py-2 text-[12px] font-semibold text-gray-800 border-b border-gray-100 shrink-0">
            {t('groupReferences.create.title')}
          </div>

          <div className="flex flex-col gap-2 p-3 overflow-y-auto">
            {/* mock:3260 — "ใช้สำหรับ" */}
            <label className="grid gap-1">
              <span className="text-[11.5px] text-gray-500">
                {t('groupReferences.create.kindLabel')}
              </span>
              <select
                className={selectClass}
                value={kindId}
                onChange={e => setKindId(e.target.value as KindId)}
              >
                {kinds.map(k => (
                  <option key={k.id} value={k.id} disabled={k.blocked !== null}>
                    {k.blocked === null ? k.label : `${k.label} — ${k.blocked}`}
                  </option>
                ))}
              </select>
            </label>

            {/* mock:3261 — "ทรัพย์ที่ประเมิน". Only the machinery kind takes a property as its
                anchor; for the others the anchor is the host method's analysis, so showing a
                property picker there would imply a choice that does not exist. */}
            {selectedKind?.id === 'machinery' && (
              <label className="grid gap-1">
                <span className="text-[11.5px] text-gray-500">
                  {t('groupReferences.create.subjectLabel')}
                </span>
                <select
                  className={selectClass}
                  value={propertyId}
                  onChange={e => setPropertyId(e.target.value)}
                >
                  {machineryProperties.map((p, i) => (
                    <option key={p.propertyId} value={p.propertyId ?? ''}>
                      {i + 1}. {p.propertyName?.trim() || p.machineName?.trim() || '—'}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Comparison method. Disabled while copying, because the clone carries the source
                method over — offering a choice that would be ignored is worse than not offering
                one. */}
            <label className="grid gap-1">
              <span className="text-[11.5px] text-gray-500">
                {t('groupReferences.create.methodLabel')}
              </span>
              <select
                className={selectClass}
                value={methodType}
                disabled={!!sourceMethodId}
                onChange={e => setMethodType(e.target.value as ReferenceMethodType)}
              >
                {REFERENCE_METHOD_TYPES.map(mt => (
                  <option key={mt} value={mt}>
                    {METHOD_SHORT_LABEL[mt]}
                  </option>
                ))}
              </select>
            </label>

            {/* mock:3262 — "เริ่มจาก". Cloning is server-side restricted to the land-value
                reference and to unsuffixed WQS/SaleGrid/DirectComparison sources. Hidden rather
                than shown disabled when there is nothing to copy from: a greyed select whose only
                option is "new (empty)" offers no choice and just reads as something broken. */}
            {selectedKind?.cloneable && cloneSources.length > 0 && (
              <label className="grid gap-1">
                <span className="text-[11.5px] text-gray-500">
                  {t('groupReferences.create.fromLabel')}
                </span>
                <select
                  className={selectClass}
                  value={sourceMethodId}
                  disabled={!selectedKind?.cloneable || cloneSources.length === 0}
                  onChange={e => setSourceMethodId(e.target.value)}
                >
                  <option value="">{t('groupReferences.create.fromEmpty')}</option>
                  {selectedKind?.cloneable &&
                    cloneSources.map(m => (
                      <option key={m.id} value={m.id}>
                        {t('groupReferences.create.fromCopy', {
                          method: `${getMethodCode(m.methodType)} · ${m.label}`,
                        })}
                      </option>
                    ))}
                </select>
              </label>
            )}

            <p className="m-0 text-[11px] leading-[1.45] text-gray-500">
              {t('groupReferences.create.note')}
            </p>
          </div>

          {/* mock:3265 `.addf` */}
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-gray-100 shrink-0">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 cursor-pointer"
              onClick={onClose}
            >
              {t('addMethodPopover.cancel')}
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[12px] font-medium text-white',
                canSubmit
                  ? 'bg-primary hover:bg-primary/90 cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed',
              )}
            >
              {t('groupReferences.create.submit')}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
