import clsx from 'clsx';

// Base Skeleton component
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = ({
  className,
  variant = 'text',
  width,
  height,
}: SkeletonProps) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  return (
    <div
      className={clsx(
        'bg-gray-200 animate-pulse',
        variantClasses[variant],
        className,
      )}
      style={{ width, height }}
    />
  );
};

// Table Row Skeleton
interface TableRowSkeletonProps {
  columns: { width: string }[];
  rows?: number;
}

export const TableRowSkeleton = ({ columns, rows = 5 }: TableRowSkeletonProps) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {columns.map((col, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className={clsx('h-4 bg-gray-100 rounded', col.width)} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

// Detail Page Skeleton
interface DetailPageSkeletonProps {
  showSidebar?: boolean;
  sidebarWidth?: string;
  contentSections?: number;
}

export const DetailPageSkeleton = ({
  showSidebar = true,
  sidebarWidth = 'w-72',
  contentSections = 2,
}: DetailPageSkeletonProps) => {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header skeleton */}
      <div className="shrink-0 pb-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 mb-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-gray-200" />
              <div className="h-5 w-px bg-gray-200" />
              <div className="size-8 rounded-lg bg-gray-200" />
              <div className="h-5 bg-gray-200 rounded w-32" />
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-16" />
          </div>
        </div>
        {/* Nav tabs skeleton */}
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 min-h-0 flex gap-4">
        <div className="flex-1 space-y-4">
          {Array.from({ length: contentSections }).map((_, i) => (
            <div
              key={i}
              className={clsx(
                'bg-gray-200 rounded-xl animate-pulse',
                i === 0 ? 'h-64' : 'h-48',
              )}
            />
          ))}
        </div>
        {showSidebar && (
          <div className={clsx(sidebarWidth, 'bg-gray-200 rounded-xl animate-pulse')} />
        )}
      </div>
    </div>
  );
};

// List Page Skeleton (header + filters + table)
interface ListPageSkeletonProps {
  columns: { width: string }[];
  rows?: number;
  showFilters?: boolean;
}

export const ListPageSkeleton = ({
  columns,
  rows = 5,
  showFilters = true,
}: ListPageSkeletonProps) => {
  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header skeleton */}
      <div className="shrink-0 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-6 bg-gray-200 rounded w-24" />
          <div className="h-5 bg-gray-200 rounded-full w-10" />
        </div>
        <div className="h-9 bg-gray-200 rounded-lg w-32" />
      </div>

      {/* Filters skeleton */}
      {showFilters && (
        <div className="shrink-0 flex items-center gap-3 pb-1 animate-pulse">
          <div className="h-9 bg-gray-200 rounded-lg w-48" />
          <div className="h-9 bg-gray-200 rounded-lg w-28" />
          <div className="h-9 bg-gray-200 rounded-lg w-28" />
        </div>
      )}

      {/* Table skeleton */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200 animate-pulse">
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-2.5">
                  <div className={clsx('h-4 bg-gray-200 rounded', col.width)} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <TableRowSkeleton columns={columns} rows={rows} />
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Card Skeleton
interface CardSkeletonProps {
  className?: string;
  showImage?: boolean;
  lines?: number;
}

export const CardSkeleton = ({
  className,
  showImage = false,
  lines = 3,
}: CardSkeletonProps) => {
  return (
    <div className={clsx('bg-white rounded-xl border border-gray-200 p-4 animate-pulse', className)}>
      {showImage && (
        <div className="h-32 bg-gray-200 rounded-lg mb-4" />
      )}
      <div className="space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded w-full" />
        ))}
      </div>
    </div>
  );
};

export default Skeleton;
