import { Icon, Input } from '@/shared/components';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import {
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
  type Control,
  type FieldValues,
} from 'react-hook-form';
import BuildingDetailPopUpModal from './BuildingDetailPopUpModal';
import { title } from 'process';

interface BuildingDetailProps {
  name: string;
  headers: FormTableHeader[];
  handlePopupModal?: (index: number | undefined) => void;
  defaultValue?: object;
}

type FormTableHeader =
  | FormTableRegularHeader
  | FormTableRowNumberHeader
  | FormTableRowNumberHeader
  | FormTableRowTextHeader;

type Align = 'left' | 'right' | 'center';

function alignClass(align?: 'left' | 'right' | 'center') {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

interface FormTableRegularHeader {
  type: 'general';
  name: string;
  label: string;
  inputType?: string;
  className?: string;
  align?: Align;
  isStickyRight?: boolean;

  // value extraction for display (optional; default is row[id])
  accessor?: (row: any, rowIndex: number) => any;

  // customize view rendering (optional)
  render?: (ctx: { value: any; row: any; rowIndex: number }) => React.ReactNode;

  // footer aggregation / rendering
  footer?: (ctx: { rows: any[] }) => React.ReactNode;
  footerSum?: boolean; // if true, sum Number(value)
}

interface FormTableRowTextHeader {
  type: 'text';
  name?: string;
  label: string;
  className?: string;
  align?: Align;
  isStickyRight?: boolean;

  body?: (ctx: { value?: string }) => string;

  footer?: (ctx: { value?: string }) => React.ReactNode;
}

interface FormTableRowNumberHeader {
  type: 'number';
  name: string;
  label: string;
  className?: string;
  align?: Align;
  isStickyRight?: boolean;

  // value extraction for display (optional; default is row[id])
  accessor?: (row: any, rowIndex: number) => any;

  // customize view rendering (optional)
  render?: (ctx: { value: any; row: any; rowIndex: number }) => React.ReactNode;

  // footer aggregation / rendering
  footer?: (ctx: { values: number[] }) => React.ReactNode;
}

interface FormTableRowNumberHeader {
  type: 'row-number';
  rowNumberColumn: true;
  label: string;
  className?: string;
}

interface TableCellProps {
  name: string;
  index: number;
  editIndex: number | undefined;
  value: string;
  header: FormTableRegularHeader;
  control: Control<FieldValues, any, FieldValues>;
}

function toNumber(v: any) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const BuildingDetailTable = ({
  name,
  headers,
  handlePopupModal,
  defaultValue,
}: BuildingDetailProps) => {
  const { getValues, control } = useFormContext();
  const { append, remove } = useFieldArray({
    control,
    name: name,
  });
  const values = getValues(name);
  const [editIndex, setEditIndex] = useState<number | undefined>();
  const handleDeleteRow = (index: number) => {
    setEditIndex(undefined);
    remove(index);
  };

  const handleAddRow = () => {
    let newRow: Record<string, any> = {};

    if (defaultValue != undefined) {
      newRow = defaultValue;
    } else {
      for (const header of headers) {
        if ('name' in header) {
          newRow[header.name] = ''; // TODO: Get default value from zod
        }
      }
    }

    append(newRow);
    // setEditIndex(getValues(name).length - 1);
    handleEdit(getValues(name).length - 1);
  };

  const handleEdit = (index: number | undefined) => {
    setEditIndex(index);
    handlePopupModal(index);
  };

  const isEmpty = values.length === 0;

  return (
    <div className="w-full rounded-lg overflow-hidden border border-neutral-3">
      <div className="w-full h-full overflow-auto">
        <table className="table-fixed w-full h-full">
          <colgroup>
            {headers.map((header, index) => (
              <col key={index} className={clsx(header.className)} />
            ))}
            <col className="w-24" /> {/* Actions column */}
          </colgroup>
          <thead>
            <tr className="bg-primary-700">
              {headers.map((header, index) => {
                return (
                  <th
                    key={index}
                    className={clsx(
                      'text-white text-sm font-medium py-3 px-4 text-left truncate',
                      header.className,
                      alignClass(header.align),
                    )}
                    scope="col"
                  >
                    {header.label}
                  </th>
                );
              })}
              <th className="text-white text-sm font-medium py-3 px-4 text-right sticky right-0 w-24 bg-primary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!isEmpty &&
              values.map((field: Record<string, any>, index: number) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 transition-colors border-b-1 border-neutral-3"
                >
                  {headers.map((header, inner_index) => {
                    if ('name' in header) {
                      if (header.type === 'number') {
                        return (
                          <td
                            key={inner_index}
                            className={clsx('py-3 px-4 truncate', alignClass(header.align))}
                            title={field[header.name] ?? ''}
                          >
                            <TableCell
                              name={name}
                              index={index}
                              editIndex={editIndex}
                              value={field[header.name]}
                              header={header}
                              control={control}
                            />
                          </td>
                        );
                      }
                      if (header.type === 'text') {
                        return (
                          <td
                            key={inner_index}
                            className={clsx(
                              'py-3 px-4 whitespace-nowrap truncate',
                              alignClass(header.align),
                            )}
                          >
                            <span
                              className="items-center justify-center text-sm font-medium truncate text-gray-600 w-full"
                              title={
                                header.body
                                  ? header.body(field[header.name])
                                  : (field[header.name] ?? '')
                              }
                            >
                              {header.body ? header.body(field[header.name]) : field[header.name]}
                            </span>
                          </td>
                        );
                      }
                    } else {
                      return (
                        <td key={inner_index} className="py-3 px-4 whitespace-nowrap truncate">
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
                          onClick={() => handleEdit(undefined)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-colors"
                          title="Save"
                        >
                          <Icon style="solid" name="check" className="size-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEdit(index)}
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
          {isEmpty ? (
            <tfoot>
              <tr>
                <td colSpan={headers.length + 1} className="p-2">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="sticky left-3 p-4 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors rounded-lg"
                  >
                    <Icon style="solid" name="plus" className="size-3.5 text-primary-600" />
                    Add first item
                  </button>
                </td>
              </tr>
            </tfoot>
          ) : (
            <tfoot>
              <tr>
                <td colSpan={headers.length + 1} className="p-2">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="sticky left-3 p-4 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors rounded-lg"
                  >
                    <Icon style="solid" name="plus" className="size-3 text-primary-600" />
                    New record
                  </button>
                </td>
              </tr>
              <tr className="border-t-1 border-neutral-3">
                {!isEmpty ? (
                  headers.map((header, inner_index) => {
                    return (
                      <td
                        key={inner_index}
                        className={clsx('py-3 px-4', header.className, alignClass(header.align))}
                      >
                        <span className="inline-flex items-center justify-center text-sm font-normal text-gray-400">
                          {header.type === 'number'
                            ? header.footer
                              ? header.footer(values.map((v: any) => toNumber(v[header.name])))
                              : ''
                            : header.type === 'text'
                              ? header.footer
                                ? header.footer(values.map((v: any) => v[header.name]))
                                : ''
                              : ''}
                        </span>
                      </td>
                    );
                  })
                ) : (
                  <></>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div></div>
      <div></div>
    </div>
  );
};

const TableCell = ({ name, index, editIndex, value, header, control }: TableCellProps) => {
  const cellName = `${name}.${index}.${header.name}`;
  const {
    field,
    fieldState: { error },
  } = useController({ name: cellName, control });
  return (
    <div>
      {editIndex === index ? <Input type={header.inputType} {...field} /> : <div>{value}</div>}
      {error && <div className="mt-1 text-sm text-danger">{error?.message}</div>}
    </div>
  );
};

export default BuildingDetailTable;
