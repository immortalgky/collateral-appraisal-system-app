import clsx from 'clsx';
import type { Align, ColumnDef, ColumnGroup } from './types';

const alignClass = (align?: Align) => {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
};

interface renderHeaderProps {
  columns: ColumnDef[];
  colToGroup: Map<string, string>;
  groups: ColumnGroup[];
}
const renderHeader = ({ columns, colToGroup, groups }: renderHeaderProps) => {
  const hasGroup = groups.length;
  const groupById = new Map(groups.map(group => [group.id, group] as const));
  const renderedGroup = new Set<string>();
  return (
    <thead>
      <tr>
        {columns.map((col, index) => {
          const groupId = colToGroup.get(col.id);

          if (!hasGroup || !groupId)
            return (
              <th key={index} className="" rowSpan={hasGroup ? 2 : 1}>
                {columns.map(col => {
                  return <thead key={col.id}>{}</thead>;
                })}
              </th>
            );
          if (renderedGroup.has(groupId)) return null;
          renderedGroup.add(groupId);
          const groupHeader = groupById.get(groupId)!;
          return (
            <th
              key={groupHeader.id}
              className={clsx(
                'text-white text-sm font-medium py-3 px-4 truncate sticky top-0 z-20 bg-primary',
                groupHeader.className,
                alignClass(groupHeader.align),
              )}
              colSpan={groupHeader.columns.length}
            >
              {groupHeader.label}
            </th>
          );
        })}
      </tr>
      {hasGroup && (
        <tr>
          {columns.map((col, index) => {
            const groupId = colToGroup.get(col.id);

            if (!groupId) return null;
            return (
              <th
                key={col.id}
                className={clsx(
                  'text-white text-sm font-medium py-3 px-4 text-left truncate bg-primary sticky top-0 z-20',
                  col.className,
                  alignClass(col.align),
                )}
              >
                {col.header}
              </th>
            );
          })}
        </tr>
      )}
    </thead>
  );
};

const renderBody = () => {};
const renderFooter = () => {};

interface DataTableProps {
  rows: Record<string, string | boolean | number>;
  columns: ColumnDef[];
  groups: ColumnGroup[];
  hasHeader: boolean;
  hasBody: boolean;
  hasFooter: boolean;
}

export const DataTable = ({
  rows,
  columns,
  groups,
  hasHeader,
  hasBody,
  hasFooter,
}: DataTableProps) => {
  const colToGroup = new Map<string, string>();
  for (const group of groups)
    for (const columnId of group.columns) colToGroup.set(columnId, group.id);

  return (
    <div className="w-full max-h-full flex flex-col rounded-lg border border-neutral-3 overflow-clip">
      <div className="w-full h-full overflow-auto">
        <table className="table-fixed w-full h-full border-separate border-spacing-0">
          {hasHeader && renderHeader({ columns, colToGroup, groups })}
        </table>
      </div>
    </div>
  );
};
