import { Icon } from '@/shared/components';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetSupportingDataDetailList } from '../api';
import type { SupportingDataDetailItem } from '../api/types';
import { SupportingDataTableRow } from './SupportingDataTableRow';

interface SupportingDataTableProps {
  /** Parent supporting-data request id. Drives the mock detail-list API. */
  supportingId: string;
  isReadOnly: boolean;
  /** Receives the supporting-data detail item id (UUID string). */
  onSelectSupportingData: (id: string) => void;
  /** Receives the supporting-data detail item id (UUID string). */
  onDeleteSupportingData: (id: string) => void;
}

export function SupportingDataTable({
  supportingId,
  isReadOnly,
  onSelectSupportingData,
  onDeleteSupportingData,
}: SupportingDataTableProps) {
  const { t } = useTranslation('supportingDataMaintenance');

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError, error } = useGetSupportingDataDetailList({
    supportingId,
    pageNumber,
    pageSize,
  });

  const items: SupportingDataDetailItem[] = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // ── Column config ──
  type ColumnDef = {
    key: string;
    label: string;
    thClassName?: string;
  };

  const columns: ColumnDef[] = [
    { key: 'no', label: t('columns.no'), thClassName: 'w-16' },
    { key: 'propertyName', label: t('columns.propertyName') },
    { key: 'collateralType', label: t('columns.type') },
    { key: 'address', label: t('columns.address'), thClassName: 'w-1/3' },
    { key: 'coordinates', label: t('columns.coordinates') },
    { key: 'actions', label: '', thClassName: 'w-12 text-center' },
  ];

  const STICKY_COLUMN_KEY = '';

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
          <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800">{t('errors.failedToLoad')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{(error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map(col => {
                const isSticky = col.key === STICKY_COLUMN_KEY;
                const base =
                  'px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50';
                const thClass = isSticky
                  ? `${base} sticky left-0 z-30 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-gray-200`
                  : base;
                return (
                  <th key={col.key} className={`${thClass} ${col.thClassName ?? ''}`}>
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <TableRowSkeleton columns={columns.map(() => ({ width: 'w-24' }))} rows={8} />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16">
                  <div className="flex flex-col items-center gap-4">
                    <div className="size-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <Icon style="regular" name="inbox" className="size-7 text-gray-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">
                        {t('empty.noSupportingData')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {isReadOnly ? t('empty.noItemsAdded') : t('empty.addItemPrompt')}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, localIndex) => {
                const absoluteIndex = pageNumber * pageSize + localIndex;
                return (
                  <SupportingDataTableRow
                    key={item.id ?? absoluteIndex}
                    index={absoluteIndex}
                    data={item}
                    isReadOnly={isReadOnly}
                    onEdit={() => onSelectSupportingData(item.id)}
                    onDelete={() => onDeleteSupportingData(item.id)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
  );
}
