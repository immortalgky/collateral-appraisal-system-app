import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import { formatNumber } from '@shared/utils/formatUtils';
import type { AppraisalPinDto, MarketComparablePinDto, HistorySearchResult } from '../types';
import type { CsvHeaders } from '../csv';
import { buildCsv, downloadCsv } from '../csv';

// ─── Inline map-pin icon (renders reliably inside table cells) ─────────────────
// Orange = Appraisal, Blue = Market Comparable — matches the map markers in
// /public/markers/*.svg and the panel legend.
function PinIcon({ color, title }: { color: string; title: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="18" className="block mx-auto" role="img" aria-label={title}>
      <title>{title}</title>
      <path
        d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 11.5 7.3 11.76a1 1 0 0 0 1.4 0C13 21.5 20 15.25 20 10c0-4.42-3.58-8-8-8z"
        fill={color}
      />
      <circle cx="12" cy="10" r="3" fill="#ffffff" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey =
  | 'reportNo'
  | 'date'
  | 'lat'
  | 'lon'
  | 'customerName'
  | 'collateralType'
  | 'buildingType'
  | 'appraisalValue'
  | 'sellingPrice'
  | 'offeringPrice'
  | 'distance';
type SortDir = 'asc' | 'desc';

interface ResultRow {
  kind: 'appraisal' | 'mc';
  reportNo: string;
  date: string | null;
  lat: number;
  lon: number;
  customerName: string | null;
  collateralType: string | null;
  buildingType: string | null;
  appraisalValue: number | null;
  sellingPrice: number | null;
  offeringPrice: number | null;
  distanceKm: number | null;
  /** Pin id used for hover highlight: appraisalId or marketComparableId */
  pinId: string;
  pin: AppraisalPinDto | MarketComparablePinDto;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB');
}

function formatMoney(value: number | null): string {
  return value == null ? '—' : formatNumber(value);
}

// Render null, empty, or whitespace-only text as the empty-cell dash.
function dash(value: string | null | undefined): string {
  return value && value.trim() ? value : '—';
}

function compareRows(a: ResultRow, b: ResultRow, key: SortKey, dir: SortDir): number {
  const text = (x: string | null) => x ?? '';
  const num = (x: number | null) => (x == null ? Number.NEGATIVE_INFINITY : x);
  let cmp = 0;
  switch (key) {
    case 'reportNo':
      cmp = a.reportNo.localeCompare(b.reportNo, undefined, { sensitivity: 'base' });
      break;
    case 'date': {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      cmp = aTime - bTime;
      break;
    }
    case 'lat':
      cmp = a.lat - b.lat;
      break;
    case 'lon':
      cmp = a.lon - b.lon;
      break;
    case 'customerName':
      cmp = text(a.customerName).localeCompare(text(b.customerName), undefined, { sensitivity: 'base' });
      break;
    case 'collateralType':
      cmp = text(a.collateralType).localeCompare(text(b.collateralType), undefined, { sensitivity: 'base' });
      break;
    case 'buildingType':
      cmp = text(a.buildingType).localeCompare(text(b.buildingType), undefined, { sensitivity: 'base' });
      break;
    case 'appraisalValue':
      cmp = num(a.appraisalValue) - num(b.appraisalValue);
      break;
    case 'sellingPrice':
      cmp = num(a.sellingPrice) - num(b.sellingPrice);
      break;
    case 'offeringPrice':
      cmp = num(a.offeringPrice) - num(b.offeringPrice);
      break;
    case 'distance': {
      // Nulls last: rows without distance sort after those with distance
      const aD = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const bD = b.distanceKm ?? Number.POSITIVE_INFINITY;
      cmp = aD - bD;
      break;
    }
  }
  return dir === 'asc' ? cmp : -cmp;
}

// ─── Sort header cell ─────────────────────────────────────────────────────────

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      scope="col"
      className={[
        'px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50 uppercase tracking-wider',
        className,
      ].filter(Boolean).join(' ')}
      aria-sort={active ? (currentDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-gray-700 transition-colors group ${
          active ? 'text-primary' : ''
        }`}
      >
        <span>{label}</span>
        <Icon
          style="solid"
          name={active ? (currentDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'}
          className={`size-2.5 ${active ? 'text-primary' : 'text-gray-300 group-hover:text-gray-500'}`}
        />
      </button>
    </th>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ResultsListProps {
  result: HistorySearchResult | undefined;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  pageNumber: number;
  onPageChange: (page: number) => void;
  isExternal: boolean;
  onAppraisalClick: (pin: AppraisalPinDto) => void;
  onMarketComparableClick: (pin: MarketComparablePinDto) => void;
  /** Pin id of the currently hovered row/marker (from parent state) */
  highlightedPinId?: string | null;
  /** Called when a row is hovered; provides the pin id (or null on leave) */
  onRowHover?: (pinId: string | null) => void;
}

export function ResultsList({
  result,
  isError,
  isPending,
  onRetry,
  pageNumber,
  onPageChange,
  isExternal,
  onAppraisalClick,
  onMarketComparableClick,
  highlightedPinId,
  onRowHover,
}: ResultsListProps) {
  const { t } = useTranslation('historySearch');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const appraisalItems = !isExternal && result ? result.appraisals.items : [];
  const appraisalTotal = !isExternal && result ? result.appraisals.count : 0;
  const mcItems = result ? result.marketComparables.items : [];
  const mcTotal = result ? result.marketComparables.count : 0;
  const totalPages = Math.max(
    1,
    Math.ceil(appraisalTotal / 50),
    Math.ceil(mcTotal / 50),
  );

  // Always call useMemo unconditionally — deps are empty arrays when result is absent
  const rows = useMemo<ResultRow[]>(() => {
    const appraisalRows: ResultRow[] = appraisalItems.map(pin => ({
      kind: 'appraisal',
      reportNo: pin.appraisalNumber ?? '—',
      date: pin.appraisedDate,
      lat: pin.lat,
      lon: pin.lon,
      customerName: pin.customerName,
      collateralType: pin.propertyType, // raw code — mapped to description in the cell
      buildingType: pin.buildingType, // raw code — mapped to description in the cell
      appraisalValue: pin.appraisedValue,
      sellingPrice: null,
      offeringPrice: null,
      distanceKm: pin.distanceKm,
      pinId: pin.appraisalId,
      pin,
    }));

    const mcRows: ResultRow[] = mcItems.map(pin => ({
      kind: 'mc',
      reportNo: pin.appraisalNumber ?? pin.surveyName ?? '—',
      // "Appraisal Date" for a market comparable = the appointment date of the appraisal
      // it belongs to (falls back to its own survey date when not linked to one).
      date: pin.appraisalDate ?? pin.infoDateTime,
      lat: pin.lat,
      lon: pin.lon,
      customerName: pin.customerName,
      collateralType: pin.propertyType, // raw code — mapped to description in the cell
      buildingType: null,
      appraisalValue: null,
      sellingPrice: pin.salePrice,
      offeringPrice: pin.offerPrice,
      distanceKm: pin.distanceKm,
      pinId: pin.marketComparableId,
      pin,
    }));

    return [...appraisalRows, ...mcRows].sort((a, b) =>
      compareRows(a, b, sortKey, sortDir),
    );
  }, [appraisalItems, mcItems, sortKey, sortDir]);

  // Show distance column only when any row carries a non-null distanceKm
  const showDistance = rows.some(r => r.distanceKm != null);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleExportCsv = () => {
    const headers: CsvHeaders = {
      type: 'Type',
      reportNo: t('resultsList.columns.appraisalReportNo'),
      customerName: t('resultsList.columns.customerName'),
      collateralType: t('resultsList.columns.collateralType'),
      buildingType: t('resultsList.columns.buildingType'),
      date: t('resultsList.columns.appraisalDate'),
      latitude: t('resultsList.columns.latitude'),
      longitude: t('resultsList.columns.longitude'),
      distance: t('resultsList.columns.distance'),
      appraisalValue: t('resultsList.columns.appraisalValue'),
      sellingPrice: t('resultsList.columns.sellingPrice'),
      offeringPrice: t('resultsList.columns.offeringPrice'),
    };
    const content = buildCsv(rows, headers, showDistance);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCsv(content, `history-search-${timestamp}.csv`);
  };

  // ── Loading / Error / No-result states ──────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <p className="text-sm text-red-500">{t('resultsList.loadError')}</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-blue-600 hover:underline"
        >
          {t('resultsList.retry')}
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="w-5 h-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (!result) return null;

  const hasAnyResults = appraisalTotal > 0 || mcTotal > 0;

  if (!hasAnyResults) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <p className="text-xs text-gray-500">{t('resultsList.empty')}</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Export button bar */}
      <div className="shrink-0 flex items-center justify-end px-3 py-1.5 border-b border-gray-100 bg-gray-50">
        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-white transition-colors"
          title={t('resultsList.exportCsv')}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t('resultsList.exportCsv')}
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              {/* Pin icon — not sortable */}
              <th scope="col" className="w-8 px-4 py-2.5 bg-gray-50" aria-label="type" />
              <SortableHeader
                label={t('resultsList.columns.appraisalReportNo')}
                sortKey="reportNo"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="min-w-[120px]"
              />
              <SortableHeader
                label={t('resultsList.columns.customerName')}
                sortKey="customerName"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="min-w-[120px]"
              />
              <SortableHeader
                label={t('resultsList.columns.collateralType')}
                sortKey="collateralType"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="min-w-[110px]"
              />
              <SortableHeader
                label={t('resultsList.columns.buildingType')}
                sortKey="buildingType"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="min-w-[100px]"
              />
              <SortableHeader
                label={t('resultsList.columns.appraisalDate')}
                sortKey="date"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="min-w-[80px]"
              />
              <SortableHeader
                label={t('resultsList.columns.latitude')}
                sortKey="lat"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="min-w-[72px]"
              />
              <SortableHeader
                label={t('resultsList.columns.longitude')}
                sortKey="lon"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="min-w-[72px]"
              />
              {showDistance && (
                <SortableHeader
                  label={t('resultsList.columns.distance')}
                  sortKey="distance"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="min-w-[72px]"
                />
              )}
              <SortableHeader
                label={t('resultsList.columns.appraisalValue')}
                sortKey="appraisalValue"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="min-w-[110px] text-right"
              />
              <SortableHeader
                label={t('resultsList.columns.sellingPrice')}
                sortKey="sellingPrice"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="min-w-[110px] text-right"
              />
              <SortableHeader
                label={t('resultsList.columns.offeringPrice')}
                sortKey="offeringPrice"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="min-w-[110px] text-right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => {
              const isAppraisal = row.kind === 'appraisal';
              // Results are EXISTING pins: collateral (appraisal) = green, MC = blue.
              const pinColor = isAppraisal ? '#22c55e' : '#3b82f6';
              const dotTitle = isAppraisal
                ? t('resultsList.tabs.appraisal')
                : t('resultsList.tabs.marketComparable');

              const isHighlighted = highlightedPinId != null && highlightedPinId === row.pinId;

              const handleClick = () => {
                if (isAppraisal) {
                  onAppraisalClick(row.pin as AppraisalPinDto);
                } else {
                  onMarketComparableClick(row.pin as MarketComparablePinDto);
                }
              };

              return (
                <tr
                  key={`${row.kind}-${row.pinId}`}
                  onClick={handleClick}
                  onMouseEnter={() => onRowHover?.(row.pinId)}
                  onMouseLeave={() => onRowHover?.(null)}
                  className={[
                    'cursor-pointer transition-colors hover:bg-gray-50',
                    isHighlighted ? 'bg-amber-50' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <td className="px-4 py-3">
                    <PinIcon color={pinColor} title={dotTitle} />
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-primary truncate max-w-[160px]">
                    {row.reportNo}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[140px]">
                    {dash(row.customerName)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {row.collateralType ? (
                      <ParameterDisplay group="PropertyType" code={row.collateralType} fallback={row.collateralType} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {row.buildingType ? (
                      <ParameterDisplay group="BuildingType" code={row.buildingType} fallback={row.buildingType} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 tabular-nums whitespace-nowrap">
                    {row.lat.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 tabular-nums whitespace-nowrap">
                    {row.lon.toFixed(6)}
                  </td>
                  {showDistance && (
                    <td className="px-4 py-3 text-xs text-gray-600 tabular-nums whitespace-nowrap">
                      {row.distanceKm != null ? `${row.distanceKm.toFixed(2)} km` : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-xs text-gray-600 tabular-nums text-right whitespace-nowrap">
                    {formatMoney(row.appraisalValue)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 tabular-nums text-right whitespace-nowrap">
                    {formatMoney(row.sellingPrice)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 tabular-nums text-right whitespace-nowrap">
                    {formatMoney(row.offeringPrice)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
          <span>{t('resultsList.pagination', { page: pageNumber + 1, total: totalPages })}</span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={pageNumber === 0}
              onClick={() => onPageChange(pageNumber - 1)}
              className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50"
            >
              &lsaquo;
            </button>
            <button
              type="button"
              disabled={pageNumber >= totalPages - 1}
              onClick={() => onPageChange(pageNumber + 1)}
              className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50"
            >
              &rsaquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
