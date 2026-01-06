import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useDerivedFieldArray, type ComputeCtx, type DerivedRule } from './useDerivedFieldArray';
import TextInputCell from './TextInputCell';
import NumberInputCell from './NumberInputCell';
import RowNumberCell from './RowNumberCell';
import DisplayCell from './DisplayCell';
import DerivedCell from './DerivedCell';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

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
  readonlyFields?: string[];
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
  tooltip?: string;
  isComputed?: boolean;
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

export function toNumber(v: string) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// function isGroupHeader(h: FormTableHeader): h is FormTableRowGroupHeader {
//   return h.type === 'group';
// }

const BuildingDetailTable = ({
  name,
  headers,
  getEditingStatus,
  defaultValue,
  outScopeFields = {},
  disableSaveBtn = false,
  disableEditBtn = false,
  disableAddRowBtn = false,
  readonlyFields = [],
}: BuildingDetailProps) => {
  const { getValues, control } = useFormContext();
  const { append, remove } = useFieldArray({
    control,
    name: name,
  });

  // reset state of table
  // const hasGroups = headers.some(isGroupHeader); // Reserved for future use

  const [editIndex, setEditIndex] = useState<number | undefined>();
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const values = getValues(name) || [];

  const rules: DerivedRule[] = useMemo(() => {
    return headers
      .filter(
        (header): header is FormTableDerivedHeader =>
          'compute' in header && 'name' in header && header.compute !== undefined,
      )
      .map((header): DerivedRule => {
        return { targetKey: header.name, compute: header.compute!, normalize: header.normalize };
      });
  }, [headers]);

  useDerivedFieldArray({ arrayName: name, rules, outScopeFields });

  const handleDeleteRow = (index: number) => {
    setDeleteConfirmIndex(index);
  };

  const confirmDelete = () => {
    if (deleteConfirmIndex !== null) {
      setEditIndex(undefined);
      remove(deleteConfirmIndex);
      setDeleteConfirmIndex(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmIndex(null);
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
    handleSave();
    handleEdit((getValues(name) || []).length - 1);
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
    <>
      <div className="w-full max-h-full flex flex-col rounded-lg border border-neutral-3 overflow-clip">
        <div className="w-full h-full overflow-auto">
          <table className="table-fixed w-full h-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-primary-700">
                {headers.map((header, index) => {
                  return TableHeader({ type: header.type, headers, header, index });
                })}
                <th
                  className={clsx(
                    'text-white text-xs font-medium py-2 px-2 text-center w-16 bg-primary sticky top-0 right-0 z-21 border-l border-neutral-3',
                  )}
                  rowSpan={headers.some((h: FormTableHeader) => h.type === 'group') ? 2 : 1}
                ></th>
              </tr>
              {headers.find(h => 'groupName' in h && h.type === 'group') ? (
                <tr className="bg-primary-700">
                  {headers
                    .filter(h => 'groupName' in h && h.type !== 'group')
                    .map((header, index) => (
                      <th
                        key={index}
                        className={clsx(
                          'text-white text-xs font-medium py-1.5 px-2 text-left truncate bg-primary sticky top-0 z-20',
                          header.className,
                          alignClass(header.align),
                        )}
                        title={header.tooltip}
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
                      const h = header as any;
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
                        fieldName: h.name,
                        outScopeFields,
                        value: h.value,
                        render: h.render,
                        modifier: h.modifier,
                        isComputed: h.isComputed,
                        isReadonly: readonlyFields.includes(h.name),
                      });
                    })}
                    <td className="py-1 px-1.5 sticky right-0 z-21 bg-white border-neutral-3 border-l border-b">
                      <div className="flex gap-0.5 justify-center">
                        {editIndex === index ? (
                          canSave ? (
                            <button
                              type="button"
                              onClick={() => handleSave()}
                              className="w-6 h-6 flex items-center justify-center rounded bg-success-50 text-success-600 hover:bg-success-100 transition-colors"
                              title="Save"
                            >
                              <Icon style="solid" name="check" className="size-3" />
                            </button>
                          ) : canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleEdit(index)}
                              className="w-6 h-6 flex items-center justify-center rounded bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                              title="Edit"
                            >
                              <Icon style="solid" name="pen" className="size-2.5" />
                            </button>
                          ) : null
                        ) : canEdit ? (
                          <button
                            type="button"
                            onClick={() => handleEdit(index)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                            title="Edit"
                          >
                            <Icon style="solid" name="pen" className="size-2.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(index)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                          title="Delete"
                        >
                          <Icon style="solid" name="trash" className="size-2.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
            {!isEmpty && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  {headers
                    .filter(
                      (h): h is Exclude<FormTableHeader, { type: 'group' }> => h.type !== 'group',
                    )
                    .map((header, inner_index) => {
                      const h = header as any;
                      return TableFooter({
                        type: header.type,
                        header: header,
                        rows: values,
                        inner_index,
                        footer: h.footer,
                      });
                    })}
                  <td className={clsx('py-1.5 px-2 sticky right-0 bottom-0 bg-gray-50')}>
                    <span></span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Empty State */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-6 px-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <Icon style="solid" name="building" className="size-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-0.5">No depreciation data</h3>
            <p className="text-xs text-gray-500 text-center mb-3 max-w-sm">
              Add building details to calculate depreciation.
            </p>
            {!disableAddRowBtn && (
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors rounded shadow-sm"
              >
                <Icon style="solid" name="plus" className="size-3" />
                Add Building Detail
              </button>
            )}
          </div>
        ) : !disableAddRowBtn ? (
          <div className="p-2 flex items-center justify-center border-t border-neutral-3 bg-gray-50">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors rounded"
            >
              <Icon style="solid" name="plus" className="size-3" />
              Add row
            </button>
          </div>
        ) : null}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmIndex !== null}
        title="Delete Row"
        message="Are you sure you want to delete this row? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onClose={cancelDelete}
        variant="danger"
      />
    </>
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
            'text-white text-xs font-medium py-1.5 px-2 truncate sticky top-0 z-20 bg-primary',
            header.className,
            alignClass(header.align),
          )}
          colSpan={
            headers.filter(
              (h: FormTableHeader) =>
                'groupName' in h && h.type !== 'group' && h.groupName === header.groupName,
            ).length
          }
          title={header.tooltip}
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
            'text-white text-xs font-medium py-1.5 px-2 truncate sticky top-0 z-20 bg-primary',
            header.className,
            alignClass(header.align),
          )}
          rowSpan={headers.some((h: FormTableHeader) => h.type === 'group') ? 2 : 1}
          title={header.tooltip}
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
  row: Record<string, any>;
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
  isComputed?: boolean;
  isReadonly?: boolean;
}

const TableBody = ({
  type,
  header,
  row: _row,
  rows,
  rowIndex,
  arrayName,
  editIndex,
  control,
  inner_index,
  fieldName,
  outScopeFields: _outScopeFields,
  value,
  render,
  modifier,
  isReadonly = false,
}: TableBodyProps) => {
  switch (type) {
    case 'display': {
      return (
        <td
          key={inner_index}
          className={clsx(
            'py-1.5 px-2 border-b border-neutral-3 whitespace-nowrap truncate text-xs',
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
            'py-1.5 px-2 border-b border-neutral-3 whitespace-nowrap truncate text-xs',
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
            'py-1.5 px-2 truncate border-b border-neutral-3 text-xs',
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
            'py-1.5 px-2 truncate border-b border-neutral-3 text-xs',
            alignClass(header.align),
            header.className,
            isReadonly && 'bg-gray-50',
          )}
          title={rows[rowIndex][header.name] ?? ''}
        >
          <NumberInputCell
            arrayName={arrayName}
            rowIndex={rowIndex}
            fieldName={fieldName}
            control={control}
            isEditing={editIndex === rowIndex && !isReadonly}
            render={render}
            modifier={modifier}
            isReadonly={isReadonly}
          />
        </td>
      );
    }
    case 'row-number':
      return (
        <td
          key={inner_index}
          className={clsx(
            'py-1.5 px-2 whitespace-nowrap truncate border-b border-neutral-3 text-xs',
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
  arrayName?: string;
  header: any;
  rows: Record<string, any>[];
  inner_index: number;
  value?: any;
  modifier?: (v: string | number | boolean) => string | number | boolean;
  footer?: (value: any) => any;
}

const TableFooter = ({ type, header, rows, inner_index, footer }: TableFooterProps) => {
  switch (type) {
    case 'derived':
      return (
        <td
          key={inner_index}
          className={clsx('py-1.5 px-2 sticky bottom-0 ', alignClass(header.align))}
        >
          <span className="inline-flex items-center justify-center text-xs font-medium">
            {footer ? footer({ rows }) : ''}
          </span>
        </td>
      );
    case 'display':
      return (
        <td
          key={inner_index}
          className={clsx('py-1.5 px-2 sticky bottom-0 ', alignClass(header.align))}
        >
          <span className="inline-flex items-center justify-center text-xs font-normal text-gray-400">
            {footer
              ? footer(rows.map((v: Record<string, string | number | boolean>) => v[header.name]))
              : ''}
          </span>
        </td>
      );
    case 'input-number':
      return (
        <td
          key={inner_index}
          className={clsx('py-1.5 px-2 sticky bottom-0 ', alignClass(header.align))}
        >
          <span className="inline-flex items-center justify-center text-xs font-normal text-gray-400">
            {footer ? footer(rows) : ''}
          </span>
        </td>
      );
    case 'input-text':
      return (
        <td
          key={inner_index}
          className={clsx('py-1.5 px-2 sticky bottom-0 ', alignClass(header.align))}
        >
          <span className="inline-flex items-center justify-center text-xs font-normal text-gray-400">
            {footer ? footer(rows.map((v: Record<string, string>) => v[header.name])) : ''}
          </span>
        </td>
      );
    case 'group':
      return null;
    default:
      return <td key={inner_index} className={clsx('py-1.5 px-2 sticky bottom-0 right-0 ')}></td>;
  }
};
export default BuildingDetailTable;
