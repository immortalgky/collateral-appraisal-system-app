import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import Pagination from '@shared/components/Pagination';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import { formatLocaleDate } from '@shared/utils/dateUtils';
import { useTranslation } from 'react-i18next';
import NativeSelect from '@/shared/components/inputs/NativeSelect';
import { useProvinceName, usePropertyTypeLabels } from '@/shared/hooks/useCodeLabels';
import { formatCurrency } from '@/shared/utils/formatUtils';
import { useCollateralCatalog } from '../api/hooks';
import type { CollateralCatalogParams, CollateralType } from '../api/types';

const TYPE_ICON: Record<CollateralType, string> = {
  L: 'mountain-sun',
  LB: 'mountain-sun',
  U: 'building-user',
  LSL: 'file-contract',
  LSB: 'file-contract',
  LS: 'file-contract',
  LSU: 'file-contract',
  MAC: 'gear',
  PRJ: 'building',
  UNK: 'circle-question',
};

const TYPE_CODES = Object.keys(TYPE_ICON) as CollateralType[];

export default function CollateralCatalogPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  // PropertyType uses the same codes as the backend's collateral types; unknown ones show as the code
  const typeLabel = usePropertyTypeLabels();
  const provinceName = useProvinceName();

  // Filters
  const [type, setType] = useState<CollateralType | ''>('');
  const [province, setProvince] = useState('');
  const [owner, setOwner] = useState('');
  const [isUnderConstruction, setIsUnderConstruction] = useState<boolean | undefined>();
  const [lastAppraisedFrom, setLastAppraisedFrom] = useState('');
  const [lastAppraisedTo, setLastAppraisedTo] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const params: CollateralCatalogParams = {
    ...(type && { type }),
    ...(province && { province }),
    ...(owner && { owner }),
    ...(isUnderConstruction != null && { isUnderConstruction }),
    ...(lastAppraisedFrom && { lastAppraisedFrom }),
    ...(lastAppraisedTo && { lastAppraisedTo }),
    page,
    pageSize,
  };

  const { data, isLoading, isFetching, isError, error } = useCollateralCatalog(params);

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirstLoad = isLoading && items.length === 0;
  const isRefetching = isFetching && !isFirstLoad;

  const handleClearFilters = () => {
    setType('');
    setProvince('');
    setOwner('');
    setIsUnderConstruction(undefined);
    setLastAppraisedFrom('');
    setLastAppraisedTo('');
    setPage(0);
  };

  const hasFilters =
    type ||
    province ||
    owner ||
    isUnderConstruction != null ||
    lastAppraisedFrom ||
    lastAppraisedTo;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-(--palette-gray-600)">Failed to load collateral masters</p>
        <p className="text-sm text-(--palette-gray-400)">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-(--palette-ink)">Collateral Masters</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-(--palette-surface-3) text-(--palette-gray-600) rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-(--palette-gray-500) mt-0.5">
            Admin catalog of all collateral masters (Land / Condo / Leasehold / Machine)
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/admin/collateral-masters/backfill')}
          variant="outline"
        >
          <Icon style="solid" name="database" className="size-3.5 mr-1.5" />
          Backfill Report
        </Button>
      </div>

      {/* Filters */}
      <div className="shrink-0 flex flex-wrap gap-3 pb-1">
        {/* Type */}
        <NativeSelect
          value={type}
          onChange={e => {
            setType(e.target.value as CollateralType | '');
            setPage(0);
          }}
          className="min-w-32"
        >
          <option value="">{t('collateralMaster.allTypes')}</option>
          {TYPE_CODES.map(code => (
            <option key={code} value={code}>
              {typeLabel(code)}
            </option>
          ))}
        </NativeSelect>

        {/* Province */}
        <input
          type="text"
          placeholder="Province..."
          value={province}
          onChange={e => {
            setProvince(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 text-sm border border-(--palette-line) rounded-lg outline-none bg-(--palette-surface) hover:border-(--palette-line-strong) w-36"
        />

        {/* Owner */}
        <input
          type="text"
          placeholder="Owner..."
          value={owner}
          onChange={e => {
            setOwner(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 text-sm border border-(--palette-line) rounded-lg outline-none bg-(--palette-surface) hover:border-(--palette-line-strong) w-40"
        />

        {/* Under construction filter */}
        <NativeSelect
          value={isUnderConstruction == null ? '' : String(isUnderConstruction)}
          onChange={e => {
            setIsUnderConstruction(e.target.value === '' ? undefined : e.target.value === 'true');
            setPage(0);
          }}
          className="min-w-40"
        >
          <option value="">Construction (all)</option>
          <option value="true">Under construction</option>
          <option value="false">Not under construction</option>
        </NativeSelect>

        {/* Last appraised from */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-(--palette-gray-500) shrink-0">From</span>
          <input
            type="date"
            value={lastAppraisedFrom}
            onChange={e => {
              setLastAppraisedFrom(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 text-sm border border-(--palette-line) rounded-lg outline-none bg-(--palette-surface) hover:border-(--palette-line-strong)"
          />
        </div>

        {/* Last appraised to */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-(--palette-gray-500) shrink-0">To</span>
          <input
            type="date"
            value={lastAppraisedTo}
            onChange={e => {
              setLastAppraisedTo(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 text-sm border border-(--palette-line) rounded-lg outline-none bg-(--palette-surface) hover:border-(--palette-line-strong)"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="xs" onClick={handleClearFilters}>
            <Icon style="solid" name="xmark" className="size-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-(--palette-surface) rounded-lg border border-(--palette-line) overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-(--palette-surface-2) sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-(--palette-line)">
                <th className="text-xs text-left font-semibold text-(--palette-gray-600) px-4 py-2.5">
                  Type
                </th>
                <th className="text-xs text-left font-semibold text-(--palette-ink-2) px-4 py-2.5">
                  Identity
                </th>
                <th className="text-xs text-left font-semibold text-(--palette-gray-600) px-4 py-2.5">
                  Owner
                </th>
                <th className="text-xs text-left font-semibold text-(--palette-ink-2) px-4 py-2.5">
                  Province
                </th>
                <th className="text-xs text-center font-semibold text-(--palette-gray-600) px-4 py-2.5">
                  Engagements
                </th>
                <th className="text-xs text-left font-semibold text-(--palette-gray-600) px-4 py-2.5">
                  Last Appraised
                </th>
                <th className="text-xs text-right font-semibold text-(--palette-gray-600) px-4 py-2.5">
                  Last Value
                </th>
                <th className="text-xs text-center font-semibold text-(--palette-gray-600) px-4 py-2.5">
                  Status
                </th>
              </tr>
            </thead>
            <tbody
              className={clsx(
                'divide-y divide-(--palette-line-soft)',
                isRefetching && 'opacity-50 pointer-events-none',
              )}
            >
              {isFirstLoad ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-20' },
                    { width: 'w-40' },
                    { width: 'w-32' },
                    { width: 'w-24' },
                    { width: 'w-12' },
                    { width: 'w-28' },
                    { width: 'w-24' },
                    { width: 'w-16' },
                  ]}
                  rows={8}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon
                        style="regular"
                        name="folder-open"
                        className="size-10 text-(--palette-gray-300)"
                      />
                      <p className="text-(--palette-gray-500) font-medium">
                        No collateral masters found
                      </p>
                      <p className="text-xs text-(--palette-gray-400)">
                        {hasFilters
                          ? 'Try different filters'
                          : 'Run backfill to import existing appraisals'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/admin/collateral-masters/${item.id}`)}
                    className={clsx(
                      'hover:bg-(--palette-surface-2) transition-colors cursor-pointer even:bg-(--palette-surface-2)/40',
                      item.isDeleted && 'opacity-50',
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon
                            style="solid"
                            name={TYPE_ICON[item.collateralType]}
                            className="size-3.5 text-(--palette-primary-text)"
                          />
                        </div>
                        <span className="font-medium text-(--palette-ink) text-xs">
                          {typeLabel(item.collateralType)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-(--palette-ink) max-w-[220px] truncate">
                      {item.land_TitleNumber ?? item.condo_CondoName ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-(--palette-gray-600) text-xs max-w-[140px] truncate">
                      {item.ownerName ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-(--palette-gray-600) text-xs">
                      {provinceName(item.land_Province ?? item.condo_Province) || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-(--palette-ink)">
                      {item.engagementCount}
                    </td>
                    <td className="px-4 py-2.5 text-(--palette-gray-600) text-xs whitespace-nowrap">
                      {formatLocaleDate(item.lastAppraisedDate, i18n.language)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-(--palette-ink) text-xs">
                      {item.lastAppraisedValue != null
                        ? formatCurrency(item.lastAppraisedValue)
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {item.isDeleted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-(--palette-req-wash) text-(--palette-danger) ring-1 ring-(--palette-req-line)">
                          <Icon name="trash" style="solid" className="size-2.5" />
                          Deleted
                        </span>
                      ) : item.isUnderConstructionAtLastAppraisal ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-(--palette-warn-wash) text-amber-600 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-500/30">
                          <Icon name="hard-hat" style="solid" className="size-2.5" />
                          Construction
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-500/30">
                          <Icon name="check" style="solid" className="size-2.5" />
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {isRefetching && (
            <div className="flex justify-center py-2">
              <Icon
                style="solid"
                name="spinner"
                className="size-4 text-(--palette-primary-text) animate-spin"
              />
            </div>
          )}
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={size => {
            setPageSize(size);
            setPage(0);
          }}
        />
      </div>
    </div>
  );
}
