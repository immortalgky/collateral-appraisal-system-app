import { buildFieldPath } from './buildFieldPath';
import type {
  RHFHorizontalColumn,
  RHFVerticalRowDef,
} from '@features/appraisal/components/priceAnalysis/adapters/rhf-table/spec.ts';
import type {
  GridColumn,
  GridRow,
} from '@features/appraisal/components/priceAnalysis/components/table/types.ts';
import { RHFInputCell } from '@/features/appraisal/components/priceAnalysis/components/table/RHFInputCell';
import clsx from 'clsx';

// === HORIZONTAL GRID BUILDER ===

interface buildHorizontalGridProps<Row extends Record<string, any>, Ctx> {
  arrayName: string;
  items: { id: string; value: Row }[];
  columns: RHFHorizontalColumn<Row, Ctx>[];
  ctx: Ctx;

  handleOnAdd?: () => void;
  onAdd?: () => void;

  handleOnRemove?: (index: number) => void;
  onRemove?: (index: number) => void;
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
    style: {
      headerClassName: col.style?.headerClassName,
      bodyClassName: col.style?.bodyClassName,
      footerClassName: col.style?.footerClassName,
    },
    align: col.align,

    renderCell: ({ row, rowIndex, ctx, actions: { onAdd, onRemove } }) => {
      const rawRow = row.raw;

      const value =
        col.accessor?.({ row: rawRow, rowIndex, ctx }) ??
        (col.field ? rawRow[col.field as any] : rawRow[col.id as any]);

      const field = col.field ?? col.id;
      const fieldPath = buildFieldPath(arrayName, rowIndex, field) ?? '';

      if (col.render) {
        return col.render({
          fieldPath,
          row: rawRow,
          rowIndex,
          ctx,
          value,
          actions: {
            addColumn: onAdd,
            removeColumn: onRemove,
          },
        });
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

// === VERTICAL GRID BUILDER ===

interface buildVerticalGridProps<ColumnItem extends Record<string, any>, Ctx> {
  arrayName: string;
  items: { id: string; value: ColumnItem }[]; // field array items become columns
  rowDefs: RHFVerticalRowDef<ColumnItem, Ctx>[]; // config becomes rows
  ctx: Ctx;

  topHeader?: React.ReactNode[];
  style?: {
    headerClassName?: string;
    bodyClassName?: (colIndex: number) => string;
    footerClassName?: string;
  };
}
export function buildVerticalGrid<ColumnItem extends Record<string, any>, Ctx>({
  arrayName,
  items,
  rowDefs,
  ctx,
  style,
  topHeader = [],
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
    style: {
      headerClassName: style?.headerClassName,
      bodyClassName: 'sticky left-0 z-20 bg-white border-r border-neutral-300 p-2',
    },
    renderCell: ({ row }) => row.raw.header ?? <div className={'truncate'}></div>,
  };

  // items: [ { id: string; value: {...calculation }}, { id: string; value: {...calculation }}]; column data
  const dataCols: GridColumn<RHFVerticalRowDef<ColumnItem, Ctx>, Ctx>[] = items.map(
    (item, columnIndex) => ({
      id: item.id,
      header: topHeader?.[columnIndex] ?? '', // optionally label columnIndex+1 here

      style: {
        headerClassName: style?.headerClassName,
        bodyClassName: style?.bodyClassName?.(columnIndex),
        footerClassName: style?.footerClassName,
      },

      renderCell: ({ row, ctx }) => {
        const rowDef = row.raw;
        const colItem = item.value;

        const value =
          rowDef.accessor?.({ columnItem: colItem, columnIndex, ctx }) ??
          (rowDef.field ? colItem[rowDef.field as any] : colItem[rowDef.id as any]);

        const field = row.id;
        const fieldPath = buildFieldPath(arrayName, columnIndex, field) ?? '';

        if (rowDef.render) {
          return rowDef.render({
            fieldPath,
            columnItem: colItem,
            columnIndex,
            ctx,
            value,
            actions: {},
          });
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
