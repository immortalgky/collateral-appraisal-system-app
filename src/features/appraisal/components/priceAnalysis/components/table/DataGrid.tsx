import clsx from 'clsx';
import type { GridColumn, GridGroup, GridRow } from './types';

export function DataGrid<Row, Ctx>({
  rows,
  columns,
  ctx,
  groups = [],
  hasHeader = true,
  hasFooter = false,
  hasBody = true,
}: {
  rows: GridRow<Row>[];
  columns: GridColumn<Row, Ctx>[];
  ctx: Ctx;
  groups?: GridGroup[];
  hasHeader?: boolean;
  hasFooter?: boolean;
  hasBody?: boolean;
}) {
  const isEmpty = rows.length === 0;

  // group helpers
  const groupById = new Map(groups.map(g => [g.id, g]));
  const colToGroup = new Map<string, string>();
  for (const g of groups) for (const colId of g.columnIds) colToGroup.set(colId, g.id);

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="table table-sm min-w-max border-separate border-spacing-0">
          {hasHeader && (
            <thead className="sticky top-0 z-20 bg-neutral-50">
              {!!groups.length && (
                <tr className="border-b border-gray-300">
                  {columns.map(col => {
                    const groupId = colToGroup.get(col.id);
                    if (!groupId) {
                      return (
                        <th
                          key={col.id}
                          rowSpan={2}
                          className={clsx(
                            'font-medium text-gray-600 px-3 py-2.5',
                            col.style?.headerClassName ?? '',
                          )}
                        >
                          {col.header}
                        </th>
                      );
                    }

                    // render group header only once per group
                    const group = groupById.get(groupId)!;
                    const isFirst = group.columnIds[0] === col.id;
                    if (!isFirst) return null;

                    return (
                      <th
                        key={group.id}
                        colSpan={group.columnIds.length}
                        className={clsx('font-medium text-gray-600 px-3 py-2.5', group.className)}
                      >
                        {group.label}
                      </th>
                    );
                  })}
                </tr>
              )}

              <tr className="border-b border-gray-300">
                {columns.map(col => {
                  if (!groups.length || !colToGroup.get(col.id)) {
                    if (!groups.length) {
                      return (
                        <th
                          key={col.id}
                          className={clsx(
                            'font-medium text-gray-600 px-3 py-2.5',
                            col.style?.headerClassName ?? '',
                          )}
                        >
                          {col.header}
                        </th>
                      );
                    }
                    return null;
                  }

                  return (
                    <th
                      key={col.id}
                      className={clsx(
                        'font-medium text-gray-600 px-3 py-2.5',
                        col.style?.headerClassName ?? '',
                      )}
                    >
                      {col.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
          )}

          {hasBody && (
            <tbody className="divide-y divide-gray-100">
              {!isEmpty ? (
                rows.map((row, rowIndex) => (
                  <tr key={row.id} className="border-b border-gray-300">
                    {columns.map(col => (
                      <td
                        key={col.id}
                        className={clsx(
                          ' whitespace-nowrap truncate text-sm border-b border-gray-300',
                          col.style?.bodyClassName ?? '',
                        )}
                      >
                        {col.renderCell({
                          row,
                          rowIndex,
                          ctx,
                        })}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr />
              )}
            </tbody>
          )}

          {hasFooter && !isEmpty && (
            <tfoot>
              <tr className="border-t border-neutral-300">
                {columns.map(col => (
                  <td
                    key={col.id}
                    className={clsx('sticky bottom-0 bg-white', col.style?.footerClassName ?? '')}
                  >
                    {col.renderFooter?.({ rows, ctx }) ?? null}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
