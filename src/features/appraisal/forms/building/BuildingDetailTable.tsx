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
}

type FormTableHeader = FormTableRegularHeader | FormTableRowNumberHeader;

type Align = 'left' | 'right' | 'center';

function alignClass(align?: 'left' | 'right' | 'center') {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

interface FormTableRegularHeader {
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

interface FormTableRowNumberHeader {
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

const BuildingDetailTable = ({ name, headers, handlePopupModal }: BuildingDetailProps) => {
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
    const newRow: Record<string, any> = {};
    for (const header of headers) {
      if ('name' in header) {
        newRow[header.name] = ''; // TODO: Get default value from zod
      }
    }

    newRow['buildingDepreciations'] = [];
    append(newRow);
    setEditIndex(getValues(name).length - 1);
  };

  const handleEdit = (index: number | undefined) => {
    console.log(index);
    setEditIndex(index);
    handlePopupModal(index);
  };

  const rows = (useWatch({ control, name }) as []) ?? [];

  const totals = useMemo(() => {
    console.log('test');
    const map: Record<string, number> = {};
    for (const header of headers) {
      if (!header.footerSum) continue;
      map[header.name] = rows.reduce((acc, r, idx) => {
        // const raw = col.accessor ? col.accessor(r, idx) : r[col.id];
        return acc + toNumber(r[header.name]);
      }, 0);
    }
    console.log(map);
    return map;
  }, [rows]);

  const isEmpty = values.length === 0;

  return (
    <div className="w-full rounded-lg overflow-hidden border border-neutral-3">
      <div className="w-full overflow-x-auto">
        <table className="table-fixed w-full">
          <colgroup>
            {headers.map((h, i) => (
              <col key={i} className={h.className /* e.g. w-[200px] */} />
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
                    title={header.label ?? ''}
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
                      if ('inputType' in header) {
                        console.log('pass');
                        return (
                          <td
                            key={inner_index}
                            className={clsx(
                              'py-3 px-4 whitespace-nowrap truncate text-right',
                              alignClass(header.align),
                            )}
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
                      } else {
                        return (
                          <td
                            key={inner_index}
                            className={clsx(
                              'py-3 px-4 whitespace-nowrap truncate',
                              alignClass(header.align),
                            )}
                          >
                            <span className="inline-flex items-center justify-center text-sm font-medium text-gray-600">
                              {field[header.name]}
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
                <td colSpan={headers.length + 1} className="p-0">
                  <div className="sticky left-0 right-0 border-t border-gray-100 bg-white">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Icon style="regular" name="inbox" className="size-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No data yet</p>
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className=" flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary-600 bg-gray-50 hover:bg-primary-50 transition-colors"
                    >
                      <Icon style="solid" name="plus" className="size-3.5" />
                      Add first item
                    </button>
                  </div>
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
                    className="sticky left-3 p-4 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                      <Icon style="solid" name="plus" className="size-3 text-white" />
                    </div>
                    New record
                  </button>
                </td>
              </tr>
              <tr>
                {!isEmpty ? (
                  headers.map((header, inner_index) => {
                    return (
                      <td
                        key={inner_index}
                        className={clsx('py-3 px-4', header.className, alignClass(header.align))}
                      >
                        <span className="inline-flex items-center justify-center text-sm font-medium text-gray-600">
                          {header.footerSum ? `Total: ${totals[header.name]}` : ''}
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
