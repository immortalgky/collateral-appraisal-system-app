import { Icon } from '@/shared/components';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetSupportingDataDetailList } from '../api';
import type { SupportingDataDetailItem } from '../api/types';
import { SupportingDataTableRow } from './SupportingDataTableRow';

interface SupportingDataTableProps {
  supportingId: string;
  isReadOnly: boolean;
  hasAuthorityToDecision: boolean;
  onSelectSupportingData: (id: string) => void;
  onDeleteSupportingData: (id: string) => void;
  isBatchMode?: boolean;
  selectedDetailIds?: string[];
  onToggleDetailSelection?: (id: string) => void;
  onToggleSelectAll?: (ids: string[]) => void;
}

export function SupportingDataTable({
  supportingId,
  isReadOnly,
  hasAuthorityToDecision,
  onSelectSupportingData,
  onDeleteSupportingData,
  isBatchMode = false,
  selectedDetailIds = [],
  onToggleDetailSelection,
  onToggleSelectAll,
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

  // Select-all applies to current page only
  const pageIds = items.map(item => item.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedDetailIds.includes(id));
  const somePageSelected = pageIds.some(id => selectedDetailIds.includes(id)) && !allPageSelected;

  const handleSelectAll = () => {
    onToggleSelectAll?.(pageIds);
  };

  type ColumnDef = {
    key: string;
    label: string | JSX.Element;
    thClassName?: string;
  };

  const firstCol: ColumnDef = isBatchMode
    ? {
        key: 'checkbox',
        thClassName: 'w-10 px-2',
        label: (
          <input
            type="checkbox"
            checked={allPageSelected}
            ref={el => {
              if (el) el.indeterminate = somePageSelected;
            }}
            onChange={handleSelectAll}
            className="size-4 rounded border-gray-300 accent-red-500 cursor-pointer"
            aria-label="Select all on this page"
          />
        ),
      }
    : { key: 'no', label: t('columns.no'), thClassName: 'w-16' };

  const columns: ColumnDef[] = [
    firstCol,
    { key: 'propertyName', label: t('columns.propertyName') },
    { key: 'collateralType', label: t('columns.type') },
    { key: 'address', label: t('columns.address'), thClassName: 'w-1/3' },
    { key: 'coordinates', label: t('columns.coordinates') },
    { key: 'actions', label: '', thClassName: 'w-12 text-center' },
  ];

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
                const base =
                  'px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50';
                return (
                  <th key={col.key} className={`${base} ${col.thClassName ?? ''}`}>
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <TableRowSkeleton columns={columns.map(() => ({ width: 'w-24' }))} rows={pageSize} />
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
                    hasAuthorityToDecision={hasAuthorityToDecision}
                    onEdit={() => onSelectSupportingData(item.id)}
                    onDelete={() => onDeleteSupportingData(item.id)}
                    isBatchMode={isBatchMode}
                    isSelected={selectedDetailIds.includes(item.id)}
                    onToggleSelect={onToggleDetailSelection}
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
