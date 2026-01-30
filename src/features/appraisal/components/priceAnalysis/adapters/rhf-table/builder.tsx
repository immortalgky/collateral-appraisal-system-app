/**
 * Pivot table
 * normal behavior of our table is data will be pass by row. mean i can pass data like [ row1: {column1, column2, ...} row2: {column1, column2, ...}]. but in case that we would like to render table like [ row1: { }]
 * Procudure:
 * (1) define row
 * (2) define column
 */

import { RHFInputCell } from '../../components/table/RHFInputCell';
import type { GridColumn, GridRow } from '../../components/table/types';
import { buildFieldPath } from './buildFieldPath';
import type { RHFCellBinding } from './spec';

export interface RHFColumnDef<ColumnItem extends Record<string, any>, Ctx> {
  id: string;
  header?: React.ReactNode;
  style?: {
    headerClassName?: string;
    bodyClassName?: string;
    footerClassName?: string;
  };

  align?: 'left' | 'center' | 'right';

  /** field name inside a row object: e.g. "weight" or "surveys.0.surveyScore" */
  field?: string;

  /** optional RHF default renderer */
  rhf?: RHFCellBinding;

  /** optional custom cell */
  render?: (args: {
    fieldPath: string; // e.g. "WQSScores.2.weight"
    row: GridRow<RHFRowDef<ColumnItem, Ctx>>; // { id, value, rowDef }
    rowIndex: number;
    columnIndex: number;
    ctx: Ctx;
    value: any;
    actions: {
      onAppend: any; // TODO: add type
      onRemove: any; // TODO: add type
    };
  }) => React.ReactNode;

  accessor?: (args: { row: Row; rowIndex: number; ctx: Ctx }) => any;

  footer?: (args: { rows: Row[]; ctx: Ctx }) => React.ReactNode;
}

export interface RHFRowDef<ColumnItem extends Record<string, any>, Ctx> {
  id: string;
  header?: (args: {
    fieldPath: string; // e.g. "WQSCalculations.1.offeringPriceAdjustmentPct"
    row: any;
    rowIndex: number;
    columnIndex: number;
    ctx: Ctx;
    value: any;
    actions: {
      onAppend: any; // pending
      onRemove: any; // pending
    };
  }) => React.ReactNode;

  style?: {
    bodyClassName?: string;
  };
  /** field name inside the column item: e.g. "offeringPriceAdjustmentPct" */
  field?: string;

  render?: (args: {
    fieldPath: string; // e.g. "WQSCalculations.1.offeringPriceAdjustmentPct"
    row: any;
    rowIndex: number;
    columnIndex: number;
    ctx: Ctx;
    value: any;
    actions: {
      addColumn: () => void; // pending
      removeColumn: (columnIndex: number) => void; // pending
    };
  }) => React.ReactNode;
}

interface builderProps<ColumnItem extends Record<string, any>, Ctx> {
  arrayName: string;
  items: { id: string; value: ColumnItem }[];
  columnDefs: ColumDef[];
  rowDefs: RowDef[];

  onRemove: any; // don't know exactly type
  onAppend: any; // don't know exactly type
}
export function builder<ColumnItem extends Record<string, any>, Ctx>({
  arrayName,
  items,
  columnDefs,
  rowDefs,

  onRemove,
  onAppend,
}: builderProps<ColumnItem, Ctx>): {
  gridRows: GridRow<RHFRowDef<ColumnItem, Ctx>>[];
  gridCols: GridColumn<RHFColumnDef<ColumnItem, Ctx>, Ctx>[];
} {
  // construct column definition
  const gridCols: GridColumn<RHFColumnDef<ColumnItem, Ctx>, Ctx>[] = columnDefs.map(
    (col, colIndex) => ({
      id: col.id,
      header: col.header, // top header
      style: {
        headerClassName: col.style?.headerClassName, // style of top header
        bodyClassName: col.style?.bodyClassName, // if row has set style every column in row has to be set also
        footerClassName: col.style?.footerClassName, // style of footer
      },
      align: col.align,

      renderCell: ({ row, rowIndex, ctx }) => {
        const rawRow = row.value ?? null; // form'object under this table (useWatch)

        // const value =
        //   col.accessor?.({ row: rawRow, rowIndex, ctx }) ??
        //   (col.field ? rawRow[col.field as any] ?? rawRow[col.id as any]);

        const value = null;

        const field = col.field ?? row.rowDef?.field ?? col.id ?? row.id;
        const fieldPath = buildFieldPath(arrayName, colIndex, field) ?? '';

        // custom column cell
        if (col.render) {
          return col.render({
            fieldPath,
            row: row,
            rowIndex,
            col,
            columnIndex: colIndex,
            ctx,
            value,
            actions: {
              onAppend: onAppend,
              onRemove: onRemove,
            },
          });
        }

        // built-in component
        // if (col.rhf && col.field) {
        //   return (
        //     <RHFInputCell
        //       fieldName={fieldPath}
        //       inputType={col.rhf.inputType}
        //       options={col.rhf.options}
        //     />
        //   );
        // }

        return <span>{value ?? ''}</span>;
      },

      renderFooter: col.footer
        ? ({ rows, ctx }) => col.footer({ rows: rows.map(r => r.raw), ctx })
        : undefined,
    }),
  );

  // construct column definition by passing data under table, and passing row definition here
  const gridRows: GridRow<RHFRowDef<ColumnItem, Ctx>>[] =
    rowDefs?.map((def, i) => ({
      id: items[i]?.id ?? def.id,
      value: items[i]?.value,
      rowDef: def,
    })) ?? items.map(item => ({ id: item.id, value: item }));

  return { gridRows, gridCols };
}
