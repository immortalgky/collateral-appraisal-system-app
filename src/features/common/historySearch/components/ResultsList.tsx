import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CollateralPinDto, MarketComparablePinDto, HistorySearchResult } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'reportNo' | 'date' | 'lat' | 'lon';
type SortDir = 'asc' | 'desc';

interface ResultRow {
  kind: 'collateral' | 'mc';
  reportNo: string;
  date: string | null;
  lat: number;
  lon: number;
  pin: CollateralPinDto | MarketComparablePinDto;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB');
}

function compareRows(a: ResultRow, b: ResultRow, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  if (key === 'reportNo') {
    cmp = a.reportNo.localeCompare(b.reportNo, undefined, { sensitivity: 'base' });
  } else if (key === 'date') {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    cmp = aTime - bTime;
  } else if (key === 'lat') {
    cmp = a.lat - b.lat;
  } else {
    cmp = a.lon - b.lon;
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
        'px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap',
        active ? 'text-blue-700' : 'text-gray-500',
        className,
      ].join(' ')}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-0.5">
        {label}
        <span className="ml-0.5 text-[9px] leading-none">
          {active ? (currentDir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </span>
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
  onCollateralClick: (pin: CollateralPinDto) => void;
  onMarketComparableClick: (pin: MarketComparablePinDto) => void;
}

export function ResultsList({
  result,
  isError,
  isPending,
  onRetry,
  pageNumber,
  onPageChange,
  isExternal,
  onCollateralClick,
  onMarketComparableClick,
}: ResultsListProps) {
  const { t } = useTranslation('historySearch');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const collateralItems = !isExternal && result ? result.collateral.items : [];
  const collateralTotal = !isExternal && result ? result.collateral.count : 0;
  const mcItems = result ? result.marketComparables.items : [];
  const mcTotal = result ? result.marketComparables.count : 0;
  const totalPages = Math.max(
    1,
    Math.ceil(collateralTotal / 50),
    Math.ceil(mcTotal / 50),
  );

  // Always call useMemo unconditionally — deps are empty arrays when result is absent
  const rows = useMemo<ResultRow[]>(() => {
    const collateralRows: ResultRow[] = collateralItems.map(pin => ({
      kind: 'collateral',
      reportNo: pin.lastAppraisalNumber ?? '—',
      date: pin.lastAppraisedDate,
      lat: pin.lat,
      lon: pin.lon,
      pin,
    }));

    const mcRows: ResultRow[] = mcItems.map(pin => ({
      kind: 'mc',
      reportNo: pin.appraisalNumber ?? pin.surveyName ?? '—',
      date: pin.infoDateTime,
      lat: pin.lat,
      lon: pin.lon,
      pin,
    }));

    return [...collateralRows, ...mcRows].sort((a, b) =>
      compareRows(a, b, sortKey, sortDir),
    );
  }, [collateralItems, mcItems, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
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

  const hasAnyResults = collateralTotal > 0 || mcTotal > 0;

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
      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              {/* Pin dot — not sortable */}
              <th scope="col" className="w-6 px-2 py-2" aria-label="type" />
              <SortableHeader
                label={t('resultsList.columns.appraisalReportNo')}
                sortKey="reportNo"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="min-w-[120px]"
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, idx) => {
              const isCollateral = row.kind === 'collateral';
              const hoverClass = isCollateral ? 'hover:bg-green-50' : 'hover:bg-blue-50';
              const dotColor = isCollateral ? 'bg-green-500' : 'bg-blue-500';
              const dotTitle = isCollateral
                ? t('resultsList.tabs.collateral')
                : t('resultsList.tabs.marketComparable');

              const handleClick = () => {
                if (isCollateral) {
                  onCollateralClick(row.pin as CollateralPinDto);
                } else {
                  onMarketComparableClick(row.pin as MarketComparablePinDto);
                }
              };

              return (
                <tr
                  // eslint-disable-next-line react/no-array-index-key
                  key={idx}
                  onClick={handleClick}
                  className={`cursor-pointer transition-colors ${hoverClass}`}
                >
                  <td className="px-2 py-2">
                    <span
                      className={`block w-2 h-2 rounded-full ${dotColor}`}
                      title={dotTitle}
                    />
                  </td>
                  <td className="px-2 py-2 font-medium text-blue-600 truncate max-w-[160px]">
                    {row.reportNo}
                  </td>
                  <td className="px-2 py-2 text-gray-600 whitespace-nowrap">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-2 py-2 text-gray-600 tabular-nums whitespace-nowrap">
                    {row.lat.toFixed(6)}
                  </td>
                  <td className="px-2 py-2 text-gray-600 tabular-nums whitespace-nowrap">
                    {row.lon.toFixed(6)}
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
