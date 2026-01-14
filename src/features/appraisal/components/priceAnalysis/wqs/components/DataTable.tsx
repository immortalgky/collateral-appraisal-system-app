import clsx from 'clsx';
import type { Align, ColumnDef, ColumnGroup } from './types';
import { isEmpty } from '@/shared/utils/validationUtils';
import { Icon } from '@/shared/components';

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
  const hasGroup = groups.length > 0;
  const groupById = new Map(groups.map(group => [group.id, group] as const));
  const renderedGroup = new Set<string>();
  return (
    <thead>
      <tr>
        {columns.map(col => {
          const groupId = colToGroup.get(col.id);

          if (!hasGroup || !groupId)
            return (
              <th
                key={col.id}
                className="text-white text-sm font-medium py-3 px-4 truncate sticky top-0 z-20 bg-primary"
                rowSpan={hasGroup ? 2 : 1}
              >
                {col.header}
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

interface renderBodyProps {
  columns: ColumnDef[];
  rows: any[];
  ctx: any;
  isEmpty: boolean;
  hasBody: boolean;
  hasAddButton?: boolean;
  onAdd: () => void;
  addButtonLabel?: (isEmpty: boolean) => string;
}
const renderBody = ({
  columns,
  rows,
  ctx,
  isEmpty,
  hasAddButton = true,
  onAdd,
  addButtonLabel = isEmpty => (isEmpty ? 'Add first item' : 'New record'),
}: renderBodyProps) => {
  return (
    <tbody className="divide-y divide-neutral-3">
      {!isEmpty ? (
        rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map(column => {
              const value = column.accessor
                ? column.accessor(row, rowIndex, ctx)
                : (row as any)?.[column.id];
              return (
                <td
                  key={column.id}
                  className={clsx(
                    'py-3 px-4 border-b border-neutral-3 whitespace-nowrap truncate',
                    alignClass(column.align),
                    column.className,
                  )}
                >
                  {column.renderCell
                    ? column.renderCell({ row, rowIndex, value, ctx })
                    : (value ?? '')}
                </td>
              );
            })}
          </tr>
        ))
      ) : (
        <tr>
          <span>Empty</span>
        </tr>
      )}
      {hasAddButton ? (
        <tr>
          <th
            className="text-white text-sm font-medium py-2 px-2 truncate"
            colSpan={columns.length}
          >
            <button
              type="button"
              onClick={() => onAdd?.()}
              className="p-4 items-center justify-center gap-2 py-3 text-sm font-medium bg-white text-primary-600 hover:bg-primary-50 transition-colors rounded-md cursor-pointer"
            >
              <Icon style="solid" name="plus" className="size-3 text-primary-600" />
              {addButtonLabel(isEmpty)}
            </button>
          </th>
        </tr>
      ) : null}
    </tbody>
  );
};
interface renderFooterProps {
  columns: ColumnDef[];
  rows: any[];
  ctx: any[];
}
const renderFooter = ({ columns, rows, ctx }: renderFooterProps) => {
  const isEmpty = rows.length === 0;
  return (
    <tfoot>
      {!isEmpty ? (
        <tr className="border-t-1 border-neutral-3">
          {columns.map(column => (
            <td
              key={column.id}
              className={clsx('py-3 px-4 sticky bottom-0 bg-white', alignClass(column.align))}
            >
              <span className="inline-flex items-center justify-center text-sm font-normal text-gray-400">
                {column.renderFooter
                  ? column.renderFooter({ rows, ctx, columnIndex: column.id })
                  : ''}
              </span>
            </td>
          ))}
        </tr>
      ) : (
        <span>Empty</span>
      )}
    </tfoot>
  );
};

interface DataTableProps {
  rows: Record<string, any>[];
  columns: ColumnDef[];
  groups: ColumnGroup[];
  ctx: any;
  hasHeader: boolean;
  hasBody: boolean;
  hasFooter: boolean;

  onAdd: () => void;
  addButtonLabel?: (isEmpty: boolean) => string;
  hasAddButton: boolean;
}

export const DataTable = ({
  rows,
  columns,
  groups,
  ctx,
  hasHeader,
  hasBody,
  hasFooter,
  onAdd,
  addButtonLabel = isEmpty => (isEmpty ? 'Add first item' : 'New record'),
  hasAddButton,
}: DataTableProps) => {
  const isEmpty = rows.length === 0;
  const colToGroup = new Map<string, string>();
  for (const group of groups)
    for (const columnId of group.columns) colToGroup.set(columnId, group.id);

  return (
    <div className="w-full max-h-full flex flex-col rounded-lg border border-neutral-3 overflow-clip">
      <div className="w-full h-full overflow-auto">
        <table className="table-fixed w-full h-full border-separate border-spacing-0">
          {hasHeader && renderHeader({ columns, colToGroup, groups })}
          {hasBody &&
            renderBody({
              columns,
              rows,
              ctx,
              isEmpty,
              hasBody,
              hasAddButton,
              onAdd,
              addButtonLabel,
            })}
          {hasFooter && renderFooter({ columns, rows, ctx })}
        </table>
      </div>
    </div>
  );
};
