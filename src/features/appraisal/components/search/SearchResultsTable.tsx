import { useLocation, useNavigate } from 'react-router-dom';
import type { SearchResultItem } from '@shared/types/search';
import type { ColumnDef } from './tabConfigs';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import { TableRowSkeleton } from '@/shared/components/Skeleton';

interface SearchResultsTableProps {
  columns: ColumnDef[];
  items: SearchResultItem[];
  isLoading: boolean;
  onAppraisalClick?: (appraisalId: string) => void;
}

function SearchResultsTable({ columns, items, isLoading, onAppraisalClick }: SearchResultsTableProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const getCellValue = (item: SearchResultItem, col: ColumnDef): string => {
    if (col.metadataKey) {
      return item.metadata?.[col.metadataKey] ?? '-';
    }
    switch (col.key) {
      case 'title':
        return item.title;
      case 'subtitle':
        return item.subtitle || '-';
      case 'status':
        return item.status || '-';
      default:
        return '-';
    }
  };

  const handleRowClick = (item: SearchResultItem) => {
    if (item.category === 'requests' && onAppraisalClick) {
      onAppraisalClick(item.id);
      return;
    }
    const returnPath = location.pathname + location.search;
    const destination =
      item.category === 'requests'
        ? `${item.navigateTo.replace(/\/+$/, '')}/activity-tracking`
        : item.navigateTo;
    navigate(destination, { state: { fromSearch: true, returnPath } });
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="table table-sm min-w-max w-full">
        <thead className="sticky top-0 z-20 bg-gray-50">
          <tr className="border-b border-gray-200">
            <th className="text-left font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap w-12">
              #
            </th>
            {columns.map(col => (
              <th
                key={col.key}
                className="text-left font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <TableRowSkeleton
              columns={[
                { width: 'w-8' },
                ...columns.map(() => ({ width: 'w-32' })),
              ]}
              rows={5}
            />
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="text-center py-16">
                <div className="flex flex-col items-center gap-2">
                  <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                  <p className="text-gray-500 font-medium">No results found</p>
                  <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr
                key={item.id}
                onClick={() => handleRowClick(item)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2.5 text-gray-400 text-sm">{index + 1}</td>
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2.5 text-gray-600">
                    {col.key === 'status' ? (
                      <Badge type="status" value={item.status || ''} size="sm" />
                    ) : col.key === 'title' ? (
                      <span className="font-medium text-primary">{item.title}</span>
                    ) : (
                      getCellValue(item, col)
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default SearchResultsTable;
