import { useMemo } from 'react';
import { DataTable } from './DataTable';
import type { ColumnDef, ColumnGroup, RHFColumn } from './types';
import { useController, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useDerivedFieldArray, type DerivedRule } from './useDerivedFieldArray';
import { RHFInputCell } from './RHFInputCell';

const clone = <T,>(v: T): T => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sc = (globalThis as any).structuredClone as ((x: any) => any) | undefined;
  return sc ? sc(v) : (JSON.parse(JSON.stringify(v)) as T);
};

type RHFArrayTableProps<Row extends Record<String, any>, Ctx extends Record<string, any>> = {
  name: string;
  columns: RHFColumn[];
  groups: ColumnGroup[];
  defaultRow: any;
  ctx?: Partial<Ctx>;
  watch?: Record<string, string>;

  onEdit?: (rowIndex: number, handleOnEdit: () => void) => void;

  onSave?: (rowIndex: number, handleOnEdit: () => void) => void;
};

export const RHFArrayTable = ({
  name,
  columns,
  groups = [],
  defaultRow,
  ctx,
  watch,
}: RHFArrayTableProps) => {
  const { control, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  const handleOnAdd = () => {
    const row = defaultRow;
    append(clone(row));
  };

  const handleOnDelete = (rowIndex: number) => {
    remove(rowIndex);
  };

  const watchedRows = useWatch({ control, name, defaultValue: [] }) ?? [];

  const tableRows = fields.map((f, i) => ({
    ...watchedRows[i],
    __rowId: f.id,
  }));

  const rules: DerivedRule[] = useMemo(() => {
    return columns
      .filter(c => c.derived?.compute && c.rhf?.name && (c.derived.persist ?? true))
      .map(c => ({
        targetKey: c.rhf!.name,
        normalize: c.derived!.normalize,
        compute: ({ row, rows, rowIndex, ctx }) => c.derived!.compute({ row, rows, rowIndex, ctx }),
      }));
  }, [columns]);

  useDerivedFieldArray<Row, Ctx>({ arrayName: name, rules, watch, ctx });

  const tableCtx = ctx;

  return (
    <DataTable
      rows={tableRows}
      columns={columns.map(column => ({
        ...column,
        renderCell: column.renderCell
          ? { fieldName, row, rowIndex, value, ctx }
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
      hasHeader={true}
      hasBody={true}
      hasFooter={true}
      onAdd={() => handleOnAdd()}
      onDelete={handleOnDelete}
      hasAddButton={true}
    />
  );
};
