import React, { useRef, useState } from 'react';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import { Dropdown, type ListBoxItem, NumberInput } from '@/shared/components/inputs';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import {
  type Control,
  type FieldValues,
  useController,
  useFieldArray,
  useFormContext,
} from 'react-hook-form';
import { useFormReadOnly } from '@/shared/components/form/context';
import ParameterDisplay from '@/shared/components/ParameterDisplay'; // --- Types ---

// --- Types ---

interface FormTableProps {
  name: string;
  columns: FormTableColumn[];
  sumColumns?: string[];
  totalFieldName?: string;
}

type FormTableColumn = FormTableRegularColumn | FormTableRowNumberColumn;

interface FormTableRegularColumn {
  name: string;
  label: string;
  inputType?: 'text' | 'number' | 'dropdown';
  width?: string;
  align?: 'left' | 'center' | 'right';
  decimalPlaces?: number;
  maxIntegerDigits?: number;
  allowNegative?: boolean;
  maxLength?: number;
  options?: ListBoxItem[];
  group?: string;
}

interface FormTableRowNumberColumn {
  rowNumberColumn: true;
  label: string;
}

// --- Helpers ---

const isRegular = (col: FormTableColumn): col is FormTableRegularColumn => 'name' in col;
const isRowNum = (col: FormTableColumn): col is FormTableRowNumberColumn =>
  'rowNumberColumn' in col;
const fmtNum = (n: number, dp = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const IconBtn = ({
  onClick,
  onMouseDown,
  icon,
  size = 8,
  iconSize = 'size-3.5',
  className,
  title,
}: {
  onClick: () => void;
  onMouseDown?: () => void;
  icon: string;
  size?: 7 | 8;
  iconSize?: string;
  className: string;
  title: string;
}) => (
  <button
    type="button"
    onMouseDown={onMouseDown}
    onClick={onClick}
    title={title}
    className={`${size === 7 ? 'shrink-0 w-6 h-6' : 'w-7 h-7'} flex items-center justify-center rounded-md transition-colors ${className}`}
  >
    <Icon style="solid" name={icon} className={iconSize} />
  </button>
);

// --- TotalCell: the sum column in tfoot ---

const TotalCell = ({
  value,
  calculatedTotal,
  totalFieldName,
  isOverridden,
  isReadOnly,
  onOverride,
  onReset,
  onSetValue,
}: {
  value: number;
  calculatedTotal: number;
  totalFieldName?: string;
  isOverridden: boolean;
  isReadOnly: boolean;
  onOverride: () => void;
  onReset: () => void;
  onSetValue: (v: any) => void;
}) => {
  if (isReadOnly || !totalFieldName) {
    return (
      <span className="text-sm font-semibold text-gray-900 text-right block">
        {fmtNum(totalFieldName ? value : calculatedTotal)}
      </span>
    );
  }
  if (isOverridden) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <NumberInput
            value={value}
            onChange={e => onSetValue(e.target.value)}
            decimalPlaces={2}
            className="!bg-amber-50 !border-amber-300 font-semibold"
          />
          <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px]">
            <Icon style="solid" name="pen" className="size-2" />
          </span>
        </div>
        <IconBtn
          size={7}
          onClick={onReset}
          icon="rotate-left"
          className="bg-primary/10 text-primary hover:bg-primary/20"
          title="Reset to calculated sum"
        />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <NumberInput value={value} disabled decimalPlaces={2} className="font-semibold" />
      <IconBtn
        size={7}
        onClick={onOverride}
        icon="pen"
        className="bg-primary/10 text-primary hover:bg-primary/20"
        title="Override total"
      />
    </div>
  );
};

// --- TableCell ---

const TableCell = ({
  name,
  index,
  editIndex,
  value,
  column,
  control,
}: {
  name: string;
  index: number;
  editIndex: number | undefined;
  value: string;
  column: FormTableRegularColumn;
  control: Control<FieldValues, any, FieldValues>;
}) => {
  const {
    field,
    fieldState: { error },
  } = useController({ name: `${name}.${index}.${column.name}`, control });
  const isNum = column.inputType === 'number';
  const dp = column.decimalPlaces ?? 2;

  const displayValue = (val: unknown): string => {
    if (val == null || val === '') return '-';
    if (column.inputType === 'dropdown' && column.options)
      return column.options.find(o => o.value === val)?.label ?? String(val);
    if (isNum) {
      const n = typeof val === 'string' ? parseFloat(val) : val;
      if (typeof n === 'number' && !isNaN(n)) return fmtNum(n, dp);
    }
    return String(val);
  };

  const input = () => {
    if (isNum)
      return (
        <NumberInput
          {...field}
          decimalPlaces={dp}
          maxIntegerDigits={column.maxIntegerDigits}
          allowNegative={column.allowNegative}
        />
      );
    if (column.inputType === 'dropdown' && (column.options || column.group))
      return (
        <Dropdown
          value={field.value}
          onChange={field.onChange}
          group={column.group}
          options={column.options}
        />
      );
    return <Input type={column.inputType} {...field} maxLength={column.maxLength} />;
  };

  return (
    <div>
      {editIndex === index ? (
        input()
      ) : (
        <div className={isNum ? 'text-right' : 'truncate'}>
          {column.inputType === 'dropdown' && column.group ? (
            <ParameterDisplay group={column.group} code={value} />
          ) : (
            displayValue(value)
          )}
        </div>
      )}
      {error && <div className="mt-1 text-sm text-danger">{error?.message}</div>}
    </div>
  );
};

// --- FormTable ---

const FormTable = ({ name, columns, sumColumns = [], totalFieldName }: FormTableProps) => {
  const { getValues, setValue, control, watch } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const { append, remove } = useFieldArray({ control, name });
  const values = getValues(name);
  const watchedValues = watch(name);
  const [editIndex, setEditIndex] = useState<number | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; index: number | null }>({
    isOpen: false,
    index: null,
  });
  const [blurConfirm, setBlurConfirm] = useState(false);
  const [isOverridden, setIsOverridden] = useState(false);
  const originalValuesRef = useRef<Record<string, any> | null>(null);
  const isNewRowRef = useRef(false);
  const editingRowRef = useRef<HTMLTableRowElement | null>(null);
  const suppressBlurRef = useRef(false);
  const pendingAddRowRef = useRef(false);

  const suppressBlur = () => {
    suppressBlurRef.current = true;
  };
  const withBlurRelease = (fn: () => void) => () => {
    suppressBlurRef.current = false;
    fn();
  };

  const resetEditState = () => {
    originalValuesRef.current = null;
    isNewRowRef.current = false;
    setEditIndex(undefined);
  };

  const handleSaveEdit = () => resetEditState();
  const handleCancelEdit = () => {
    if (editIndex !== undefined) {
      if (isNewRowRef.current) remove(editIndex);
      else if (originalValuesRef.current)
        Object.entries(originalValuesRef.current).forEach(([k, v]) =>
          setValue(`${name}.${editIndex}.${k}`, v),
        );
    }
    resetEditState();
  };

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    }
  };
  const handleRowBlur = (e: React.FocusEvent<HTMLTableRowElement>) => {
    const row = e.currentTarget;
    if (e.relatedTarget && row.contains(e.relatedTarget as Node)) return;
    requestAnimationFrame(() => {
      if (suppressBlurRef.current || row.contains(document.activeElement)) return;
      suppressBlurRef.current = true;
      setBlurConfirm(true);
    });
  };

  const handleBlurContinueEditing = () => {
    setBlurConfirm(false);
    pendingAddRowRef.current = false;
    requestAnimationFrame(() => {
      editingRowRef.current
        ?.querySelector<HTMLElement>('input, select, [role="listbox"], [tabindex]')
        ?.focus();
      suppressBlurRef.current = false;
    });
  };
  const handleBlurDiscard = () => {
    setBlurConfirm(false);
    handleCancelEdit();
    const shouldAdd = pendingAddRowRef.current;
    pendingAddRowRef.current = false;
    suppressBlurRef.current = false;
    if (shouldAdd) setTimeout(() => handleAddRow(), 0);
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    for (const col of columns) if (isRegular(col)) newRow[col.name] = '';
    append(newRow);
    originalValuesRef.current = null;
    isNewRowRef.current = true;
    setEditIndex(getValues(name).length - 1);
  };
  const handleAddRowWithBlurCheck = () => {
    if (editIndex !== undefined) {
      pendingAddRowRef.current = true;
      suppressBlurRef.current = true;
      setBlurConfirm(true);
      return;
    }
    handleAddRow();
  };

  const calcSum = (col: string): number =>
    (watchedValues || values || []).reduce(
      (s: number, r: Record<string, any>) => s + (parseFloat(r?.[col]) || 0),
      0,
    );
  const calculatedTotal = sumColumns.length > 0 ? calcSum(sumColumns[0]) : 0;

  React.useEffect(() => {
    if (totalFieldName && !isOverridden) setValue(totalFieldName, calculatedTotal);
  }, [calculatedTotal, totalFieldName, isOverridden, setValue]);

  const handleResetTotal = () => {
    setIsOverridden(false);
    if (totalFieldName) setValue(totalFieldName, calculatedTotal);
  };

  const isEmpty = values?.length === 0;
  const hasSumRow = sumColumns.length > 0 && !isEmpty;
  const colSpan = isReadOnly ? columns.length : columns.length + 1;
  const editing = (i: number) => editIndex === i;
  const colStyle = (col: FormTableColumn) =>
    isRowNum(col)
      ? { width: '60px' }
      : { width: (col as FormTableRegularColumn).width ?? 'auto', minWidth: '100px' };

  return (
    <div>
      <table className="table w-full table-fixed">
        <thead>
          <tr className="bg-primary/10">
            {columns.map((col, i) => (
              <th
                key={i}
                style={colStyle(col)}
                className={`text-primary text-xs font-semibold py-2 px-3 ${'align' in col && col.align ? `text-${col.align}` : 'text-left'} first:rounded-tl-lg ${isReadOnly && i === columns.length - 1 ? 'rounded-tr-lg' : ''}`}
              >
                {col.label}
              </th>
            ))}
            {!isReadOnly && (
              <th
                className="text-primary text-xs font-semibold py-2 px-3 text-right rounded-tr-lg"
                style={{ width: '80px' }}
              >
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isEmpty ? (
            <tr>
              <td colSpan={colSpan} className="py-4 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon style="regular" name="inbox" className="size-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">No data yet</p>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleAddRowWithBlurCheck}
                      className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                    >
                      <Icon style="solid" name="plus" className="size-3" /> Add First Item
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            values?.map((field: Record<string, any>, i: number) => (
              <tr
                key={i}
                className="hover:bg-gray-50 transition-colors"
                ref={editing(i) ? editingRowRef : undefined}
                onKeyDown={editing(i) ? handleRowKeyDown : undefined}
                onBlur={editing(i) ? handleRowBlur : undefined}
              >
                {columns.map((col, ci) =>
                  isRegular(col) ? (
                    <td key={ci} className="py-1.5 px-3">
                      <TableCell
                        name={name}
                        index={i}
                        editIndex={editIndex}
                        value={field[col.name]}
                        column={col}
                        control={control}
                      />
                    </td>
                  ) : (
                    <td key={ci} className="py-1.5 px-3" style={{ width: '60px' }}>
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {i + 1}
                      </span>
                    </td>
                  ),
                )}
                {!isReadOnly && (
                  <td className="py-1.5 px-3">
                    <div className="flex gap-1 justify-end">
                      {editing(i) ? (
                        <>
                          <IconBtn
                            onMouseDown={suppressBlur}
                            onClick={withBlurRelease(handleSaveEdit)}
                            icon="check"
                            iconSize="size-3.5"
                            className="bg-success-50 text-success-600 hover:bg-success-100"
                            title="Save"
                          />
                          <IconBtn
                            onMouseDown={suppressBlur}
                            onClick={withBlurRelease(handleCancelEdit)}
                            icon="xmark"
                            iconSize="size-3.5"
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                            title="Cancel"
                          />
                        </>
                      ) : (
                        <>
                          <IconBtn
                            onClick={() => {
                              originalValuesRef.current = { ...getValues(`${name}.${i}`) };
                              isNewRowRef.current = false;
                              setEditIndex(i);
                            }}
                            icon="pen"
                            className="bg-primary/10 text-primary hover:bg-primary/20"
                            title="Edit"
                          />
                          <IconBtn
                            onClick={() => setDeleteConfirm({ isOpen: true, index: i })}
                            icon="trash"
                            className="bg-danger-50 text-danger-600 hover:bg-danger-100"
                            title="Delete"
                          />
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
        {hasSumRow && (
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              {(() => {
                let labelRendered = false;
                return columns.map((col, i) => {
                  if (isRegular(col) && sumColumns.includes(col.name)) {
                    const total = totalFieldName
                      ? (watch(totalFieldName) ?? calculatedTotal)
                      : calculatedTotal;
                    return (
                      <td
                        key={i}
                        className={`py-1.5 px-3 ${col.align === 'right' ? 'text-right' : ''}`}
                      >
                        <TotalCell
                          value={total}
                          calculatedTotal={calculatedTotal}
                          totalFieldName={totalFieldName}
                          isOverridden={isOverridden}
                          isReadOnly={isReadOnly}
                          onOverride={() => setIsOverridden(true)}
                          onReset={handleResetTotal}
                          onSetValue={v => totalFieldName && setValue(totalFieldName, v)}
                        />
                      </td>
                    );
                  }
                  if (isRowNum(col)) return <td key={i} className="py-1.5 px-3" />;
                  if (!labelRendered) {
                    labelRendered = true;
                    return (
                      <td key={i} className="py-3 px-4 text-sm font-semibold text-gray-600">
                        <div className="flex items-center gap-2">
                          <Icon style="solid" name="sigma" className="size-4 text-primary" /> Total
                          {isOverridden && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                              Override
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  }
                  return <td key={i} className="py-1.5 px-3" />;
                });
              })()}
              {!isReadOnly && <td className="py-1.5 px-3" />}
            </tr>
          </tfoot>
        )}
      </table>
      {!isEmpty && !isReadOnly && (
        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={handleAddRowWithBlurCheck}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary bg-gray-50 hover:bg-primary/10 transition-colors rounded-b-lg"
          >
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Icon style="solid" name="plus" className="size-2.5 text-white" />
            </div>
            Add row
          </button>
        </div>
      )}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, index: null })}
        onConfirm={() => {
          if (deleteConfirm.index !== null) {
            if (editIndex === deleteConfirm.index) {
              setEditIndex(undefined);
              originalValuesRef.current = null;
            }
            remove(deleteConfirm.index);
            setDeleteConfirm({ isOpen: false, index: null });
          }
        }}
        title="Delete Row"
        message="Are you sure you want to delete this row? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={blurConfirm}
        onClose={handleBlurContinueEditing}
        onConfirm={handleBlurDiscard}
        title="Unsaved Changes"
        message="You have unsaved changes in this row. Would you like to continue editing or discard your changes?"
        confirmText="Discard Changes"
        cancelText="Continue Editing"
        variant="warning"
      />
    </div>
  );
};

export default FormTable;
