import clsx from 'clsx';
import { alignClass, type RowDef } from './types';
import { Icon } from '@/shared/components';

interface VerticalDataTableTableProps {
  columns: Record<string, any>[];
  rows: RowDef[];
  ctx: any;
  hasBody?: boolean;

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
    <div className="w-full max-h-full flex flex-col rounded-lg overflow-clip">
      <div className="w-full h-full overflow-auto">
        <table className="table-fixed w-full h-full border-separate border-spacing-0">
          <tbody className="divide-y divide-neutral-300">
            {!isEmpty ? (
              rows.map((row, rowIndex) => (
                <tr key={(row as any).__rowId ?? rowIndex}>
                  {/* row header */}
                  <th
                    key={row.id ?? rowIndex}
                    className="text-white text-sm font-medium py-3 px-4 truncate sticky left-0 z-20 bg-neutral-400"
                  >
                    {row.header ?? ''}
                  </th>

                  {/* row body */}
                  {columns.map((column, columnIndex) => {
                    const value = row.accessor
                      ? row.accessor(column, columnIndex, ctx)
                      : (column as any)?.[row.id];
                    return (
                      <td
                        key={column.id}
                        className={clsx(
                          'py-3 px-4 border-b border-neutral-300 whitespace-nowrap truncate',
                          alignClass(row.align),
                          row.className,
                        )}
                      >
                        {canEdit
                          ? row.renderCell
                            ? row.renderCell({
                                fieldName: `${columnIndex}.${row.name}`,
                                column,
                                columns,
                                columnIndex,
                                value,
                                ctx,
                              })
                            : (value ?? '')
                          : (value ?? '')}
                      </td>
                    );
                  })}

                  {hasAddButton && (
                    <td className="border-b border-neutral-3">
                      <div className="w-full flex flex-row gap-2 justify-center items-center">
                        {canEdit ? (
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
                        )}
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
        </table>
      </div>
    </div>
  );
};
