import clsx from 'clsx';
import type { GridColumn, GridGroup } from './types';

export function DataGrid<Row, Ctx>({
  rows,
  columns,
  ctx,
  groups = [],
  hasHeader = true,
  hasFooter = false,
  hasBody = true,
}: {
  rows: Row[];
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
    <div className="w-full h-full overflow-auto">
      <table className="table-fixed min-w-full border-separate border-spacing-0">
        {hasHeader && (
          <thead>
            {!!groups.length && (
              <tr>
                {columns.map(col => {
                  const groupId = colToGroup.get(col.id);
                  if (!groupId) {
                    return (
                      <th
                        key={col.id}
                        rowSpan={2}
                        className={clsx(
                          'sticky top-0 z-30 bg-neutral-400 text-white text-sm',
                          col.className,
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
                      className={clsx(
                        'sticky top-0 z-30 bg-neutral-400 text-white text-sm',
                        group.className,
                      )}
                    >
                      {group.label}
                    </th>
                  );
                })}
              </tr>
            )}

            <tr>
              {columns.map(col => {
                if (!groups.length || !colToGroup.get(col.id)) {
                  if (!groups.length) {
                    return (
                      <th
                        key={col.id}
                        className={clsx(
                          'sticky top-0 z-30 bg-neutral-400 text-white text-sm',
                          col.className,
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
                      'sticky top-0 z-20 bg-neutral-400 text-white text-sm',
                      col.className,
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
          <tbody>
            {!isEmpty ? (
              rows.map((row, rowIndex) => (
                <tr key={(row as any).__id ?? rowIndex}>
                  {columns.map(col => (
                    <td
                      key={col.id}
                      className={clsx(
                        'p-2 border-b border-neutral-300 whitespace-nowrap truncate text-xs',
                        col.className,
                      )}
                    >
                      {col.renderCell({ row, rowIndex, ctx })}
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
                <td key={col.id} className="sticky bottom-0 z-30 bg-white">
                  {col.renderFooter?.({ rows, ctx }) ?? null}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
