import React, { useEffect, useMemo } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { DataGrid } from '@features/appraisal/components/priceAnalysis/components/table/DataGrid.tsx';
import {
  buildHorizontalGrid,
  buildVerticalGrid,
} from '@features/appraisal/components/priceAnalysis/adapters/rhf-table/builders.tsx';
import type {
  GridColumn,
  GridGroup,
  GridRow,
} from '@features/appraisal/components/priceAnalysis/components/table/types.ts';
import type {
  RHFHorizontalColumn,
  RHFVerticalRowDef,
} from '@features/appraisal/components/priceAnalysis/adapters/rhf-table/spec.ts';
import { verticalBuilder } from './verticalBuilder';

export const RHFHorizontalArrayTable = <Row extends Record<string, any>, Ctx>({
  name,
  columns,
  groups = [],
  ctx,
  defaultRow,
  hasHeader = true,
  hasBody = true,
  hasFooter = false,
}: {
  name: string;
  columns: RHFHorizontalColumn<Row, Ctx>[];
  groups?: GridGroup[];
  ctx: Ctx;
  defaultRow: Row;
  hasHeader?: boolean;
  hasBody?: boolean;
  hasFooter?: boolean;

  addRow?: () => void;
  removeRow?: (columnIndex: number) => void;
}) => {
  const { control, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const watched = useWatch({ control, name, defaultValue: [] }) as Row[];
  // const watched = getValues(name) as Row[];

  const {
    gridRows,
    gridCols,
  }: {
    gridRows: GridRow<Row>[];
    gridCols: GridColumn<Row, Ctx>[];
  } = useMemo(() => {
    return buildHorizontalGrid<Row, Ctx>({
      arrayName: name,
      items: fields.map((f, i) => ({ value: watched?.[i] ?? {}, id: f.id })),
      columns,
      ctx,
    });
  }, [columns, name, ctx, fields, watched]);

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white border border-gray-200 overflow-hidden flex flex-col">
      <DataGrid
        rows={gridRows}
        columns={gridCols}
        ctx={ctx}
        groups={groups}
        hasHeader={hasHeader}
        hasBody={hasBody}
        hasFooter={hasFooter}
        onAdd={append}
        onRemove={remove}
      />

      {/* optional add button */}
      <div className="flex flex-row items-center justify-center p-2 border-t border-gray-300">
        <button
          type="button"
          onClick={() => append(defaultRow)}
          className="px-4 py-2 border border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
        >
          + Add row
        </button>
      </div>
    </div>
  );
};

export const RHFVerticalArrayTable = <ColumnItem extends Record<string, any>, Ctx>({
  name,
  rowDefs,
  ctx,
  defaultColumn,
  leftHeaderClassName,
  topHeader,
  style,
}: {
  name: string;
  rowDefs: RHFVerticalRowDef<ColumnItem, Ctx>[];
  ctx: Ctx;
  defaultColumn: ColumnItem;
  leftHeaderClassName?: string;
  topHeader?: React.ReactNode[];
  style?: {
    headerClassName?: (colIndex: number) => string;
    bodyClassName?: (colIndex: number) => string;
    footerClassName?: string;
  };
}) => {
  const { control, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  // const watched = useWatch({ control, name, defaultValue: [] }) as ColumnItem[];
  const watched = getValues(name) as ColumnItem[];

  console.log(rowDefs);

  const {
    gridRows,
    gridCols,
  }: {
    gridRows: GridRow<RHFVerticalRowDef<ColumnItem, Ctx>>[];
    gridCols: GridColumn<RHFVerticalRowDef<ColumnItem, Ctx>, Ctx>[];
  } = useMemo(() => {
    return buildVerticalGrid<ColumnItem, Ctx>({
      arrayName: name,
      items: fields.map((f, i) => ({ value: watched?.[i] ?? {}, id: f.id })),
      rowDefs: rowDefs,
      ctx,
      topHeader,
      style,
    });
  }, [name, fields, rowDefs, ctx, topHeader, style, watched]);

  return (
    <div className="border border-gray-300 overflow-clip">
      <DataGrid
        rows={gridRows}
        columns={gridCols}
        ctx={ctx}
        hasHeader={true}
        hasBody={true}
        hasFooter={false}
      />

      {/* optional add button */}
      {/* <div className="flex flex-row items-center justify-center p-2 border-t border-neutral-300">
        <button
          type="button"
          onClick={() => append(defaultColumn)}
          className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
        >
          + Add row
        </button>
      </div> */}
    </div>
  );
};

export const RHFVerticalArrayTable2 = <ColumnItem extends Record<string, any>, Ctx>({
  name,
  rowDefs,
  columnDefs,
  ctx,
  defaultColumn,
}: {
  name: string;
  rowDefs: RHFVerticalRowDef<ColumnItem, Ctx>[];
  columnDefs: RHFHorizontalColumn<Row, Ctx>[];
  ctx: Ctx;
  defaultColumn: ColumnItem;
}) => {
  const { control, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  // const watched = useWatch({ control, name, defaultValue: [] }) as ColumnItem[];
  const watched = getValues(name) as ColumnItem[];

  const {
    gridRows,
    gridCols,
  }: {
    gridRows: any;
    gridCols: any;
  } = useMemo(() => {
    return verticalBuilder<ColumnItem, Ctx>({
      arrayName: name,
      items: fields.map((f, i) => ({ value: watched?.[i] ?? {}, id: f.id })),
      rowDefs: rowDefs,
      columnDefs: columnDefs,
    });
  }, [name, fields, rowDefs, columnDefs, watched]);

  return (
    <div className="border border-gray-300 overflow-clip">
      <DataGrid
        rows={gridRows}
        columns={gridCols}
        ctx={ctx}
        hasHeader={true}
        hasBody={true}
        hasFooter={false}
        onAdd={append}
        onRemove={remove}
      />

      {/* optional add button */}
      {/* <div className="flex flex-row items-center justify-center p-2 border-t border-neutral-300">
        <button
          type="button"
          onClick={() => append(defaultColumn)}
          className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
        >
          + Add row
        </button>
      </div> */}
    </div>
  );
};
