import { Icon, Input, type ListBoxItem } from '@/shared/components';
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
import { useDerivedFieldArray, type ComputeCtx, type DerivedRule } from './useDerivedFieldArray';
import TextInputCell from './TextInputCell';
import NumberInputCell from './NumberInputCell';
import RowNumberCell from './RowNumberCell';
import DisplayCell from './DisplayCell';
import DerivedCell from './DerivedCell';

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
  disableAddRowBtn?: boolean;
}

export type FormTableHeader =
  | FormTableDerivedHeader
  | FormTableRowTextInputHeader
  | FormTableRowNumberInputHeader
  | FormTableRowGroupHeader
  | FormTableRowRunNumberHeader
  | FormTableDisplayHeader;

type HeaderType =
  | 'general'
  | 'display'
  | 'derived'
  | 'input-text'
  | 'input-number'
  | 'input-dropdown' // [x]
  | 'row-number'
  | 'group' // [x]
  | 'component'; // [x]

interface BaseHeader {
  type: HeaderType;
  headerName: string;
  align?: Align;
  isStickyRight?: boolean;
  className?: string;
  groupName?: string;
}

interface FormTableDerivedHeader extends BaseHeader {
  type: 'derived';
  name: string;

  render?: (ctx: { value: any; row: any; rowIndex: number }) => React.ReactNode; // customize view rendering (optional)

  compute?: (ctx: ComputeCtx) => number;
  normalize?: (v: number) => number;
  modifier?: (v: string) => string;

  footer?: (ctx: { rows: any[] }) => React.ReactNode; // footer aggregation / rendering
}

interface FormTableDisplayHeader extends BaseHeader {
  type: 'display';
  value: string;
  render?: (value: any) => React.ReactNode;
}

interface FormTableRowGroupHeader extends BaseHeader {
  type: 'group';
}

interface FormTableRowTextInputHeader extends BaseHeader {
  type: 'input-text';
  name: string;

  render?: (value: string) => React.ReactNode;
  modifier?: (v: string) => string;

  footer?: (values: string[]) => React.ReactNode;
}

interface FormTableRowNumberInputHeader extends BaseHeader {
  type: 'input-number';
  name: string;

  render?: (value: number) => React.ReactNode;

  compute?: (ctx: ComputeCtx) => number;
  normalize?: (v: number) => number;

  footer?: (values: number[]) => React.ReactNode;
}

interface FormTableRowRunNumberHeader extends BaseHeader {
  type: 'row-number';
  rowNumberColumn: boolean;
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
      .filter(h => 'compute' in h && h.name != undefined)
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
                  'text-white text-sm font-medium py-3 px-4 text-right w-24 bg-primary sticky top-0 right-0 z-30 ',
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
                      {header.headerName}
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
                      header: header,
                      rows: values,
                      row: field,
                      rowIndex: index,
                      arrayName: name,
                      editIndex: editIndex,
                      control: control,
                      inner_index: inner_index,
                      fieldName: header.name,
                      outScopeFields,
                      value: header.value,
                      render: header.render,
                      modifier: header.modifier,
                    });
                  })}
                  <td className="py-3 px-4 sticky right-0 z-20 bg-white ">
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
                            arrayName: name,
                            rows: values,
                            inner_index,
                            header: header,
                            values: values,
                            render: header.footer,
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
          {header.headerName}
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
          {header.headerName}
        </th>
      );
    }
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
  outScopeFields?: Record<string, any>;
  value: any;
  render?: (value: number | string | boolean) => React.ReactNode;
  modifier?: (value: number | string | boolean) => number | string | boolean;
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
  value,
  render,
  modifier,
}: TableBodyProps) => {
  switch (type) {
    case 'display': {
      return (
        <td
          key={inner_index}
          className={clsx(
            'py-3 px-4 border-b border-neutral-3 whitespace-nowrap truncate',
            alignClass(header.align),
            header.className,
          )}
        >
          <DisplayCell isEditing={editIndex === rowIndex} value={value} render={render} />
        </td>
      );
    }
    case 'derived': {
      return (
        <td
          key={inner_index}
          className={clsx(
            'py-3 px-4 border-b border-neutral-3 whitespace-nowrap truncate',
            alignClass(header.align),
            header.className,
          )}
        >
          <DerivedCell
            arrayName={arrayName}
            rowIndex={rowIndex}
            fieldName={fieldName}
            control={control}
            isEditing={editIndex === rowIndex}
            render={render}
            modifier={modifier}
          />
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
            render={render}
          />
        </td>
      );
    }
    case 'input-number': {
      return (
        <td
          key={inner_index}
          className={clsx(
            'py-3 px-4 truncate border-b border-neutral-3',
            alignClass(header.align),
            header.className,
          )}
          title={rows[rowIndex][header.name] ?? ''}
        >
          <NumberInputCell
            arrayName={arrayName}
            rowIndex={rowIndex}
            fieldName={fieldName}
            control={control}
            isEditing={editIndex === rowIndex}
            render={render}
            modifier={modifier}
          />
        </td>
      );
    }
    case 'row-number':
      return (
        <td
          key={inner_index}
          className={clsx(
            'py-3 px-4 whitespace-nowrap truncate border-b border-neutral-3 ',
            header.className,
          )}
        >
          <RowNumberCell rowIndex={rowIndex} />
        </td>
      );
    default:
      return null;
  }
};

interface TableFooterProps {
  type: string;
  arrayName: string;
  header: any;
  rows: Record<string, any>[];
  inner_index: number;
  fieldName: string;
  editIndex: number | undefined;
  outScopeFields?: Record<string, any>;
  render?: (value: any) => React.ReactNode;
  modifier?: (v: string | number | boolean) => string | number | boolean;
}

const TableFooter = ({
  type,
  arrayName,
  header,
  rows,
  inner_index,
  fieldName,
  outScopeFields,
  value,
  modifier,
}: TableFooterProps) => {
  switch (type) {
    case 'derived':
      return (
        <td
          key={inner_index}
          className={clsx('py-3 px-4 sticky bottom-0 bg-white', alignClass(header.align))}
        >
          <span className="inline-flex items-center justify-center text-sm font-normal text-gray-400">
            {modifier ? modifier(rows.map((v: any) => v[header.name]).toString()) : ''}
          </span>
        </td>
      );
    case 'display':
      return (
        <td
          key={inner_index}
          className={clsx('py-3 px-4 sticky bottom-0 bg-white', alignClass(header.align))}
        >
          <span className="inline-flex items-center justify-center text-sm font-normal text-gray-400">
            {modifier ? modifier(rows.map((v: any) => v[header.name]).toString()) : ''}
          </span>
        </td>
      );
    case 'input-number':
      return (
        <td
          key={inner_index}
          className={clsx('py-3 px-4 sticky bottom-0 bg-white', alignClass(header.align))}
        >
          <span className="inline-flex items-center justify-center text-sm font-normal text-gray-400">
            {modifier
              ? modifier(
                  rows
                    .map((v: Record<string, string | number>) => toNumber(v[header.name]))
                    .toString(),
                )
              : ''}
          </span>
        </td>
      );
    case 'input-text':
      return (
        <td
          key={inner_index}
          className={clsx('py-3 px-4 sticky bottom-0 bg-white', alignClass(header.align))}
        >
          <span className="inline-flex items-center justify-center text-sm font-normal text-gray-400">
            {modifier
              ? modifier(rows.map((v: Record<string, string>) => v[header.name]).toString())
              : ''}
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
export default BuildingDetailTable;
