import { Icon, Input } from '@/shared/components';
import clsx from 'clsx';
import { useState } from 'react';
import {
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
  type Control,
  type FieldValues,
} from 'react-hook-form';
import { evalExpr, type Env, type Expr, type LookupRow } from './evalExpr';

interface CalculationTableProps {
  name: string;
  headers: FormTableHeader[];
}

type FormTableHeader = FormTableRegularHeader | FormTableRowNumberHeader | FormTableExprHeader;

interface FormTableRegularHeader {
  name: string;
  label: string;
  inputType?: string;
  className?: string;
}

interface FormTableRowNumberHeader {
  rowNumberColumn: true;
  label: string;
  className?: string;
}

interface FormTableExprHeader {
  name: string;
  label: string;
  inputType: 'number';
  className?: string;
  expr?: Expr;
}

type RowValue = Record<string, any>;

interface TableCellProps {
  name: string;
  index: number;
  editIndex: number | undefined;
  value: string;
  header: FormTableRegularHeader | FormTableExprHeader;
  control: Control<FieldValues, any, FieldValues>;

  row: RowValue;
  rows: RowValue[];
}

const CalculationTable = ({ name, headers }: CalculationTableProps) => {
  const { getValues, control } = useFormContext();
  const { append, remove } = useFieldArray({
    control,
    name: name,
  });
  const values = useWatch({ control, name }) ?? [];
  const [editIndex, setEditIndex] = useState<number | undefined>();

  const handleDeleteRow = (index: number) => {
    setEditIndex(undefined);
    remove(index);
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    for (const header of headers) {
      if ('name' in header) {
        newRow[header.name] = ''; // TODO: Get default value from zod
      }
    }
    append(newRow);
    setEditIndex(getValues(name).length - 1);
  };

  const isEmpty = values.length === 0;

  return (
    <div className="w-full rounded-lg overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="table-auto min-w-max">
          <thead>
            <tr className="bg-primary-700">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className={clsx(
                    'text-white text-sm font-medium py-3 px-4 text-left',
                    header.className,
                  )}
                >
                  {header.label}
                </th>
              ))}
              <th className="text-white text-sm font-medium py-3 px-4 text-right sticky right-0 w-24 bg-primary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!isEmpty &&
              values.map((field: Record<string, any>, index: number) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  {headers.map((header, inner_index) => {
                    if ('name' in header) {
                      return (
                        <td key={inner_index} className="py-3 px-4">
                          <TableCell
                            name={name}
                            index={index}
                            editIndex={editIndex}
                            value={field[header.name]}
                            header={header}
                            control={control}
                            row={field}
                            rows={values}
                          />
                        </td>
                      );
                    } else {
                      return (
                        <td key={inner_index} className="py-3 px-4">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                            {index + 1}
                          </span>
                        </td>
                      );
                    }
                  })}
                  <td className="py-3 px-4 sticky right-0 bg-white">
                    <div className="flex gap-1 justify-end">
                      {editIndex === index ? (
                        <button
                          type="button"
                          onClick={() => setEditIndex(undefined)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-colors"
                          title="Save"
                        >
                          <Icon style="solid" name="check" className="size-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditIndex(index)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                          title="Edit"
                        >
                          <Icon style="solid" name="pen" className="size-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(index)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                        title="Delete"
                      >
                        <Icon style="solid" name="trash" className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center gap-2 w-full my-5">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon style="regular" name="inbox" className="size-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No data yet</p>
          <button
            type="button"
            onClick={handleAddRow}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <Icon style="solid" name="plus" className="size-3.5" />
            Add first item
          </button>
        </div>
      ) : (
        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary-600 bg-gray-50 hover:bg-primary-50 transition-colors rounded-b-lg"
          >
            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
              <Icon style="solid" name="plus" className="size-3 text-white" />
            </div>
            Add row
          </button>
        </div>
      )}
    </div>
  );
};

const TableCell = ({ name, index, editIndex, header, control, row, rows }: TableCellProps) => {
  const cellName = `${name}.${index}.${header.name}`;

  const {
    field,
    fieldState: { error },
  } = useController({ name: cellName, control });

  const lookupRow: LookupRow = (rowIndex, fieldName) => {
    const v = rows?.[rowIndex]?.[fieldName];
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const env: Env = Object.fromEntries(
    Object.entries(row ?? {}).map(([k, v]) => [k, typeof v === 'number' ? v : Number(v) || 0]),
  );

  const computed =
    'expr' in header && header.expr ? evalExpr(header.expr, env, lookupRow) : undefined;

  console.log(computed);

  return (
    <div>
      {editIndex === index ? (
        <Input
          type={header.inputType}
          {...field}
          onChange={(e: any) => {
            const raw = e?.target?.value;
            field.onChange(
              header.inputType === 'number' ? (raw === '' ? undefined : Number(raw)) : raw,
            );
          }}
        />
      ) : (
        <div>{computed ?? field.value}</div>
      )}
      {error && <div className="mt-1 text-sm text-danger">{error.message}</div>}
    </div>
  );
};

export default CalculationTable;
