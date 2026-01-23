import clsx from 'clsx';
import { type Align, alignClass, type ColumnDef, type ColumnGroup } from './types';
import { Icon } from '@/shared/components';
import { string } from 'zod';

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
        {columns.map(column => {
          const groupId = colToGroup.get(column.id);
          if (!hasGroup || !groupId)
            return (
              <th
                key={column.id}
                className={clsx(
                  'text-white bg-neutral-400 text-sm sticky top-0 z-30 font-medium truncate',
                  column.className,
                )}
                rowSpan={hasGroup ? 2 : 1}
              >
                {column.header}
              </th>
            );
          if (renderedGroup.has(groupId)) return null;
          renderedGroup.add(groupId);
          const groupHeader = groupById.get(groupId)!;
          return (
            <th
              key={groupHeader.id}
              className={clsx(
                'sticky top-0 z-30 bg-neutral-400 text-white text-sm font-medium truncate',
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
          {columns.map(column => {
            const groupId = colToGroup.get(column.id);
            if (!groupId) return null;
            return (
              <th
                key={column.id}
                className={clsx(
                  'sticky top-0 z-20 bg-neutral-400 text-white text-sm font-medium truncate',
                  column.className,
                  alignClass(column.align),
                )}
              >
                {column.header}
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

  editingRow: number | undefined;
  hasEditButton?: boolean;
  canEdit?: boolean;
  onEdit?: (rowIndex: number) => void;

  hasSaveButton?: boolean;
  canSave?: boolean;
  onSave: (rowIndex: number) => void;

  hasAddButton?: boolean;
  onAdd: () => void;
  onRemove: (rowIndex: number) => void;

  addButtonLabel?: (isEmpty: boolean) => string;
}
const renderBody = ({
  columns,
  rows,
  ctx,
  isEmpty,

  editingRow,

  hasEditButton = true,
  canEdit = true,
  onEdit,

  hasSaveButton = true,
  canSave,
  onSave,

  onRemove,

  hasAddButton = true,
  onAdd,
  onDelete,

  addButtonLabel = isEmpty => (isEmpty ? 'Add first item' : 'New record'),
}: renderBodyProps) => {
  return (
    <tbody>
      {!isEmpty ? (
        rows.map((row, rowIndex) => (
          <tr key={row.__id ?? row.id}>
            {columns.map((column, columnIndex) => {
              const value = column.accessor
                ? column.accessor({ row, rowIndex, columnIndex, ctx })
                : (row as any)?.[column.name ?? column.id];
              return (
                <td
                  key={column.id}
                  className={clsx(
                    'px-2 py-3 border-b border-neutral-300 whitespace-nowrap truncate text-xs',
                    alignClass(column.align),
                    column.className,
                  )}
                >
                  {column.renderCell ? (
                    column.renderCell({
                      fieldName: `${rowIndex}.${column.name}`,
                      row,
                      rowIndex,
                      value,
                      ctx,
                      onSave,
                      onRemove,
                      onAdd,
                      // setValue
                      // getValue
                    })
                  ) : (
                    <span>{value ?? ''}</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))
      ) : (
        <tr></tr>
      )}
      {hasAddButton ? (
        <tr>
          <th
            className="text-white text-sm font-medium py-2 px-2 truncate sticky bottom-0 z-20"
            // colSpan={columns.length + (hasAddButton ? 1 : 0)}
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
        <tr className="border-t-1 border-neutral-300">
          {columns.map(column => (
            <td
              key={column.id}
              className={clsx('sticky bottom-0 z-30 bg-white', alignClass(column.align))}
            >
              {column.renderFooter
                ? column.renderFooter({ rows, ctx, columnIndex: column.id })
                : ''}
            </td>
          ))}
        </tr>
      ) : null}
    </tfoot>
  );
};

interface HorizontalDataTableProps {
  rows: Record<string, any>[];
  columns: ColumnDef[];
  groups: ColumnGroup[];
  ctx: any;
  // dataAlignment: 'row' | 'column';

  hasHeader: boolean;
  hasBody: boolean;
  hasFooter: boolean;

  editingRow: number | undefined;

  hasEditButton?: boolean;
  canEdit?: boolean;
  onEdit?: (rowIndex: number) => void;

  hasSaveButton?: boolean;
  canSave?: boolean;
  onSave?: (rowIndex: number) => void;

  hasAddButton?: boolean;
  onAdd: () => void;
  onRemove: (rowIndex: number) => void;
  addButtonLabel?: (isEmpty: boolean) => string;
}

export const HorizontalDataTable = ({
  rows,
  columns,
  groups,
  ctx,
  hasHeader,
  hasBody,
  hasFooter,

  editingRow,

  hasEditButton,
  canEdit,
  onEdit,

  hasSaveButton,
  canSave,
  onSave,

  hasAddButton,
  onAdd,
  onRemove,
  addButtonLabel = isEmpty => (isEmpty ? 'Add first item' : 'New record'),
}: HorizontalDataTableProps) => {
  const isEmpty = rows.length === 0;
  const colToGroup = new Map<string, string>();
  for (const group of groups)
    for (const columnId of group.columns) colToGroup.set(columnId, group.id);

  return (
    <div className="w-full max-h-full flex flex-col">
      <div className="w-full h-full overflow-auto">
        <table className="table-fixed min-w-full h-full border-separate border-spacing-0">
          {hasHeader && renderHeader({ columns, colToGroup, groups })}
          {hasBody &&
            renderBody({
              columns,
              rows,
              ctx,
              isEmpty,

              editingRow,

              canEdit,
              onEdit,

              canSave,
              onSave,

              hasAddButton,
              onAdd,
              onRemove,
              addButtonLabel,

              hasBody,
            })}
          {hasFooter && renderFooter({ columns, rows, ctx })}
        </table>
      </div>
    </div>
  );
};
