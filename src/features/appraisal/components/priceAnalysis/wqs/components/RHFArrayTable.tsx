import { useMemo } from 'react';
import { DataTable } from './DataTable';
import type { ColumnDef, ColumnGroup, RHFColumn } from './types';
import { useController, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useDerivedFieldArray, type DerivedRule } from './useDerivedFieldArray';
import { RHFInputCell } from './RHFInputCell';
import { VerticalDataTable, type RHFRow } from './VerticalDataTable';
import { useMergedCtx } from './useMergedCtx';

const clone = <T,>(v: T): T => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sc = (globalThis as any).structuredClone as ((x: any) => any) | undefined;
  return sc ? sc(v) : (JSON.parse(JSON.stringify(v)) as T);
};

type AnyRecord = Record<string, any>;

interface RHFTable<Row extends AnyRecord, Ctx extends AnyRecord> {
  name: string;
  dataAlignment: 'horizontal' | 'vertical';
  columns: RHFColumn[];
  groups: ColumnGroup[];
  defaultRow: any;
  ctx?: Partial<Ctx>;
  watch?: Record<string, string>;

  onEdit?: (rowIndex: number, handleOnEdit: () => void) => void;

  onSave?: (rowIndex: number, handleOnEdit: () => void) => void;

  hasHeader?: boolean;
  hasBody?: boolean;
  hasFooter?: boolean;
  hasAddButton?: boolean;
}

interface RHFHorizontalTable<Row extends AnyRecord, Ctx extends AnyRecord> extends RHFTable {
  rows: RHFRow[];
  dataAlignment: 'horizontal';
  defaultColumns: any;
}

interface RHFVerticalTable<Row extends AnyRecord, Ctx extends AnyRecord> extends RHFTable {
  columns: RHFColumn[];
  dataAlignment: 'vertical';
  defaultRows: any;
}

type RHFArrayTableProps<Row extends AnyRecord, Ctx extends AnyRecord> =
  | RHFVerticalTable<Row, Ctx>
  | RHFHorizontalTable<Row, Ctx>;

export const RHFArrayTable = <Row extends AnyRecord, Ctx extends AnyRecord>({
  name,
  dataAlignment = 'horizontal',
  columns,
  groups = [],
  defaultRow,
  ctx,
  watch,
  onEdit,
  onSave,
  hasHeader = true,
  hasBody = true,
  hasFooter = true,
  hasAddButton = true,

  rows,
  defaultColumns,
}: RHFArrayTableProps<Row, Ctx>) => {
  const { control, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  const handleOnAdd = () => {
    const row = defaultRow;
    append(clone(row));
  };

  const handleOnDelete = (rowIndex: number) => {
    remove(rowIndex);
  };

  const watchedData = useWatch({ control, name, defaultValue: [] }) ?? [];

  const tableData = fields.map((f, i) => ({
    ...watchedData[i],
    __id: f.id,
  }));

  const rules: DerivedRule[] = useMemo(() => {
    if (dataAlignment === 'horizontal') {
      return columns
        .filter(c => c.derived?.compute && c.name && (c.derived.persist ?? true))
        .map(c => ({
          targetKey: c.name,
          normalize: c.derived!.normalize,
          compute: ({ row, rows, rowIndex, ctx }) =>
            c.derived!.compute({ row, rows, rowIndex, ctx }),
        }));
    }

    return rows
      .filter(r => r.derived?.compute && r.name && (r.derived.persist ?? true))
      .map(r => ({
        targetKey: r.name,
        normalize: r.derived!.normalize,
        compute: ({ row, rows, rowIndex, ctx }) => r.derived!.compute({ row, rows, rowIndex, ctx }),
      }));
  }, [columns, rows]);

  useDerivedFieldArray<Row, Ctx>({ dataAlignment, arrayName: name, rules, watch, ctx });

  const tableCtx = useMergedCtx({ baseCtx: ctx, watch: watch });

  return (
    <div>
      {dataAlignment === 'horizontal' ? (
        <DataTable
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
          onAdd={() => handleOnAdd()}
          onDelete={handleOnDelete}
          hasAddButton={hasAddButton}
        />
      ) : (
        <VerticalDataTable
          columns={tableData}
          rows={rows.map(row => ({
            ...row,
            renderCell: row.renderCell
              ? ({ fieldName, column, columnIndex, value, ctx }) => {
                  return row.renderCell({
                    fieldName: `${name}.${fieldName}`,
                    column,
                    columnIndex,
                    value: value,
                    ctx: ctx,
                  });
                }
              : ({ fieldName, column, columnIndex, value, ctx }) => {
                  return (
                    <RHFInputCell
                      fieldName={`${name}.${fieldName}`}
                      inputType={row.rhfRenderCell.inputType}
                      options={row.rhfRenderCell.options}
                    />
                  );
                },
          }))}
          hasAddButton={false}
          onAdd={() => handleOnAdd}
          onDelete={handleOnDelete}
          ctx={tableCtx}
        />
      )}
    </div>
  );
};
