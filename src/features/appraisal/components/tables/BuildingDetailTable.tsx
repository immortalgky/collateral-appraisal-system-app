import { Icon, Input } from '@/shared/components';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import {
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
  type Control,
  type FieldValues,
} from 'react-hook-form';
import { useDerivedFieldArray, type DerivedRule } from './useDerivedFieldArray';

type Align = 'left' | 'right' | 'center';

const alignClass = (align?: Align) => {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
};

interface BuildingDetailProps {
  name: string;
  headers: FormTableHeader[];
  defaultValue?: object;
  getEditingStatus?: (index: number | undefined) => void;
  outScopeFields?: Record<string, any>;
  disableSaveBtn?: boolean;
  disableEditBtn?: boolean;
}

type FormTableHeader =
  | FormTableRegularHeader
  | FormTableRowNumberHeader
  | FormTableRowTextHeader
  | FormTableRowGroupHeader
  | FormTableRowRunNumberHeader;

type HeaderType =
  | 'general'
  | 'display'
  | 'text'
  | 'input-text'
  | 'input-number'
  | 'input-dropdown'
  | 'row-number'
  | 'group'
  | 'component';

interface BaseHeader {
  type: HeaderType;
  align?: Align;
  isStickyRight?: boolean;
  className?: string;
}

interface FormTableRegularHeader extends BaseHeader {
  type: 'general';
  name: string;
  label: string;
  inputType?: string;

  // value extraction for display (optional; default is row[id])
  accessor?: (row: any, rowIndex: number) => any;

  // customize view rendering (optional)
  render?: (ctx: { value: any; row: any; rowIndex: number }) => React.ReactNode;

  // footer aggregation / rendering
  footer?: (ctx: { rows: any[] }) => React.ReactNode;
  footerSum?: boolean; // if true, sum Number(value)
}

interface FormTableRowTextHeader extends BaseHeader {
  // header
  type: 'text';
  groupName: string;
  name?: string;
  label: string;

  // body
  body?: (ctx: { value?: string; outScopeFields: Record<string, any> }) => string;
  compute: (ctx: ComputeCtx) => any;
  normalize?: (v: any) => any;

  // footer
  footer?: (ctx: { value?: string }) => React.ReactNode;
}

interface FormTableRowGroupHeader extends BaseHeader {
  type: 'group';
  groupName: string;
  label: string;
}

interface FormTableRowNumberHeader extends BaseHeader {
  type: 'number';
  groupName: string;
  name: string;
  label: string;

  accessor?: (tableValue: any, rowIndex: number, fieldName: string) => any;

  render?: (ctx: { value: any; row: any; rowIndex: number }) => React.ReactNode;

  footer?: (ctx: { values: number[] }) => React.ReactNode;
}

interface FormTableRowRunNumberHeader extends BaseHeader {
  type: 'row-number';
  rowNumberColumn: true;
  label: string;
  className?: string;
}

interface TableCellProps {
  type: string;
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

function isGroupHeader(h: FormTableHeader): h is FormTableRowGroupHeader {
  return h.type === 'group';
}

const BuildingDetailTable = ({
  name,
  headers,
  getEditingStatus,
  defaultValue,
  outScopeFields = {},
  disableSaveBtn = false,
  disableEditBtn = false,
}: BuildingDetailProps) => {
  const { getValues, control } = useFormContext();
  const { append, remove } = useFieldArray({
    control,
    name: name,
  });

  // reset state of table

  const hasGroups = headers.some(isGroupHeader);

  const [editIndex, setEditIndex] = useState<number | undefined>();

  const values = getValues(name);

  const rules: DerivedRule[] = useMemo(() => {
    return headers
      .filter(h => 'compute' in h && h.type === 'text' && h.name != undefined)
      .map((h): DerivedRule => {
        return { targetKey: h.name, compute: h.compute, normalize: h.normalize };
      });
  }, [headers]);

  useDerivedFieldArray({ arrayName: name, rules, outScopeFields });

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
    handleSave(undefined);
    handleEdit(getValues(name).length - 1);
  };

  const handleEdit = (index: number | undefined) => {
    setEditIndex(index);
    console.log(index);
    if (getEditingStatus != undefined) getEditingStatus(index);
  };

  const handleSave = () => {
    setEditIndex(undefined);
    if (getEditingStatus != undefined) getEditingStatus(undefined);
  };

  const isEmpty = values.length === 0;

  const canEdit = !disableEditBtn;
  const canSave = !disableSaveBtn;

  return (
    <div className="w-full max-h-full flex flex-col rounded-lg border border-neutral-3 overflow-clip">
      <div className="w-full h-full overflow-auto">
        <table className="table-fixed w-full h-full border-separate border-spacing-0 ">
          <thead>
            <tr className="bg-primary-700">
              {headers.map((header, index) => {
                return TableHeader({ type: header.type, headers, header, index });
              })}
              <th
                className={clsx(
                  'text-white text-sm font-medium py-3 px-4 text-right w-24 bg-primary sticky top-0 right-0 z-30',
                )}
                rowSpan={headers.some(h => h.type === 'group') ? 2 : 1}
              >
                Actions
              </th>
            </tr>
            {headers.find(h => 'groupName' in h && h.type === 'group') ? (
              <tr className="bg-primary-700">
                {headers
                  .filter(h => 'groupName' in h && h.type !== 'group')
                  .map((header, index) => (
                    <th
                      key={index}
                      className={clsx(
                        'text-white text-sm font-medium py-3 px-4 text-left truncate bg-primary sticky top-0 z-20',
                        header.className,
                        alignClass(header.align),
                      )}
                    >
                      {header.label}
                    </th>
                  ))}
              </tr>
            ) : null}
          </thead>
          <tbody className="divide-y divide-neutral-3">
            {!isEmpty &&
              values.map((field: Record<string, any>, index: number) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  {headers.map((header, inner_index) => {
                    return TableBody({
                      type: header.type,
                      header,
                      row: field,
                      rows: values,
                      rowIndex: index,
                      arrayName: name,
                      editIndex,
                      control,
                      inner_index,
                      fieldName: name,
                      outScopeFields,
                    });
                  })}
                  <td className="py-3 px-4 sticky right-0 z-20 bg-white">
                    <div className="flex gap-1 justify-end">
                      {editIndex === index ? (
                        canSave ? (
                          <button
                            type="button"
                            onClick={() => handleSave()}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-colors"
                            title="Save"
                          >
                            <Icon style="solid" name="check" className="size-4" />
                          </button>
                        ) : canEdit ? (
                          <button
                            type="button"
                            onClick={() => handleEdit(index)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                            title="Edit"
                          >
                            <Icon style="solid" name="pen" className="size-3.5" />
                          </button>
                        ) : null
                      ) : canEdit ? (
                        <button
                          type="button"
                          onClick={() => handleEdit(index)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                          title="Edit"
                        >
                          <Icon style="solid" name="pen" className="size-3.5" />
                        </button>
                      ) : null}
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
          {
            <tfoot>
              <tr className="border-t-1 border-neutral-3">
                {!isEmpty
                  ? headers
                      .filter(h => h.type !== 'group')
                      .map((header, inner_index) => {
                        {
                          return TableFooter({
                            type: header.type,
                            inner_index,
                            header: header,
                            values: values,
                          });
                        }
                      })
                  : null}
                {!isEmpty ? (
                  <td className={clsx('py-3 px-4 sticky right-0 bottom-0 bg-white')}>
                    <span></span>
                  </td>
                ) : null}
              </tr>
            </tfoot>
          }
        </table>
      </div>
      <div className="p-4 flex items-center justify-center">
        <button
          type="button"
          onClick={handleAddRow}
          className="p-4 items-center justify-center gap-2 py-3 text-sm font-medium bg-white text-primary-600 hover:bg-primary-50 transition-colors rounded-md"
        >
          <Icon style="solid" name="plus" className="size-3 text-primary-600" />
          {isEmpty ? 'Add first item' : 'New record'}
        </button>
      </div>
    </div>
  );
};

const TextInputCell = ({
  arrayName,
  rowIndex,
  fieldName,
  control,
  isEditing,
  inputType,
  displayValue,
}: {
  arrayName: string;
  rowIndex: number;
  fieldName: string;
  control: Control<FieldValues>;
  isEditing: boolean;
  inputType: string;
  displayValue: any;
}) => {
  const cellName = `${arrayName}.${rowIndex}.${fieldName}`;

  const { getValues } = useFormContext();

  const {
    field,
    fieldState: { error },
  } = useController({ name: cellName, control });

  const defaultValue = getValues(cellName);

  return (
    <div>
      {isEditing ? (
        <Input type={inputType} {...field} />
      ) : (
        <div>{displayValue ?? defaultValue}</div>
      )}
      {error ? <div className="mt-1 text-sm text-danger">{error.message}</div> : null}
    </div>
  );
};

const TableCell = ({ type, name, index, editIndex, value, header, control }: TableCellProps) => {
  const cellName = `${name}.${index}.${header.name}`;
  const {
    field,
    fieldState: { error },
  } = useController({ name: cellName, control });
  return (
    <div>
      {editIndex === index ? <Input type={type} {...field} /> : <div>{value}</div>}
      {error && <div className="mt-1 text-sm text-danger">{error?.message}</div>}
    </div>
  );
};

interface TableFooterProps {
  type: string;
  inner_index: number;
  header: any;
  values: Record<string, any>;
}

const TableFooter = ({ type, inner_index, header, values }: TableFooterProps) => {
  switch (type) {
    case 'text':
      return (
        <td
          key={inner_index}
          className={clsx('py-3 px-4 sticky bottom-0 bg-white', alignClass(header.align))}
        >
          <span className="inline-flex items-center justify-center text-sm font-normal text-gray-400">
            {header.footer ? header.footer(values.map((v: any) => v[header.name])) : ''}
          </span>
        </td>
      );
    case 'number':
      return (
        <td
          key={inner_index}
          className={clsx('py-3 px-4 sticky bottom-0 bg-white', alignClass(header.align))}
        >
          <span className="inline-flex items-center justify-center text-sm font-normal text-gray-400">
            {header.footer ? header.footer(values.map((v: any) => toNumber(v[header.name]))) : ''}
          </span>
        </td>
      );
    case 'group':
      return null;
    default:
      return (
        <td key={inner_index} className={clsx('py-3 px-4 sticky bottom-0 right-0 bg-white')}></td>
      );
  }
};

interface TableBodyProps {
  type: string;
  arrayName: string;
  header: any;
  row: Record<string, ant>;
  rows: Record<string, any>[];
  rowIndex: number;
  inner_index: number;
  fieldName: string;
  editIndex: number | undefined;
  control: any;
  outScopeFields: Record<string, any>;
  displayValue: any;
}

const TableBody = ({
  type,
  header,
  row,
  rows,
  rowIndex,
  arrayName,
  editIndex,
  control,
  inner_index,
  fieldName,
  outScopeFields,
  displayValue,
}: TableBodyProps) => {
  switch (type) {
    case 'text': {
      return (
        <td
          key={inner_index}
          className={clsx(
            'py-3 px-4 border-b border-neutral-3 whitespace-nowrap truncate',
            alignClass(header.align),
            header.className,
          )}
        >
          <span
            className="items-center justify-center text-sm font-medium truncate text-gray-600 w-full"
            title={
              header.body
                ? header.body(rows[rowIndex][header.name], outScopeFields)
                : (rows[rowIndex][header.name] ?? '')
            }
          >
            {header.body ? header.body(rows[rowIndex][header.name]) : rows[rowIndex][header.name]}
          </span>
        </td>
      );
    }
    case 'input-text': {
      return (
        <td
          key={inner_index}
          className={clsx(
            'py-3 px-4 truncate border-b border-neutral-3 ',
            alignClass(header.align),
            header.className,
          )}
          title={rows[rowIndex][header.name] ?? ''}
        >
          <TextInputCell
            arrayName={arrayName}
            rowIndex={rowIndex}
            fieldName={fieldName}
            control={control}
            isEditing={editIndex === rowIndex}
            inputType="text"
            displayValue={displayValue}
          />
        </td>
      );
    }
    case 'number': {
      return (
        <td
          key={inner_index}
          className={clsx(
            'py-3 px-4 truncate border-b border-neutral-3 ',
            alignClass(header.align),
            header.className,
          )}
          title={rows[rowIndex][header.name] ?? ''}
        >
          <TableCell
            type={'number'}
            name={fieldName}
            index={rowIndex}
            editIndex={editIndex}
            value={rows[rowIndex][header.name]}
            header={header}
            control={control}
          />
        </td>
      );
    }
    case 'group':
      return null;
    case 'row-number':
      return (
        <td
          key={inner_index}
          className={clsx(
            'py-3 px-4 whitespace-nowrap truncate border-b border-neutral-3 ',
            header.className,
          )}
        >
          <span className="inline-flex items-center w-7 h-7 justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
            {rowIndex + 1}
          </span>
        </td>
      );
    default:
      return null;
  }
};

interface TableHeaderProps {
  type: string;
  headers: any;
  header: any;
  tableValue?: any;
  index: number;
  inner_index?: number;
  fieldName?: string;
  editIndex?: number | undefined;
  control?: any;
}
const TableHeader = ({ type, headers, header, index }: TableHeaderProps) => {
  switch (type) {
    case 'group': {
      return (
        <th
          key={index}
          className={clsx(
            'text-white text-sm font-medium py-3 px-4 truncate sticky top-0 z-20 bg-primary',
            header.className,
            alignClass(header.align),
          )}
          colSpan={
            headers.filter(
              h => 'groupName' in h && h.type !== 'group' && h.groupName === header.groupName,
            ).length
          }
        >
          {header.label}
        </th>
      );
    }
    default: {
      if ('groupName' in header) {
        return null;
      }
      return (
        <th
          key={index}
          className={clsx(
            'text-white text-sm font-medium py-3 px-4 truncate sticky top-0 z-20 bg-primary',
            header.className,
            alignClass(header.align),
          )}
          rowSpan={headers.some(h => h.type === 'group') ? 2 : 1}
        >
          {header.label}
        </th>
      );
    }
  }
};

export default BuildingDetailTable;
