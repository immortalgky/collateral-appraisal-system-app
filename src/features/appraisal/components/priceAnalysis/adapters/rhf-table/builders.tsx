import { buildFieldPath } from './buildFieldPath';
import type {
  RHFHorizontalColumn,
  RHFVerticalRowDef,
} from '@features/appraisal/components/priceAnalysis/adapters/rhf-table/spec.ts';
import type { GridColumn, GridRow } from '@features/appraisal/components/priceAnalysis/components/table/types.ts';
import { RHFInputCell } from '@features/appraisal/components/priceAnalysis/features/wqs/components/RHFInputCell.tsx';

interface buildHorizontalGridProps<Row extends Record<string, any>, Ctx> {
  arrayName: string;
  items: { id: string; value: Row }[];
  columns: RHFHorizontalColumn<Row, Ctx>[];
  ctx: Ctx;
}
export function buildHorizontalGrid<Row extends Record<string, any>, Ctx>({
  arrayName,
  items,
  columns,
  ctx,
}: buildHorizontalGridProps<Row, Ctx>): {
  gridRows: GridRow<Row>[];
  gridCols: GridColumn<Row, Ctx>[];
} {
  const gridRows: GridRow<Row>[] = items.map(x => ({
    id: x.id,
    raw: x.value,
  }));

  const gridCols: GridColumn<Row, Ctx>[] = columns.map(col => ({
    id: col.id,
    header: col.header,
    className: col.className,
    align: col.align,

    renderCell: ({ row, rowIndex, ctx }) => {
      const rawRow = row.raw;

      const value =
        col.accessor?.({ row: rawRow, rowIndex, ctx }) ??
        (col.field ? rawRow[col.field as any] : rawRow[col.id as any]);

      const field = col.field ?? col.id;
      const fieldPath = buildFieldPath(arrayName, rowIndex, field) : '';

      if (col.render) {
        return col.render({ fieldPath, row: rawRow, rowIndex, ctx, value });
      }

      if (col.rhf && col.field) {
        return (
          <RHFInputCell
            fieldName={fieldPath}
            inputType={col.rhf.inputType}
            options={col.rhf.options}
          />
        );
      }

      return <span>{value ?? ''}</span>;
    },

    renderFooter: col.footer
      ? ({ rows, ctx }) => col.footer({ rows: rows.map(r => r.raw), ctx })
      : undefined,
  }));

  return { gridRows, gridCols };
}

interface buildVerticalGridProps<ColumnItem extends Record<string, any>, Ctx> {
  arrayName: string;
  items: { id: string; value: ColumnItem }[]; // field array items become columns
  rowDefs: RHFVerticalRowDef<ColumnItem, Ctx>[]; // config becomes rows
  ctx: Ctx;

  leftHeaderClassName?: string;
  getColClassName?: (colIndex: number) => string;
}
export function buildVerticalGrid<ColumnItem extends Record<string, any>, Ctx>({
  arrayName,
  items,
  rowDefs,
  ctx,
  leftHeaderClassName = 'sticky left-0 z-30 bg-neutral-400 text-white',
  getColClassName,
}: buildVerticalGridProps<ColumnItem, Ctx>): {
  gridRows: GridRow<RHFVerticalRowDef<ColumnItem, Ctx>>[];
  gridCols: GridColumn<RHFVerticalRowDef<ColumnItem, Ctx>, Ctx>[];
} {
  const gridRows: GridRow<RHFVerticalRowDef<ColumnItem, Ctx>>[] = rowDefs.map(def => ({
    id: def.id,
    raw: def,
  }));

  // first column = row header (left sticky)
  const headerCol: GridColumn<RHFVerticalRowDef<ColumnItem, Ctx>, Ctx> = {
    id: '__rowHeader',
    header: '',
    className: leftHeaderClassName,
    renderCell: ({ row }) => <div className="truncate">{row.raw.header ?? ''}</div>,
  };

  const dataCols: GridColumn<RHFVerticalRowDef<ColumnItem, Ctx>, Ctx>[] = items.map(
    (item, columnIndex) => ({
      id: item.id,
      header: '', // optionally label columnIndex+1 here
      className: getColClassName?.(columnIndex) ?? '',

      renderCell: ({ row, ctx }) => {
        const rowDef = row.raw;
        const colItem = item.value;

        const value =
          rowDef.accessor?.({ columnItem: colItem, columnIndex, ctx }) ??
          (rowDef.field ? colItem[rowDef.field as any] : colItem[rowDef.id as any]);

        const field = item.field ?? row.id;
        const fieldPath = buildFieldPath(arrayName, columnIndex, field) ?? '';

        if (rowDef.render) {
          return rowDef.render({ fieldPath, columnItem: colItem, columnIndex, ctx, value });
        }

        if (rowDef.rhf && rowDef.field) {
          return (
            <RHFInputCell
              fieldName={fieldPath}
              inputType={rowDef.rhf.inputType}
              options={rowDef.rhf.options}
            />
          );
        }

        return <span>{value ?? ''}</span>;
      },
    }),
  );

  return { gridRows, gridCols: [headerCol, ...dataCols] };
}
