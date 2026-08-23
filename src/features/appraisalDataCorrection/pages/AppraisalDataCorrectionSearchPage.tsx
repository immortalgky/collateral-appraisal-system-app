import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import Pagination from '@/shared/components/Pagination';
import Badge from '@/shared/components/Badge';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import { useSearchClosedAppraisals } from '../api/appraisalDataCorrection';

// Local to this page, same pattern as BlockUnitMaintenancePage.tsx.
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

const TOTAL_COLS = 4;

const AppraisalDataCorrectionSearchPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('appraisalDataCorrection');

  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // The list view returns property types as comma-joined codes ("B, L, LB"); show the
  // human descriptions instead. Same approach as AppraisalResultsTable.
  const propertyTypeParams = useParametersByGroup('PropertyType');
  const propertyTypeCodeToLabel = useMemo(
    () => new Map(propertyTypeParams.map(p => [p.code, p.description])),
    [propertyTypeParams],
  );
  const formatPropertyTypes = (value: string | null | undefined): string[] => {
    if (!value) return [];
    return (
      String(value)
        .split(',')
        .map(code => code.trim())
        .filter(Boolean)
        // Fall back to the raw code if the parameter table has no row for it, so an
        // unmapped type still shows something rather than disappearing.
        .map(code => propertyTypeCodeToLabel.get(code) ?? code)
    );
  };

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching, isError, error } = useSearchClosedAppraisals({
    search: debouncedSearch || undefined,
    pageNumber,
    pageSize,
  });

  const items = data?.result.items ?? [];
  const totalCount = data?.result.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirstLoad = isLoading && items.length === 0;
  const isRefetching = isFetching && !isFirstLoad;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">{t('search.loadFailed')}</p>
        <p className="text-sm text-gray-400">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">{t('search.title')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('search.subtitle')}</p>
      </div>

      <div className="shrink-0 w-96">
        <Input
          placeholder={t('search.placeholder')}
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPageNumber(0);
          }}
          leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
        />
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm table-fixed">
            {/* Customer names are short; the property-type column holds several Thai chips and is
                the one that actually needs room, so it takes the slack instead. Left to
                auto-layout it collapsed and wrapped mid-word. */}
            <colgroup>
              <col className="w-36" />
              <col className="w-72" />
              <col />
              <col className="w-32" />
            </colgroup>
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-left whitespace-nowrap">
                  {t('search.col.appraisalNumber')}
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-left whitespace-nowrap">
                  {t('search.col.customerName')}
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-left whitespace-nowrap">
                  {t('search.col.propertyTypes')}
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-center whitespace-nowrap">
                  {t('search.col.status')}
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-gray-100 ${isRefetching ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isFirstLoad ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-24' },
                    { width: 'w-48' },
                    { width: 'w-56' },
                    { width: 'w-20' },
                  ]}
                  rows={5}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={TOTAL_COLS} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-gray-500 font-medium">{t('search.empty')}</p>
                      <p className="text-xs text-gray-400">
                        {debouncedSearch ? t('search.tryDifferentSearch') : t('search.emptyHint')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/standalone/appraisal-data-correction/${item.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary text-xs">
                        {item.appraisalNumber ?? '—'}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-gray-700 truncate"
                      title={item.customerName ?? ''}
                    >
                      {item.customerName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {/* Chips rather than a comma-joined string: a property can carry several
                          types and the Thai descriptions are long enough that running text wraps
                          into an unreadable block. */}
                      <div className="flex flex-wrap gap-1">
                        {formatPropertyTypes(item.propertyTypes).map(label => (
                          <span
                            key={label}
                            className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 whitespace-nowrap"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge type="status" value={item.status} size="sm">
                        {item.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {isRefetching && (
            <div className="flex justify-center py-2">
              <Icon style="solid" name="spinner" className="size-4 text-primary animate-spin" />
            </div>
          )}
        </div>

        {totalCount > 0 && (
          <div className="shrink-0 border-t border-gray-200">
            <Pagination
              currentPage={pageNumber}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPageNumber}
              onPageSizeChange={size => {
                setPageSize(size);
                setPageNumber(0);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AppraisalDataCorrectionSearchPage;
