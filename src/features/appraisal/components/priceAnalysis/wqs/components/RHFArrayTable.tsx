import { useMemo, useState } from 'react';
import type { ColumnDef, ColumnGroup, RHFColumn, RHFRow } from './types';
import { useController, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import {
  useDerivedFieldArray,
  type DerivedRule,
  type Row,
  type Column,
} from './useDerivedFieldArray';
import { RHFInputCell } from './RHFInputCell';
import { VerticalDataTable } from './VerticalDataTable';
import { useMergedCtx } from './useMergedCtx';
import { HorizontalDataTable } from '@features/appraisal/components/priceAnalysis/wqs/components/HorizontalDataTable.tsx';

const clone = <T,>(v: T): T => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sc = (globalThis as any).structuredClone as ((x: any) => any) | undefined;
  return sc ? sc(v) : (JSON.parse(JSON.stringify(v)) as T);
};

interface RHFHorizontalTable<Row = Record<string, any>, Ctx = any> extends RHFTable {
  rows: RHFRow[];
  dataAlignment: 'horizontal';
  defaultRow: Row;
}

interface RHFVerticalTable<Row = Record<string, any>, Ctx = any> extends RHFTable {
  columns: RHFColumn[];
  dataAlignment: 'vertical';
  defaultColumn: Row;
}

type RHFArrayTableProps<Row = Record<string, any>, Ctx = any> =
  | RHFVerticalTable<Row, Ctx>
  | (RHFHorizontalTable<Row, Ctx> & {
      name: string;
      groups: ColumnGroup;
      ctx: Partial<Ctx>;
      watch?: Record<string, string>;
      canEdit?: boolean;
      onEdit?: (rowIndex: number, handleOnEdit: (rowIndex: number) => void) => void;
      canSave?: boolean;
      onSave?: (rowIndex: number, handleOnEdit: (rowIndex: number) => void) => void;
      hasHeader: boolean;
      hasFooter: boolean;
      hasAddButton: boolean;
    });

export const RHFArrayTable = <Ctx = Record<string, any>, T = Row | Column>({
  name,
  dataAlignment = 'horizontal',
  columns,
  groups = [],
  defaultRow,
  ctx,
  watch,
  canEdit = true,
  onEdit,
  canSave,
  onSave,
  hasHeader = true,
  hasBody = true,
  hasFooter = true,
  hasAddButton = true,

  rows,
  defaultColumns,
}: RHFArrayTableProps<Ctx, T>) => {
  const { control, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  const [editingRow, setEditingRow] = useState<number | undefined>(undefined);

  const handleOnAdd = () => {
    const row = defaultRow;
    setEditingRow(fields.length);
    append(clone(row));
  };

  const handleOnDelete = (rowIndex: number) => {
    setEditingRow(undefined);
    remove(rowIndex);
  };

  const handleOnEdit = (rowIndex: number) => {
    setEditingRow(rowIndex);
  };

  const handleOnSave = () => {
    setEditingRow(undefined);
  };

  const watchedData = useWatch({ control, name, defaultValue: [] }) ?? [];

  const tableData = fields.map((f, i) => {
    return { ...(watchedData?.[i] ?? {}), __id: f.id };
  });

  const rules: DerivedRule<Ctx, T>[] = useMemo(() => {
    if (dataAlignment === 'horizontal') {
      return columns
        .filter(c => c.derived?.compute && c.name && (c.derived.persist ?? true))
        .map(c => ({
          alignment: 'horizontal' as const,
          targetKey: c.name,
          normalize: c.derived!.normalize,
          compute: ({ row, rows, rowIndex, ctx }) =>
            c.derived!.compute({ row, rows, rowIndex, ctx }),
        }));
    }

    return rows
      .filter(r => r.derived?.compute && r.name && (r.derived.persist ?? true))
      .map(r => ({
        alignment: 'vertical' as const,
        targetKey: r.name,
        normalize: r.derived!.normalize,
        compute: ({ column, columns, columnIndex, ctx }) =>
          r.derived!.compute({ column, columns, columnIndex, ctx }),
      }));
  }, [dataAlignment, columns, rows]);

  const tableCtx: Ctx = useMergedCtx({ baseCtx: ctx, watch: watch });
  useDerivedFieldArray<Ctx, T>({ dataAlignment, arrayName: name, rules, mergedCtx: tableCtx });

  return (
    <div>
      {dataAlignment === 'horizontal' ? (
        <HorizontalDataTable
          rows={tableData}
          columns={columns.map(column => ({
            ...column,
            renderCell: column.renderCell
              ? ({ fieldName, row, rowIndex, value, ctx }) => {
                  return column.renderCell({
                    fieldName: `${name}.${fieldName}`,
                    row: row,
                    rowIndex: rowIndex,
                    value: value,
                    ctx: ctx,
                  });
                }
              : ({ fieldName, row, rowIndex, value, ctx }) => {
                  return (
                    <RHFInputCell
                      fieldName={`${name}.${fieldName}`}
                      inputType={column.rhfRenderCell.inputType}
                      options={column.rhfRenderCell.options}
                    />
                  );
                },
          }))}
          groups={groups}
          ctx={tableCtx}
          hasHeader={hasHeader}
          hasBody={hasBody}
          hasFooter={hasFooter}
          onAdd={handleOnAdd}
          onDelete={handleOnDelete}
          editingRow={editingRow}
          onEdit={rowIndex => {
            return onEdit ? onEdit(rowIndex, handleOnEdit) : handleOnEdit(rowIndex);
          }}
          canEdit={canEdit}
          onSave={handleOnSave}
          canSave={canSave}
          hasAddButton={hasAddButton}
        />
      ) : (
        <VerticalDataTable
          columns={tableData}
          rows={rows.map(row => ({
            ...row,
            renderCell: row.renderCell
              ? ({ fieldName, column, columns, columnIndex, value, ctx }) => {
                  return row.renderCell({
                    fieldName: `${name}.${fieldName}`,
                    column,
                    columns,
                    columnIndex,
                    value: value,
                    ctx: ctx,
                  });
                }
              : ({ fieldName, column, columns, columnIndex, value, ctx }) => {
                  return (
                    <RHFInputCell
                      fieldName={`${name}.${fieldName}`}
                      inputType={row.rhfRenderCell.inputType}
                      options={row.rhfRenderCell.options}
                    />
                  );
                },
          }))}
          hasAddButton={hasAddButton}
          onAdd={handleOnAdd}
          onDelete={handleOnDelete}
          editingColumn={editingRow}
          onEdit={rowIndex => {
            return onEdit ? onEdit(rowIndex, handleOnEdit) : handleOnEdit(rowIndex);
          }}
          canEdit={canEdit}
          onSave={handleOnSave}
          ctx={tableCtx}
        />
      )}
    </div>
  );
};
