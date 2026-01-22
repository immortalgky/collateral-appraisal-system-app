import clsx from 'clsx';
import { alignClass, type RowDef } from './types';
import { Icon } from '@/shared/components';

interface VerticalDataTableTableProps {
  columns: Record<string, any>[];
  rows: RowDef[];
  ctx: any;
  hasBody?: boolean;

  editingColumn: number | undefined;
  canEdit?: boolean;
  onEdit?: (rowIndex: number) => void;

  canSave?: boolean;
  onSave?: (rowIndex: number) => void;

  onAdd: () => void;
  onDelete: (rowIndex: number) => void;

  hasAddButton?: boolean;
  addButtonLabel?: (isEmpty: boolean) => string;
}
export const VerticalDataTable = ({
  columns, // raw data
  rows, // config row
  ctx,
  hasBody = true,

  editingColumn,
  canEdit = true,
  onEdit,

  canSave,
  onSave,

  onAdd,
  onDelete,

  hasAddButton = true,
  addButtonLabel = isEmpty => (isEmpty ? 'Add first item' : 'New record'),
}: VerticalDataTableTableProps) => {
  const isEmpty: boolean = columns.length === 0;
  return (
    <div className="w-full max-h-full flex flex-col overflow-clip">
      <div className="w-full h-full overflow-auto">
        <table className="table-fixed w-max min-w-full h-full border-separate border-spacing-0">
          <tbody className="divide-y divide-neutral-300">
            {/* Action row use for take action on column*/}
            {/* {hasAddButton && (
              <tr>
                <th className="text-white text-sm font-medium py-3 px-4 truncate sticky left-0 z-20">
                  Action
                </th>
                {!isEmpty &&
                  columns.map((column, columnIndex) => {
                    return (
                      hasAddButton && (
                        <td className="border-b border-neutral-300 bg-neutral-400 w-30">
                          <div className="w-full flex flex-row gap-2 justify-center items-center">
                            {canEdit && columnIndex === editingColumn ? (
                              <button
                                type="button"
                                onClick={() => onSave?.(columnIndex)}
                                className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-colors"
                                title="Save"
                              >
                                <Icon style="solid" name="check" className="size-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onEdit?.(columnIndex)}
                                className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                                title="Edit"
                              >
                                <Icon style="solid" name="pen" className="size-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDelete?.(columnIndex)}
                              className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                              title="Delete"
                            >
                              <Icon style="solid" name="trash" className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      )
                    );
                  })}
              </tr>
            )} */}
            {/* body */}
            {!isEmpty ? (
              rows.map((row, rowIndex) => (
                <tr key={(row as any).__rowId ?? rowIndex}>
                  {/* row header */}
                  <th
                    key={row.id ?? rowIndex}
                    className={clsx(
                      'text-white bg-neutral-400 text-sm sticky left-0 z-30 font-medium truncate w-30',
                      row.columnWidth,
                    )}
                  >
                    {row.header ?? ''}
                  </th>

                  {/* row body */}
                  {columns.map((column, columnIndex) => {
                    const value = row.accessor
                      ? row.accessor(column, columnIndex, ctx)
                      : (column as any)?.[row.name ?? row.id];
                    return (
                      <td
                        key={column.id}
                        className={clsx(
                          'py-3 px-4 border-b border-neutral-300 whitespace-nowrap truncate',
                          alignClass(row.align),
                          row.className,
                        )}
                      >
                        {row.renderCell ? (
                          row.renderCell({
                            fieldName: `${columnIndex}.${row.name}`,
                            column,
                            columns,
                            columnIndex,
                            value,
                            ctx,
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
        </table>
      </div>
    </div>
  );
};
