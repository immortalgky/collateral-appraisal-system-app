import React, { useMemo } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { DataGrid } from '@features/appraisal/components/priceAnalysis/components/table/DataGrid.tsx';
import {
  buildHorizontalGrid,
  buildVerticalGrid,
} from '@features/appraisal/components/priceAnalysis/adapters/rhf-table/builders.tsx';
import type { GridRow } from '@features/appraisal/components/priceAnalysis/components/table/types.ts';
import type {
  RHFHorizontalColumn,
  RHFVerticalRowDef,
} from '@features/appraisal/components/priceAnalysis/adapters/rhf-table/spec.ts';

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

  addColumn?: () => void;
  removeColumn?: (columnIndex: number) => void;
  saveColumn?: (columnIndex: number) => void;
  editColumn?: (columnIndex: number) => void;
}) => {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const watched = useWatch({ control, name, defaultValue: [] }) as Row[];

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
    <div className="border border-neutral-300 overflow-clip">
      <DataGrid
        rows={gridRows}
        columns={gridCols}
        ctx={ctx}
        groups={groups}
        hasHeader={hasHeader}
        hasBody={hasBody}
        hasFooter={hasFooter}
      />

      {/* optional add button */}
      <div className="flex flex-row items-center justify-center p-2 border-t border-neutral-300">
        <button
          type="button"
          onClick={() => append(defaultRow)}
          className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
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
  getColClassName,
}: {
  name: string;
  rowDefs: RHFVerticalRowDef<ColumnItem, Ctx>[];
  ctx: Ctx;
  defaultColumn: ColumnItem;
  leftHeaderClassName?: string;
  getColClassName?: (i: number) => string;
}) => {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const watched = useWatch({ control, name, defaultValue: [] }) as ColumnItem[];

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
      leftHeaderClassName,
      getColClassName,
    });
  }, [rowDefs, name, ctx, fields, watched, leftHeaderClassName, getColClassName]);

  return (
    <div className="border border-neutral-300 overflow-clip">
      <DataGrid
        rows={gridRows}
        columns={gridCols}
        ctx={ctx}
        hasHeader={false}
        hasBody={true}
        hasFooter={false}
      />

      {/* optional add button */}
      <div className="flex flex-row items-center justify-center p-2 border-t border-neutral-300">
        <button
          type="button"
          onClick={() => append(defaultColumn)}
          className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
        >
          + Add row
        </button>
      </div>
    </div>
  );
};
