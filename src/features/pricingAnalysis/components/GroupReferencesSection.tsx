/**
 * GroupReferencesSection
 *
 * Renders as the last group of rows inside PricingAnalysisMethodBoard's `<table>` — the
 * compact mock's `refRowsHtml()` folds this into the same table rather than a separate card,
 * so this returns `<tr>`s (no wrapping element) for the caller to place inside its `<tbody>`.
 * Displays all market references scoped to the group's PricingAnalysis
 * (those whose HostMethodId belongs to one of the group's methods).
 *
 * Actions: Open (drill-in) · Delete. No Apply.
 *
 * On the mock's "+ สร้างข้อมูลอ้างอิง" button (mock:3244, picker at mock:3257): the endpoint does
 * exist (useCreateOrGetReference), so the blocker is the anchor, not the backend. Every reference
 * type is anchored to something that lives inside a method — MachineryCostRef to a property id,
 * IncomeLandRef to a DCF income-analysis id, LeaseholdLandRef/ProfitRentRef to that method's
 * analysis id, RoomIncomeRef to a row inside a DCF method modal. Of those, only the machinery
 * anchor is known at this screen; the rest do not exist until that method has been opened and
 * saved. CreateOrGetReferenceCommandHandler stores whatever AnchorId it is handed without
 * checking that it resolves, so supplying a placeholder would silently create an orphan. It also
 * rejects PropertyGroup/ProjectModel outright — there is no group-level reference.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Icon } from '@/shared/components';
import Badge from '@/shared/components/Badge';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import {
  useGetGroupReferences,
  useDeleteReference,
  PricingAnalysisSubjectType,
  type ReferenceDto,
} from '../api/references';
import { CreateReferencePopover } from './selection/CreateReferencePopover';
import type { PropertyGroupItemDto } from '@/features/appraisal/api';
import { getMethodCode } from '../utils/methodCode';
import { REFERENCE_PARAM } from '../constants/urlParams';

/**
 * Open a reference as a full page. The page (PricingAnalysisPage) watches this param and swaps
 * the whole board for the reference's calculation panel, so a reference behaves like any other
 * method rather than like a dialog — which is what the user asked for. Writing the URL here,
 * rather than calling a prop threaded down through PricingAnalysisMethodBoard, keeps the two
 * intermediate components out of it entirely.
 *
 * Pushes (no `replace`), so the browser's Back leaves the reference exactly like the page's own
 * back button does.
 */
function useOpenReference() {
  const [searchParams, setSearchParams] = useSearchParams();
  return (referencePricingAnalysisId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(REFERENCE_PARAM, referencePricingAnalysisId);
    setSearchParams(next);
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface GroupReferencesSectionProps {
  /** The group's PricingAnalysis id (state.pricingAnalysisId) */
  pricingAnalysisId: string | undefined;
  /** Group methods for resolving host-method label */
  groupMethods: Array<{ id?: string; methodType: string; label: string }>;
  /** Group properties for resolving machinery item name */
  groupProperties: PropertyGroupItemDto[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNumber(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── ReferenceRow ──────────────────────────────────────────────────────────────

interface ReferenceRowProps {
  ref_: ReferenceDto;
  groupMethods: GroupReferencesSectionProps['groupMethods'];
  groupProperties: PropertyGroupItemDto[];
  readOnly: boolean;
  onDelete: (ref: ReferenceDto) => void;
}

function ReferenceRow({
  ref_,
  groupMethods,
  groupProperties,
  readOnly,
  onDelete,
}: ReferenceRowProps) {
  const { t } = useTranslation('pricingAnalysis');
  const openReference = useOpenReference();

  // Resolve host-method label from group methods
  const hostMethod = groupMethods.find(m => m.id === ref_.hostMethodId);
  const hostMethodLabel = hostMethod?.label ?? ref_.hostMethodId ?? '—';

  // Resolve item label by subjectType
  const isMachinery = ref_.subjectType === PricingAnalysisSubjectType.MachineryCostRef;
  const isRoom = ref_.subjectType === PricingAnalysisSubjectType.RoomIncomeRef;

  let itemLabel: string;
  if (isMachinery) {
    const prop = groupProperties.find(p => p.propertyId === ref_.anchorId);
    // PropertyName first: it is what the machinery form writes, so a machine renamed there would
    // otherwise keep showing its old MachineName here while every other surface shows the new one.
    // Blank counts as absent — the form can write PropertyName = ''.
    itemLabel =
      prop?.propertyName?.trim() ||
      prop?.machineName?.trim() ||
      t('groupReferences.subjects.machineryCostRef');
  } else if (isRoom) {
    itemLabel = ref_.anchorRefKey ?? t('groupReferences.subjects.roomIncomeRef');
  } else {
    // Static t() calls (typed i18n keys); dynamic template keys aren't allowed by the typed t().
    const subjectLabels: Record<number, string> = {
      [PricingAnalysisSubjectType.IncomeLandRef]: t('groupReferences.subjects.incomeLandRef'),
      [PricingAnalysisSubjectType.LeaseholdLandRef]: t('groupReferences.subjects.leaseholdLandRef'),
      [PricingAnalysisSubjectType.ProfitRentRef]: t('groupReferences.subjects.profitRentRef'),
    };
    itemLabel = subjectLabels[ref_.subjectType] ?? t('groupReferences.subjects.machineryCostRef');
  }

  const isCalculated = ref_.methods.some(m => m.valuePerUnit != null);

  return (
    <>
      <tr className="h-[30px]">
        <td className="px-[8px] py-0 border-r border-r-[#eef2f2] whitespace-nowrap"></td>
        <td className="px-[8px] py-0 border-r border-r-[#eef2f2] min-w-0">
          <button
            type="button"
            onClick={() => openReference(ref_.pricingAnalysisId)}
            className="text-left hover:underline cursor-pointer truncate min-w-0 text-gray-700"
          >
            {hostMethod && (
              <>
                <span
                  className="shrink-0 text-[10px] font-semibold leading-[16px] px-[5px] rounded-[4px]"
                  style={{ background: '#edf1f1', color: '#55636f' }}
                >
                  {getMethodCode(hostMethod.methodType)}
                </span>{' '}
              </>
            )}
            <span className="text-[11px] text-[#8a96a0]">{hostMethodLabel}</span>{' '}
            <span className="font-medium">{itemLabel}</span>
          </button>
        </td>
        <td className="px-[8px] py-0 border-r border-r-[#eef2f2] whitespace-nowrap">
          {/* Same height override as the method rows' status chip (see
              PricingAnalysisMethodBoardRow) — these sit in one table, so the two have to be
              sized together or the reference rows end up taller than the method rows. */}
          <Badge
            size="xs"
            dot
            badgeStyle="soft"
            type="status"
            className="py-0! leading-[14px]"
            value={isCalculated ? 'completed' : 'cancelled'}
          >
            {isCalculated ? t('methodStatus.calculated') : t('groupReferences.noValue')}
          </Badge>
        </td>
        <td className="px-[8px] py-0 text-right tabular-nums whitespace-nowrap">
          {ref_.methods.length === 0
            ? '—'
            : ref_.methods.map((m, i) => (
                <span key={m.methodId} className={clsx('text-gray-700', i > 0 && 'ml-2')}>
                  <span className="text-gray-400 text-[10px] uppercase">
                    {getMethodCode(m.methodType)}
                  </span>{' '}
                  {m.valuePerUnit != null ? formatNumber(m.valuePerUnit) : '—'}
                </span>
              ))}
        </td>
        <td className="px-[8px] py-0 text-[#8a96a0] whitespace-nowrap">—</td>
        <td className="px-[8px] py-0 text-right whitespace-nowrap">
          <button
            type="button"
            onClick={() => openReference(ref_.pricingAnalysisId)}
            className="text-primary text-[12px] font-medium hover:underline cursor-pointer"
          >
            {isCalculated ? t('board.openMethod') : t('board.startCalculating')}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onDelete(ref_)}
              aria-label={t('groupReferences.deleteReference')}
              title={t('groupReferences.deleteReference')}
              className="p-1 ml-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Icon
                name="xmark"
                style="solid"
                className="size-3.5 text-gray-400 hover:text-red-500 transition-colors"
              />
            </button>
          )}
        </td>
      </tr>
    </>
  );
}

// ── GroupReferencesSection ────────────────────────────────────────────────────

export function GroupReferencesSection({
  pricingAnalysisId,
  groupMethods,
  groupProperties,
}: GroupReferencesSectionProps) {
  const { t } = useTranslation('pricingAnalysis');
  const readOnly = usePageReadOnly();
  const openReference = useOpenReference();
  const [deleteTarget, setDeleteTarget] = useState<ReferenceDto | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading } = useGetGroupReferences(pricingAnalysisId);
  const deleteMutation = useDeleteReference();

  const references = data?.references ?? [];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({
        pricingAnalysisId: deleteTarget.pricingAnalysisId,
        subjectType: deleteTarget.subjectType,
        anchorId: deleteTarget.anchorId,
        anchorRefKey: deleteTarget.anchorRefKey,
        groupPricingAnalysisId: pricingAnalysisId,
      });
    } catch {
      toast.error(t('groupReferences.deleteFailed'));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      {/* Band header — same row shape as an approach row (tr.apr.refband in the mock) */}
      <tr className="h-[30px] bg-[#f8fafa]">
        <td className="px-[8px] py-0 border-r border-r-[#eef2f2] whitespace-nowrap">
          <Icon name="chart-bar" style="solid" className="size-3 text-gray-400" />
        </td>
        <td className="px-[8px] py-0 border-r border-r-[#eef2f2] whitespace-nowrap" colSpan={2}>
          <span className="font-semibold text-gray-800">{t('groupReferences.sectionTitle')}</span>{' '}
          <span className="text-gray-400">
            {t('groupReferences.bandSubtitle', { count: references.length })}
          </span>
        </td>
        <td className="px-[8px] py-0 border-r border-r-[#eef2f2] whitespace-nowrap"></td>
        <td className="px-[8px] py-0 border-r border-r-[#eef2f2] whitespace-nowrap"></td>
        {/* mock:3244 — `button.addm` in the band's last cell, same link styling as the board's
            per-approach "+ เพิ่มวิธี". */}
        <td className="px-[8px] py-0 text-right whitespace-nowrap">
          {!readOnly && pricingAnalysisId && (
            <div className="relative inline-block text-left">
              <button
                type="button"
                className="text-primary text-[12px] font-medium hover:underline cursor-pointer"
                onClick={() => setIsCreateOpen(open => !open)}
              >
                {t('groupReferences.createReference')}
              </button>
              {isCreateOpen && (
                <CreateReferencePopover
                  pricingAnalysisId={pricingAnalysisId}
                  groupMethods={groupMethods}
                  groupProperties={groupProperties}
                  onClose={() => setIsCreateOpen(false)}
                  /* Straight onto the reference's page (mock:3961 `enterRef` after create) —
                     the same destination the row's link goes to, so creating and opening an
                     existing one land in the same place. No waiting for the list refetch:
                     the popover already knows the id it just created. */
                  onCreated={created => openReference(created.referencePricingAnalysisId)}
                />
              )}
            </div>
          )}
        </td>
      </tr>

      {isLoading ? (
        <tr>
          <td></td>
          <td colSpan={5} className="px-[8px] py-2">
            <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full" />
          </td>
        </tr>
      ) : references.length === 0 ? (
        /* mock:3245 — `tr.empty-apr`. The band stays visible with nothing in it rather than
           disappearing, so the group's reference slot reads as empty instead of absent. */
        <tr className="h-[30px]">
          <td className="px-[8px] py-0 border-r border-r-[#eef2f2]"></td>
          <td colSpan={5} className="px-[8px] py-0 text-gray-400">
            {t('groupReferences.empty')}
          </td>
        </tr>
      ) : (
        references.map(ref => (
          <ReferenceRow
            key={ref.pricingAnalysisId}
            ref_={ref}
            groupMethods={groupMethods}
            groupProperties={groupProperties}
            readOnly={readOnly}
            onDelete={setDeleteTarget}
          />
        ))
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        title={t('groupReferences.deleteReference')}
        message={t('groupReferences.deleteConfirm')}
      />
    </>
  );
}
