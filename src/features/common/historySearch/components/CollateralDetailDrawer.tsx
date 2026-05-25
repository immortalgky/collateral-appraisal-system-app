import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CollateralPinDto, LandDetailDto, CondoDetailDto, LeaseholdDetailDto, MachineDetailDto, UnderlyingMasterSummaryDto } from '../types';
import { useCollateralEngagements } from '../hooks/useCollateralEngagements';
import { useCollateralEngagementDetail } from '../hooks/useCollateralEngagementDetail';
import { useCollateralMasterDetail } from '../hooks/useCollateralMasterDetail';
import { getCollateralTypeLabel } from '../utils';
import { findAddressBySubDistrictCode, findProvinceNameByCode } from '@shared/data/thaiAddresses';
import { formatNumber } from '@shared/utils/formatUtils';

// ─── Ordinal helper ───────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// ─── Row helper (mirrors PinDetailDrawer) ────────────────────────────────────

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3 text-sm py-1">
      <span className="text-gray-500 shrink-0 text-xs">{label}</span>
      <span className={['text-gray-800 text-right break-all text-xs', mono ? 'tabular-nums' : ''].join(' ')}>
        {value}
      </span>
    </div>
  );
}

// ─── Spinner (matches the pattern used across the feature) ───────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <svg className="w-5 h-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    </div>
  );
}

// ─── Per-type identity sections ───────────────────────────────────────────────

function LandSummary({ d, na, t }: { d: LandDetailDto; na: string; t: ReturnType<typeof useTranslation<'historySearch'>>['t'] }) {
  // Resolve codes → names via the shared address store.
  const addrHit = d.subDistrict ? findAddressBySubDistrictCode(d.subDistrict) : undefined;
  const subDistrictText = addrHit?.subDistrictName ?? d.subDistrict ?? na;
  const districtText = addrHit?.districtName ?? d.district ?? na;
  const provinceResolved = addrHit?.provinceName ?? (d.province ? findProvinceNameByCode(d.province) : undefined) ?? d.province ?? na;

  return (
    <>
      <Row label={t('collateralDetail.identity.landOfficeCode')} value={d.landOfficeCode ?? na} />
      <Row label={t('collateralDetail.identity.titleType')} value={d.titleType ?? na} />
      <Row label={t('collateralDetail.identity.titleNumber')} value={d.titleNumber ?? na} />
      <Row label={t('collateralDetail.identity.parcelNumber')} value={d.landParcelNumber ?? na} />
      <Row label={t('collateralDetail.identity.surveyNumber')} value={d.surveyNumber ?? na} />
      <Row label={t('collateralDetail.identity.subDistrict')} value={subDistrictText} />
      <Row label={t('collateralDetail.identity.district')} value={districtText} />
      <Row label={t('collateralDetail.identity.province')} value={provinceResolved} />
      <Row
        label={t('collateralDetail.identity.landArea')}
        value={d.landArea != null ? formatNumber(d.landArea, 2) : na}
        mono
      />
      <Row label={t('collateralDetail.identity.street')} value={d.street ?? na} />
      <Row label={t('collateralDetail.identity.village')} value={d.village ?? na} />
      {d.aliasTitles.length > 0 && (
        <div className="py-1">
          <p className="text-xs text-gray-500 mb-1">{t('collateralDetail.identity.otherTitles')}</p>
          <ul className="pl-2 flex flex-col gap-0.5">
            {d.aliasTitles.map((a, i) => (
              <li key={i} className="text-xs text-gray-700">
                {a.titleType} {a.titleNumber}{a.surveyNumber ? ` — ${a.surveyNumber}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function CondoSummary({ d, na, t }: { d: CondoDetailDto; na: string; t: ReturnType<typeof useTranslation<'historySearch'>>['t'] }) {
  const provinceResolved = (d.province ? findProvinceNameByCode(d.province) : undefined) ?? d.province ?? na;
  return (
    <>
      <Row label={t('collateralDetail.identity.landOfficeCode')} value={d.landOfficeCode ?? na} />
      <Row label={t('collateralDetail.identity.condoRegistrationNumber')} value={d.condoRegistrationNumber ?? na} />
      <Row label={t('collateralDetail.identity.building')} value={d.buildingNumber ?? na} />
      <Row label={t('collateralDetail.identity.floor')} value={d.floorNumber ?? na} />
      <Row label={t('collateralDetail.identity.unit')} value={d.roomNumber ?? na} />
      <Row label={t('collateralDetail.identity.titleNumber')} value={d.titleNumber ?? na} />
      <Row label={t('collateralDetail.identity.titleType')} value={d.titleType ?? na} />
      <Row label={t('collateralDetail.identity.condoName')} value={d.condoName ?? na} />
      <Row label={t('collateralDetail.identity.province')} value={provinceResolved} />
      <Row
        label={t('collateralDetail.identity.usableArea')}
        value={d.usableArea != null ? formatNumber(d.usableArea, 2) : na}
        mono
      />
      <Row label={t('collateralDetail.identity.model')} value={d.modelName ?? na} />
    </>
  );
}

function LeaseholdSummary({
  d, underlying, na, t,
}: {
  d: LeaseholdDetailDto;
  underlying: UnderlyingMasterSummaryDto | null;
  na: string;
  t: ReturnType<typeof useTranslation<'historySearch'>>['t'];
}) {
  const underlyingProvince = underlying?.province
    ? ((findProvinceNameByCode(underlying.province)) ?? underlying.province)
    : null;
  return (
    <>
      <Row label={t('collateralDetail.identity.leaseRegistrationNo')} value={d.leaseRegistrationNo ?? na} />
      <Row label={t('collateralDetail.identity.lessor')} value={d.lessor ?? na} />
      <Row label={t('collateralDetail.identity.lessee')} value={d.lessee ?? na} />
      <Row label={t('collateralDetail.identity.leaseTermStart')} value={d.leaseTermStart ?? na} />
      <Row label={t('collateralDetail.identity.leaseTermEnd')} value={d.leaseTermEnd ?? na} />
      {underlying && (
        <div className="py-1">
          <p className="text-xs text-gray-500 mb-1">{t('collateralDetail.identity.underlyingMaster')}</p>
          <div className="pl-2 flex flex-col gap-0.5">
            <Row label={t('collateralDetail.identity.province')} value={underlyingProvince ?? na} />
            <Row label={t('collateralDetail.identity.titleNumber')} value={underlying.titleNumber ?? na} />
          </div>
        </div>
      )}
    </>
  );
}

function MachineSummary({ d, na, t }: { d: MachineDetailDto; na: string; t: ReturnType<typeof useTranslation<'historySearch'>>['t'] }) {
  return (
    <>
      <Row label={t('collateralDetail.identity.machineRegistrationNo')} value={d.machineRegistrationNo ?? na} />
      <Row label={t('collateralDetail.identity.serialNo')} value={d.serialNo ?? na} />
      <Row label={t('collateralDetail.identity.brand')} value={d.brand ?? na} />
      <Row label={t('collateralDetail.identity.model')} value={d.model ?? na} />
      <Row label={t('collateralDetail.identity.manufacturer')} value={d.manufacturer ?? na} />
    </>
  );
}

// ─── Summary tab ─────────────────────────────────────────────────────────────

interface SummaryTabProps {
  collateralMasterId: string;
}

function SummaryTab({ collateralMasterId }: SummaryTabProps) {
  const { t } = useTranslation('historySearch');
  const { data, isPending, isError } = useCollateralMasterDetail(collateralMasterId);

  if (isPending) return <Spinner />;

  if (isError || !data) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-red-500">{t('resultsList.loadError')}</p>
      </div>
    );
  }

  const na = t('common.na');
  const collateralTypeLabel = getCollateralTypeLabel(data.collateralType, t);
  const type = data.collateralType?.toUpperCase() ?? '';

  return (
    <div className="p-4 flex flex-col divide-y divide-gray-100">
      <Row label={t('collateralDetail.collateralType')} value={collateralTypeLabel || na} />
      {(type === 'L' || type === 'LB') && data.landDetail && (
        <LandSummary d={data.landDetail} na={na} t={t} />
      )}
      {type === 'U' && data.condoDetail && (
        <CondoSummary d={data.condoDetail} na={na} t={t} />
      )}
      {(type === 'LSL' || type === 'LSB' || type === 'LS') && data.leaseholdDetail && (
        <LeaseholdSummary d={data.leaseholdDetail} underlying={data.underlyingMaster} na={na} t={t} />
      )}
      {type === 'MAC' && data.machineDetail && (
        <MachineSummary d={data.machineDetail} na={na} t={t} />
      )}
    </div>
  );
}

// ─── Properties tab ───────────────────────────────────────────────────────────

interface PropertiesTabProps {
  collateralMasterId: string;
  engagementId: string;
}

/**
 * Atom component for one property row. Because this is rendered as a JSX
 * element with a key (not called inside a loop), hooks inside are fine.
 */
function PropertyRow({
  name,
  collateralType,
  area,
  latitude,
  longitude,
}: {
  name: string | null;
  collateralType: string | null;
  area: number | null;
  latitude: number | null;
  longitude: number | null;
}) {
  const { t } = useTranslation('historySearch');
  const na = t('common.na');
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-2 text-xs text-gray-800">{name ?? na}</td>
      <td className="px-3 py-2 text-xs text-gray-600">
        {collateralType ? getCollateralTypeLabel(collateralType, t) : na}
      </td>
      <td className="px-3 py-2 text-xs text-gray-600 tabular-nums text-right">
        {area != null ? formatNumber(area, 2) : na}
      </td>
      <td className="px-3 py-2 text-xs text-gray-600 tabular-nums text-right">
        {latitude != null && longitude != null
          ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          : na}
      </td>
    </tr>
  );
}

function PropertiesTab({ collateralMasterId, engagementId }: PropertiesTabProps) {
  const { t } = useTranslation('historySearch');
  const { data, isPending, isError } = useCollateralEngagementDetail(
    collateralMasterId,
    engagementId,
  );

  if (isPending) return <Spinner />;

  if (isError || !data) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-red-500">{t('resultsList.loadError')}</p>
      </div>
    );
  }

  const { groups } = data;

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <p className="text-xs text-gray-500">{t('propertyListing.empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {groups.map(group => (
        <div key={group.groupNumber}>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            {t('propertyListing.groupHeading', {
              number: group.groupNumber,
              count: group.properties.length,
            })}
          </p>
          {group.properties.length === 0 ? (
            <p className="text-xs text-gray-400 pl-1">{t('propertyListing.groupEmpty')}</p>
          ) : (
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 border-b border-gray-200">
                      {t('propertyListing.columns.name')}
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 border-b border-gray-200">
                      {t('propertyListing.columns.collateralType')}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600 border-b border-gray-200">
                      {t('propertyListing.columns.area')}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600 border-b border-gray-200">
                      {t('propertyListing.columns.latLon')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.properties.map(prop => (
                    <PropertyRow
                      key={prop.propertyId}
                      name={prop.name}
                      collateralType={prop.collateralType}
                      area={prop.area}
                      latitude={prop.latitude}
                      longitude={prop.longitude}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

type TabKey = 'summary' | 'properties';

interface CollateralDetailDrawerProps {
  pin: CollateralPinDto;
  onClose: () => void;
}

/**
 * Level-2 / Level-3 combined drawer for collateral detail.
 *
 * Shows a round-selector dropdown (populated from useCollateralEngagements),
 * defaults to the latest engagement, and renders detail via
 * useCollateralEngagementDetail keyed on the selected engagement.
 *
 * Tabs: Summary (identity fields) | Properties (grouped property table).
 */
export function CollateralDetailDrawer({ pin, onClose }: CollateralDetailDrawerProps) {
  const { t } = useTranslation('historySearch');

  // ── Engagements list (for the round selector and total count) ──────────────
  const { data: engagementsData, isPending: engagementsPending } =
    useCollateralEngagements(pin.collateralMasterId, 0);

  const engagements = engagementsData?.items ?? [];
  const totalRounds = engagementsData?.count ?? 0;

  // Sort newest-first by appraisalDate, falling back to array order.
  const sortedEngagements = useMemo(() => {
    return [...engagements].sort((a, b) => {
      if (!a.appraisalDate && !b.appraisalDate) return 0;
      if (!a.appraisalDate) return 1;
      if (!b.appraisalDate) return -1;
      return b.appraisalDate.localeCompare(a.appraisalDate);
    });
  }, [engagements]);

  // Default to the first item (newest after sort) once loaded.
  const defaultEngagementId = sortedEngagements[0]?.id ?? null;
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);

  // Resolve the effective engagement id — use state if set, otherwise latest.
  const effectiveEngagementId = selectedEngagementId ?? defaultEngagementId;

  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  // ── Appraisal link: resolved from the currently shown detail ──────────────
  // We need the appraisalId from the selected engagement item.
  const selectedEngagement = useMemo(
    () => sortedEngagements.find(e => e.id === effectiveEngagementId),
    [sortedEngagements, effectiveEngagementId],
  );
  const appraisalId = selectedEngagement?.appraisalId ?? null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div
        className="absolute right-0 top-0 h-full w-[36rem] bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={t('collateralDetail.drawerTitle')}
        data-testid="collateral-detail-drawer"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-gray-200">
          {/* Top row: back + close */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {t('collateralDetail.backToSearch')}
            </button>
            <button
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

          {/* Round count */}
          <div className="px-4 pb-2">
            <p className="text-[11px] text-gray-500">
              {t('collateralDetail.totalRounds', { count: totalRounds })}
            </p>
          </div>

          {/* Round selector + link */}
          <div className="px-4 pb-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] text-gray-500 mb-1">
                {t('collateralDetail.selectRoundLabel')}
              </label>
              {engagementsPending ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <select
                  value={effectiveEngagementId ?? ''}
                  onChange={e => setSelectedEngagementId(e.target.value || null)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {sortedEngagements.map((eng, idx) => {
                    const dateLabel = eng.appraisalDate
                      ? new Date(eng.appraisalDate).toLocaleDateString('en-GB')
                      : t('common.na');
                    return (
                      <option key={eng.id} value={eng.id}>
                        {`${ordinal(sortedEngagements.length - idx)} ${t('collateralDetail.roundOptionSuffix')} (${dateLabel})`}
                      </option>
                    );
                  })}
                  {sortedEngagements.length === 0 && (
                    <option value="">{t('common.na')}</option>
                  )}
                </select>
              )}
            </div>

            {/* Link to appraisal report */}
            {appraisalId && (
              <Link
                to={`/appraisals/${appraisalId}`}
                className="shrink-0 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline transition-colors mt-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {t('collateralDetail.linkToReport')}
              </Link>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex border-t border-gray-100">
            <TabButton
              active={activeTab === 'summary'}
              onClick={() => setActiveTab('summary')}
              label={t('collateralDetail.tabSummary')}
            />
            <TabButton
              active={activeTab === 'properties'}
              onClick={() => setActiveTab('properties')}
              label={t('collateralDetail.tabProperties')}
            />
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {!effectiveEngagementId ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <p className="text-xs text-gray-500">{t('engagementList.empty')}</p>
            </div>
          ) : activeTab === 'summary' ? (
            <SummaryTab
              collateralMasterId={pin.collateralMasterId}
            />
          ) : (
            <PropertiesTab
              collateralMasterId={pin.collateralMasterId}
              engagementId={effectiveEngagementId}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors',
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
