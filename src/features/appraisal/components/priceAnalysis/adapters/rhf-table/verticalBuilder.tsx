/**
 * Pivot table
 * normal behavior of our table is data will be pass by row. mean i can pass data like [ row1: {column1, column2, ...} row2: {column1, column2, ...}]. but in case that we would like to render table like [ row1: { }]
 * Procudure:
 * (1) define row
 * (2) define column
 */

import { RHFInputCell } from '../../components/table/RHFInputCell';
import { buildFieldPath } from './buildFieldPath';

export interface ColumDef {
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
    row: Row;
    rowIndex: number;
    columnIndex: number;
    ctx: Ctx;
    value: any;
    actions: {
      addColumn: () => void;
      removeColumn: (columnIndex: number) => void;
    };
  }) => React.ReactNode;

  accessor?: (args: { row: Row; rowIndex: number; ctx: Ctx }) => any;

  footer?: (args: { rows: Row[]; ctx: Ctx }) => React.ReactNode;
}

export interface RowDef {
  id: string;
  rowHeader?: (args: {
    fieldPath: string; // e.g. "WQSCalculations.1.offeringPriceAdjustmentPct"
    row: any;
    rowIndex: number;
    columnItem: ColumnItem;
    columnIndex: number;
    ctx: Ctx;
    value: any;
    actions: {
      addColumn: () => void; // pending
      removeColumn: (columnIndex: number) => void; // pending
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
    columnItem: ColumnItem;
    columnIndex: number;
    ctx: Ctx;
    value: any;
    actions: {
      addColumn: () => void; // pending
      removeColumn: (columnIndex: number) => void; // pending
    };
  }) => React.ReactNode;
}

interface verticalBuilderProps<ColumnItem extends Record<string, any>, Ctx> {
  arrayName: string;
  items: { id: string; value: ColumnItem }[];
  columnDefs: ColumDef[];
  rowDefs: RowDef[];
}

export const verticalBuilder = ({
  arrayName,
  items,
  columnDefs,
  rowDefs,
}: verticalBuilderProps) => {
  // construct column definition
  const gridCols: Record<string, any>[] = columnDefs.map((col, colIndex) => ({
    id: col.id,
    header: col.header,
    style: {
      headerClassName: col.style?.headerClassName,
      bodyClassName: col.style?.bodyClassName, // if row has set style every column in row has to be set also
      footerClassName: col.style?.footerClassName,
    },
    align: col.align,

    renderCell: ({ row, rowIndex, ctx, actions: { onAdd, onRemove } }) => {
      const rawRow = row.raw.items;

      const value =
        col.accessor?.({ row: rawRow, rowIndex, ctx }) ??
        (col.field ? rawRow[col.field as any] : rawRow[col.id as any]);

      const field = col.field ?? row.raw.rowdef?.field ?? col.id ?? row.id;
      const fieldPath = buildFieldPath(arrayName, colIndex, field) ?? '';

      // console.log(row, rowIndex, col, colIndex, ctx);
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

  // construct column definition by passing data under table, and passing row definition here
  const gridRows: any[] = rowDefs.map(def => ({
    id: def.id,
    value: items,
    rowDef: def,
  }));

  console.log(gridCols);

  return { gridRows, gridCols };
};
