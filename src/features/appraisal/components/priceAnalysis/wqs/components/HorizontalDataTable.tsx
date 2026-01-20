import clsx from 'clsx';
import { type Align, alignClass, type ColumnDef, type ColumnGroup } from './types';
import { Icon } from '@/shared/components';
import { string } from 'zod';

interface renderHeaderProps {
  columns: ColumnDef[];
  colToGroup: Map<string, string>;
  groups: ColumnGroup[];
  hasAddButton: boolean;
}
const renderHeader = ({ columns, colToGroup, groups, hasAddButton }: renderHeaderProps) => {
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
                  'text-white bg-neutral-400 text-sm font-medium py-3 px-4 truncate sticky top-0 z-20',
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
                'text-white bg-neutral-400 text-sm font-medium py-3 px-4 truncate sticky top-0 z-20 ',
                groupHeader.className,
                alignClass(groupHeader.align),
              )}
              colSpan={groupHeader.columns.length}
            >
              {groupHeader.label}
            </th>
          );
        })}
        {hasAddButton && (
          <th
            className={clsx(
              'text-white bg-neutral-400 text-sm font-medium py-3 px-4 truncate sticky top-0 right-0 z-20 w-24',
            )}
            rowSpan={hasGroup ? 2 : 1}
          >
            Action
          </th>
        )}
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
                  'text-white text-sm font-medium py-3 px-4 text-left truncate bg-neutral-400 sticky top-0 z-20',
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
  canEdit?: boolean;
  onEdit?: (rowIndex: number) => void;

  canSave?: boolean;
  onSave?: (rowIndex: number) => void;

  onAdd: () => void;
  onDelete: (rowIndex: number) => void;

  hasAddButton?: boolean;
  addButtonLabel?: (isEmpty: boolean) => string;
}
const renderBody = ({
  columns,
  rows,
  ctx,
  isEmpty,

  editingRow,
  canEdit = true,
  onEdit,

  canSave,
  onSave,

  onAdd,
  onDelete,

  hasAddButton = true,
  addButtonLabel = isEmpty => (isEmpty ? 'Add first item' : 'New record'),
}: renderBodyProps) => {
  return (
    <tbody className="divide-y divide-neutral-3">
      {!isEmpty ? (
        rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column, columnIndex) => {
              const value = column.accessor
                ? column.accessor(row, rowIndex, ctx)
                : (row as any)?.[column.id];
              return (
                <td
                  key={column.id}
                  className={clsx(
                    'py-3 px-4 border-b border-neutral-300 whitespace-nowrap truncate',
                    alignClass(column.align),
                    column.className,
                  )}
                >
                  {hasAddButton ? (
                    canEdit && editingRow === rowIndex ? (
                      column.renderCell ? (
                        column.renderCell({
                          fieldName: `${rowIndex}.${column.name}`,
                          row,
                          rowIndex,
                          value,
                          ctx,
                        })
                      ) : (
                        <span>{value ?? ''}</span>
                      )
                    ) : column.renderOnEditingCell ? (
                      column.renderOnEditingCell({
                        fieldName: `${rowIndex}.${column.name}`,
                        row,
                        rowIndex,
                        value,
                        ctx,
                      })
                    ) : (
                      <span>{value ?? ''}</span>
                    )
                  ) : column.renderCell ? (
                    column.renderCell({
                      fieldName: `${rowIndex}.${column.name}`,
                      row,
                      rowIndex,
                      value,
                      ctx,
                    })
                  ) : (
                    <span>{value ?? ''}</span>
                  )}
                </td>
              );
            })}
            {hasAddButton && (
              <td className="border-b border-neutral-300 w-30">
                <div className="w-full flex flex-row gap-2 justify-center items-center">
                  {canEdit ? (
                    editingRow === rowIndex ? (
                      <button
                        type="button"
                        onClick={() => onSave?.(rowIndex)}
                        className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-colors"
                        title="Save"
                      >
                        <Icon style="solid" name="check" className="size-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEdit?.(rowIndex)}
                        className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                        title="Edit"
                      >
                        <Icon style="solid" name="pen" className="size-3.5" />
                      </button>
                    )
                  ) : canSave ? (
                    <button
                      type="button"
                      onClick={() => onSave?.(rowIndex)}
                      className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-colors"
                      title="Save"
                    >
                      <Icon style="solid" name="check" className="size-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onDelete?.(rowIndex)}
                    className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                    title="Delete"
                  >
                    <Icon style="solid" name="trash" className="size-3.5" />
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={columns.length + (hasAddButton ? 1 : 0)}>
            {/* <div className="flex justify-center items-center text-sm font-medium h-14">
              <span>No Data</span>
            </div> */}
          </td>
        </tr>
      )}
      {hasAddButton ? (
        <tr>
          <th
            className="text-white text-sm font-medium py-2 px-2 truncate"
            colSpan={columns.length + (hasAddButton ? 1 : 0)}
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
  canEdit?: boolean;
  onEdit?: (rowIndex: number) => void;

  canSave?: boolean;
  onSave?: (rowIndex: number) => void;

  onAdd: () => void;
  onDelete: (rowIndex: number) => void;
  addButtonLabel?: (isEmpty: boolean) => string;
  hasAddButton: boolean;
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
  canEdit,
  onEdit,

  canSave,
  onSave,

  onAdd,
  onDelete,
  addButtonLabel = isEmpty => (isEmpty ? 'Add first item' : 'New record'),
  hasAddButton,
}: HorizontalDataTableProps) => {
  const isEmpty = rows.length === 0;
  const colToGroup = new Map<string, string>();
  for (const group of groups)
    for (const columnId of group.columns) colToGroup.set(columnId, group.id);

  return (
    <div className="w-full max-h-full flex flex-col rounded-lg overflow-clip">
      <div className="w-full h-full overflow-auto">
        <table className="table-fixed w-full h-full border-separate border-spacing-0">
          {hasHeader && renderHeader({ columns, colToGroup, groups, hasAddButton })}
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
              onAdd,
              onDelete,
              hasBody,
              hasAddButton,
              addButtonLabel,
            })}
          {hasFooter && renderFooter({ columns, rows, ctx })}
        </table>
      </div>
    </div>
  );
};
