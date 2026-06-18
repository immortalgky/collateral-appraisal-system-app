import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AnyPin, AppraisalPinDto, MarketComparablePinDto } from '../types';
import { isAppraisalPin } from '../types';
import { formatNumber } from '@shared/utils/formatUtils';
import { useGetMarketComparableById } from '@features/appraisal/api/marketComparable';
import { getTranslatedFactorName } from '@shared/utils/translationUtils';
import { useLocaleStore } from '@shared/store';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import { buildPinIcon } from '../icons';
import Icon from '@shared/components/Icon';
import { useGetDecisionSummary } from '@features/appraisal/api/decisionSummary';
import { useEnrichedPropertyGroups } from '@features/appraisal/hooks/useEnrichedPropertyGroups';
import type { PropertyItem, LandTitleInfo } from '@features/appraisal/types';

interface PinDetailDrawerProps {
  pin: AnyPin | null;
  onClose: () => void;
  /** Label for a primary action button shown in the footer (e.g. "Link to this appraisal"). */
  actionLabel?: string;
  /** Called when the footer action button is clicked. Receives the current pin. */
  onAction?: (pin: AnyPin) => void;
  /** Disable/spinner state for the action button while the action is in flight. */
  actionPending?: boolean;
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3 text-sm">
      <span className="text-gray-500 shrink-0 text-xs">{label}</span>
      <span className={['text-gray-800 text-right break-all', mono ? 'tabular-nums' : ''].join(' ')}>
        {value}
      </span>
    </div>
  );
}

// ─── Appraisal extra section (lazy-loaded prices + image + groups) ────────────

// Land-title fields rendered as label/value rows (string/simple fields only — area & prices handled separately).
const LAND_TITLE_FIELDS: { key: keyof LandTitleInfo; labelKey: string }[] = [
  { key: 'titleNumber', labelKey: 'titleNumber' },
  { key: 'bookNumber', labelKey: 'bookNumber' },
  { key: 'pageNumber', labelKey: 'pageNumber' },
  { key: 'landParcelNumber', labelKey: 'landParcelNumber' },
  { key: 'surveyNumber', labelKey: 'surveyNumber' },
  { key: 'mapSheetNumber', labelKey: 'mapSheetNumber' },
  { key: 'rawang', labelKey: 'rawang' },
  { key: 'aerialMapName', labelKey: 'aerialMapName' },
  { key: 'aerialMapNumber', labelKey: 'aerialMapNumber' },
];

// One land title — flat label/value rows (like the price section), only fields that have a value.
function LandTitleRows({ title }: { title: LandTitleInfo }) {
  const { t } = useTranslation('historySearch');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lt = (k: string) => t(`pinDetail.landTitle.${k}` as any) as string;

  const area = [title.rai, title.ngan, title.squareWa].some(v => v != null)
    ? `${title.rai ?? 0}-${title.ngan ?? 0}-${title.squareWa ?? 0}`
    : null;

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
      {title.titleType && (
        <Row
          label={lt('titleType')}
          value={<ParameterDisplay group="DeedType" code={title.titleType} fallback={title.titleType} />}
        />
      )}
      {LAND_TITLE_FIELDS.map(f => {
        const v = title[f.key];
        return v != null && v !== '' ? <Row key={f.key} label={lt(f.labelKey)} value={String(v)} /> : null;
      })}
      {area && <Row label={lt('area')} value={area} mono />}
      {title.governmentPricePerSqWa != null && (
        <Row label={lt('governmentPricePerSqWa')} value={formatNumber(title.governmentPricePerSqWa, 2)} mono />
      )}
      {title.governmentPrice != null && (
        <Row label={lt('governmentPrice')} value={formatNumber(title.governmentPrice, 2)} mono />
      )}
      {title.remark && <Row label={lt('remark')} value={title.remark} />}
    </div>
  );
}

// One property row — image, address, type badge, area, coordinates (compact, drawer-friendly).
function PropertyRow({ item, notSet }: { item: PropertyItem; notSet: string }) {
  const coords =
    item.latitude != null && item.longitude != null
      ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`
      : null;
  // `address` holds the property name (mapped from propertyName); `location` is the admin address.
  const name = item.address && item.address !== '-' ? item.address : null;
  const location = item.location && item.location !== '-' ? item.location : '—';

  return (
    <div className="flex gap-2 rounded-lg border border-gray-100 p-2">
      {item.image ? (
        <img src={item.image} alt="" className="w-10 h-10 rounded object-cover bg-gray-100 shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
          <Icon name="image" style="solid" className="w-3.5 h-3.5 text-gray-300" />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {name && <span className="text-xs font-medium text-gray-800 break-words">{name}</span>}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded bg-teal-50 px-1.5 py-0.5 text-[11px] font-medium text-teal-700">
            <ParameterDisplay group="PropertyType" code={item.type} fallback={item.type} />
          </span>
          <span className="text-[11px] text-gray-500 tabular-nums">{item.area}</span>
        </div>
        <span className="text-xs text-gray-500 break-words">{location}</span>
        <span className={`text-[11px] tabular-nums ${coords ? 'text-gray-500' : 'text-gray-400 italic'}`}>
          {coords ?? notSet}
        </span>
      </div>
    </div>
  );
}

function AppraisalExtraSection({ appraisalId }: { appraisalId: string }) {
  const { t } = useTranslation('historySearch');

  // Prices (same source as the 360 sticky header).
  const { data: summaryData, isLoading: isLoadingPrices } = useGetDecisionSummary(appraisalId);

  // Property groups, enriched with per-property image / address / area / coordinates.
  const { groups, isLoading: isLoadingGroups } = useEnrichedPropertyGroups(appraisalId);

  const na = t('common.na');
  const notSet = t('pinDetail.appraisal.coordinatesNotSet');

  return (
    <>
      {/* ── Three prices ────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {t('pinDetail.appraisal.prices')}
        </p>
        {isLoadingPrices ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 rounded bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Row
              label={t('pinDetail.appraisal.appraisalPrice')}
              value={summaryData?.totalAppraisalPrice != null
                ? formatNumber(summaryData.totalAppraisalPrice, 2)
                : na}
              mono
            />
            <Row
              label={t('pinDetail.appraisal.forceSellingPrice')}
              value={summaryData?.forceSellingPrice != null
                ? formatNumber(summaryData.forceSellingPrice, 2)
                : na}
              mono
            />
            <Row
              label={t('pinDetail.appraisal.buildingInsurance')}
              value={summaryData?.buildingInsurance != null
                ? formatNumber(summaryData.buildingInsurance, 2)
                : na}
              mono
            />
          </div>
        )}
      </div>

      {/* ── Land Title Information (all titles across every property/group, flattened) ── */}
      {!isLoadingGroups && (() => {
        const allTitles = groups.flatMap(g => g.items).flatMap(it => it.titles ?? []);
        if (allTitles.length === 0) return null;
        return (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('pinDetail.appraisal.landTitleInfo')}
            </p>
            <div className="flex flex-col gap-2">
              {allTitles.map((tt, i) => (
                <LandTitleRows key={tt.id ?? i} title={tt} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Property groups (per-property rows) ─────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {t('pinDetail.appraisal.propertyGroups')}
        </p>
        {isLoadingGroups ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-14 rounded bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : groups.length > 0 ? (
          <div className="flex flex-col gap-3">
            {groups.map((g, gi) => (
              <div key={g.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {g.name || `Group ${g.groupNumber ?? gi + 1}`}
                  </span>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {g.items.length}{' '}
                    {g.items.length === 1
                      ? t('pinDetail.appraisal.property')
                      : t('pinDetail.appraisal.properties')}
                  </span>
                </div>
                {g.items.map(item => (
                  <PropertyRow key={item.id} item={item} notSet={notSet} />
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

// ─── Appraisal detail (green pin) ─────────────────────────────────────────────

function AppraisalDetail({ pin }: { pin: AppraisalPinDto }) {
  const { t } = useTranslation('historySearch');
  const locationParts = [pin.subDistrict, pin.district, pin.province].filter(Boolean);
  const location = locationParts.join(', ') || t('common.na');

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <img src={buildPinIcon('collateralExisting')} alt="" className="w-4 h-5 shrink-0" />
        <h4 className="text-sm font-semibold text-gray-800">{t('pinDetail.appraisal.title')}</h4>
      </div>

      <div className="flex flex-col gap-2">
        <Row label={t('pinDetail.appraisal.appraisalNumber')} value={pin.appraisalNumber ?? t('common.na')} />
        <Row label={t('pinDetail.appraisal.customerName')} value={pin.customerName ?? t('common.na')} />
        <Row
          label={t('pinDetail.appraisal.propertyType')}
          value={pin.propertyType
            ? <ParameterDisplay group="PropertyType" code={pin.propertyType} fallback={pin.propertyType} />
            : t('common.na')}
        />
        <Row
          label={t('pinDetail.appraisal.appraisedDate')}
          value={pin.appraisedDate
            ? new Date(pin.appraisedDate).toLocaleDateString('en-GB')
            : t('common.na')}
        />
        <Row label={t('pinDetail.appraisal.location')} value={location} />
      </div>

      {/* Extra data + "view full appraisal" only when a real in-system appraisal
          backs this pin. Reappraisal candidates (AS400-only / SIBS-pending) have
          no appraisalId — skip the fetch to avoid querying a non-existent appraisal. */}
      {pin.appraisalId ? (
        <>
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-3">
            <AppraisalExtraSection appraisalId={pin.appraisalId} />
          </div>

          <Link
            to={`/appraisals/${pin.appraisalId}`}
            className="mt-2 flex items-center justify-center gap-1.5 w-full bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-sm font-medium py-2 rounded-lg transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
            {t('pinDetail.appraisal.openReport')}
          </Link>
        </>
      ) : null}
    </div>
  );
}

// ─── Survey Factors section ───────────────────────────────────────────────────

interface FactorDataDto {
  factorId: string;
  factorCode: string;
  fieldName: string;
  dataType: string;
  fieldDecimal: number | null;
  parameterGroup: string | null;
  value: string | null;
  otherRemarks: string | null;
  translations: { language: string; factorName: string }[];
}

function SurveyFactorsSection({ marketComparableId }: { marketComparableId: string }) {
  const { t } = useTranslation('historySearch');
  const language = useLocaleStore(s => s.language);
  const { data, isLoading, isError } = useGetMarketComparableById(marketComparableId);

  const factors: FactorDataDto[] = data?.marketComparable?.factorData ?? [];

  if (isLoading) {
    return (
      <div className="mt-1 flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t('pinDetail.marketComparable.factors')}
        </p>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 rounded bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || factors.length === 0) return null;

  return (
    <div className="mt-1 flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {t('pinDetail.marketComparable.factors')}
      </p>
      {factors.map(factor => {
        const label = getTranslatedFactorName(factor.translations, language) || factor.fieldName;
        const na = t('common.na');

        // Treat null, empty string, and empty multi-select arrays ("[]") as "no value"
        // so empty checkbox-group factors render N/A consistently instead of blank.
        const raw = factor.value?.trim() ?? '';
        const hasValue = raw !== '' && raw !== '[]';
        const isParameterized = hasValue && !!factor.parameterGroup;
        const isNumeric =
          hasValue &&
          !factor.parameterGroup &&
          factor.dataType === 'Numeric' &&
          !isNaN(Number(raw));

        return (
          <div key={factor.factorId} className="flex justify-between items-start gap-3 text-sm">
            <span className="text-gray-500 shrink-0 text-xs">{label}</span>
            <div className="text-gray-800 text-right break-all flex flex-col items-end gap-0.5">
              {!hasValue ? (
                <span>{na}</span>
              ) : isParameterized ? (
                <ParameterDisplay
                  group={factor.parameterGroup!}
                  code={factor.value}
                  fallback={na}
                  className="text-sm"
                />
              ) : (
                <span>
                  {isNumeric
                    ? formatNumber(Number(factor.value), factor.fieldDecimal ?? 0)
                    : factor.value}
                </span>
              )}
              {factor.otherRemarks && (
                <span className="text-xs text-gray-400 italic">{factor.otherRemarks}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Market Comparable detail ─────────────────────────────────────────────────

function MarketComparableDetail({ pin }: { pin: MarketComparablePinDto }) {
  const { t } = useTranslation('historySearch');

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <img src={buildPinIcon('mcExisting')} alt="" className="w-4 h-5 shrink-0" />
        <h4 className="text-sm font-semibold text-gray-800">{t('pinDetail.marketComparable.title')}</h4>
      </div>

      <div className="flex flex-col gap-2">
        <Row label={t('pinDetail.marketComparable.surveyName')} value={pin.surveyName} />
        <Row
          label={t('pinDetail.marketComparable.propertyType')}
          value={pin.propertyType
            ? <ParameterDisplay group="PropertyType" code={pin.propertyType} fallback={pin.propertyType} />
            : t('common.na')}
        />
        <Row
          label={t('pinDetail.marketComparable.infoDateTime')}
          value={pin.infoDateTime
            ? new Date(pin.infoDateTime).toLocaleDateString('en-GB')
            : t('common.na')}
        />
        <Row
          label={t('pinDetail.marketComparable.offerPrice')}
          value={pin.offerPrice != null ? formatNumber(pin.offerPrice, 0) : t('common.na')}
          mono
        />
        <Row
          label={t('pinDetail.marketComparable.salePrice')}
          value={pin.salePrice != null ? formatNumber(pin.salePrice, 0) : t('common.na')}
          mono
        />
      </div>
      <SurveyFactorsSection marketComparableId={pin.marketComparableId} />
    </div>
  );
}

// ─── Focusable element selector for tab-trap ─────────────────────────────────

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// ─── Drawer shell ─────────────────────────────────────────────────────────────

export function PinDetailDrawer({ pin, onClose, actionLabel, onAction, actionPending }: PinDetailDrawerProps) {
  const { t } = useTranslation('historySearch');
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus to the close button when the drawer opens
  useEffect(() => {
    if (!pin) return;
    // Defer so the element is mounted before we call focus()
    const id = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [pin]);

  // Esc closes the drawer
  useEffect(() => {
    if (!pin) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pin, onClose]);

  // Minimal Tab-cycle focus trap scoped to the drawer
  useEffect(() => {
    if (!pin) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(el => !el.closest('[aria-hidden="true"]'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pin]);

  if (!pin) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={t('pinDetail.title')}
        data-testid="pin-detail-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h3 className="text-sm font-semibold text-gray-800">{t('pinDetail.title')}</h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
            aria-label={t('pinDetail.close')}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isAppraisalPin(pin) ? (
            <AppraisalDetail pin={pin} />
          ) : (
            <MarketComparableDetail pin={pin} />
          )}
        </div>

        {/* Footer action — e.g. "Link to this appraisal" in the Find-Existing flow */}
        {actionLabel && onAction && (
          <div className="shrink-0 border-t border-gray-200 px-4 py-3">
            <button
              type="button"
              onClick={() => onAction(pin)}
              disabled={actionPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {actionPending && (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
