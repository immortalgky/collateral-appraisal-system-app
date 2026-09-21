import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import Dropdown from './inputs/Dropdown';

export interface PaginationProps {
  /** Current page index (0-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalCount: number;
  /** Items per page */
  pageSize: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Show page size selector */
  showPageSizeSelector?: boolean;
  /** Show item count info */
  showItemCount?: boolean;
}

function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showItemCount = true,
}: PaginationProps) {
  const { t } = useTranslation('common');
  const safeTotal = totalPages || 1;

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];

    if (safeTotal <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 0; i < safeTotal; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(0);

      if (currentPage > 2) {
        pages.push('ellipsis');
      }

      // Show pages around current
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(safeTotal - 2, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < safeTotal - 3) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (!pages.includes(safeTotal - 1)) pages.push(safeTotal - 1);
    }

    return pages;
  };

  const startItem = totalCount > 0 ? currentPage * pageSize + 1 : 0;
  const endItem = Math.min((currentPage + 1) * pageSize, totalCount);

  return (
    <div className="shrink-0 border-t border-gray-200 px-4 py-2 flex items-center justify-between bg-gray-50 text-sm">
      {/* Left side: Item count and page size */}
      <div className="flex items-center gap-3 text-gray-600">
        {showItemCount && (
          <span>
            {totalCount > 0
              ? t('pagination.itemRange', { start: startItem, end: endItem, total: totalCount })
              : t('pagination.noResults')}
          </span>
        )}
        {showPageSizeSelector && onPageSizeChange && (
          /* The app's own dropdown, not a native <select>: a select renders as an OS menu — grey
             panel, system font, its own tick — which is why this one control looked foreign on
             every list in the product. `compact` keeps the footer bar the height it always was. */
          <div className="w-20">
            <Dropdown
              compact
              showValuePrefix={false}
              aria-label={t('pagination.pageSize')}
              options={pageSizeOptions.map(size => ({
                value: String(size),
                label: String(size),
                id: size,
              }))}
              value={String(pageSize)}
              onChange={v => onPageSizeChange(Number(v))}
            />
          </div>
        )}
      </div>

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-1">
        {/* First page button */}
        <button
          onClick={() => onPageChange(0)}
          disabled={currentPage === 0}
          className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
          title={t('pagination.first')}
        >
          <Icon style="solid" name="angles-left" className="size-3.5" />
        </button>

        {/* Previous button */}
        <button
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
          title={t('pagination.previous')}
        >
          <Icon style="solid" name="chevron-left" className="size-3.5" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page, idx) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors ${
                page === currentPage ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {page + 1}
            </button>
          ),
        )}

        {/* Next button */}
        <button
          onClick={() => onPageChange(Math.min(safeTotal - 1, currentPage + 1))}
          disabled={currentPage >= safeTotal - 1}
          className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
          title={t('pagination.next')}
        >
          <Icon style="solid" name="chevron-right" className="size-3.5" />
        </button>

        {/* Last page button */}
        <button
          onClick={() => onPageChange(safeTotal - 1)}
          disabled={currentPage >= safeTotal - 1}
          className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
          title={t('pagination.last')}
        >
          <Icon style="solid" name="angles-right" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
