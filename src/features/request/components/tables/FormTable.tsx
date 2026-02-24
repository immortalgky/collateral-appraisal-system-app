import React, { useRef, useState } from 'react';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import { Dropdown, type ListBoxItem, NumberInput } from '@/shared/components/inputs';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { type Control, type FieldValues, useController, useFieldArray, useFormContext, } from 'react-hook-form';
import { useFormReadOnly } from '@/shared/components/form/context';

interface FormTableProps {
  name: string;
  headers: FormTableHeader[];
  sumColumns?: string[]; // Column names to sum
  totalFieldName?: string; // Field name to store/read the total (makes it editable)
}

type FormTableHeader = FormTableRegularHeader | FormTableRowNumberHeader;

interface FormTableRegularHeader {
  name: string;
  label: string;
  inputType?: 'text' | 'number' | 'dropdown';
  width?: string; // Optional fixed width like '150px' or '20%'
  align?: 'left' | 'center' | 'right';
  decimalPlaces?: number; // For number inputs (default: 2)
  options?: ListBoxItem[]; // For dropdown input type
  group?: string; // Optional group for dropdown options
}

interface FormTableRowNumberHeader {
  rowNumberColumn: true;
  label: string;
}

interface TableCellProps {
  name: string;
  index: number;
  editIndex: number | undefined;
  value: string;
  header: FormTableRegularHeader;
  control: Control<FieldValues, any, FieldValues>;
}

const FormTable = ({ name, headers, sumColumns = [], totalFieldName }: FormTableProps) => {
  const { getValues, setValue, control, watch } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const { append, remove } = useFieldArray({
    control,
    name: name,
  });
  const values = getValues(name);
  const watchedValues = watch(name); // Watch for changes to recalculate
  const [editIndex, setEditIndex] = useState<number | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; index: number | null }>({
    isOpen: false,
    index: null,
  });
  const [isOverridden, setIsOverridden] = useState(false);
  const originalValuesRef = useRef<Record<string, any> | null>(null);
  const isNewRowRef = useRef(false); // Track if current edit is a new row

  const handleDeleteRow = (index: number) => {
    setDeleteConfirm({ isOpen: true, index });
  };

  const confirmDelete = () => {
    if (deleteConfirm.index !== null) {
      if (editIndex === deleteConfirm.index) {
        setEditIndex(undefined);
        originalValuesRef.current = null;
      }
      remove(deleteConfirm.index);
      setDeleteConfirm({ isOpen: false, index: null });
    }
  };

  const handleStartEdit = (index: number) => {
    // Store original values before editing
    originalValuesRef.current = { ...getValues(`${name}.${index}`) };
    isNewRowRef.current = false;
    setEditIndex(index);
  };

  const handleSaveEdit = () => {
    originalValuesRef.current = null;
    isNewRowRef.current = false;
    setEditIndex(undefined);
  };

  const handleCancelEdit = () => {
    if (editIndex !== undefined) {
      if (isNewRowRef.current) {
        // Remove the new row if cancel is clicked
        remove(editIndex);
      } else if (originalValuesRef.current) {
        // Restore original values for existing rows
        const originalValues = originalValuesRef.current;
        for (const key of Object.keys(originalValues)) {
          setValue(`${name}.${editIndex}.${key}`, originalValues[key]);
        }
      }
    }
    originalValuesRef.current = null;
    isNewRowRef.current = false;
    setEditIndex(undefined);
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    for (const header of headers) {
      if ('name' in header) {
        newRow[header.name] = ''; // TODO: Get default value from zod
      }
    }
    append(newRow);
    const newIndex = getValues(name).length - 1;
    // Mark as new row so cancel will remove it
    originalValuesRef.current = null;
    isNewRowRef.current = true;
    setEditIndex(newIndex);
  };

  // Calculate column sums using watched values for real-time updates
  const calculateSum = (columnName: string): number => {
    const currentValues = watchedValues || values || [];
    return currentValues.reduce((sum: number, row: Record<string, any>) => {
      const value = parseFloat(row?.[columnName]) || 0;
      return sum + value;
    }, 0);
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Auto-update total when not overridden
  const calculatedTotal = sumColumns.length > 0 ? calculateSum(sumColumns[0]) : 0;

  // Effect to auto-update total field when values change (if not overridden)
  React.useEffect(() => {
    if (totalFieldName && !isOverridden) {
      setValue(totalFieldName, calculatedTotal);
    }
  }, [calculatedTotal, totalFieldName, isOverridden, setValue]);

  const handleEnableOverride = () => {
    setIsOverridden(true);
  };

  const handleResetTotal = () => {
    setIsOverridden(false);
    if (totalFieldName) setValue(totalFieldName, calculatedTotal);
  };

  const isEmpty = values?.length === 0;
  const hasSumRow = sumColumns.length > 0 && !isEmpty;

  return (
    <div>
      <table className="table w-full table-fixed">
        <thead>
          <tr className="bg-primary/10">
            {headers.map((header, index) => (
              <th
                key={index}
                className={`text-primary text-sm font-semibold py-3 px-4 ${'align' in header && header.align ? `text-${header.align}` : 'text-left'} first:rounded-tl-lg ${isReadOnly && index === headers.length - 1 ? 'rounded-tr-lg' : ''}`}
                style={
                  'rowNumberColumn' in header
                    ? { width: '60px' }
                    : { width: 'width' in header ? header.width : 'auto', minWidth: '120px' }
                }
              >
                {header.label}
              </th>
            ))}
            {!isReadOnly && (
              <th
                className="text-primary text-sm font-semibold py-3 px-4 text-right rounded-tr-lg"
                style={{ width: '100px' }}
              >
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isEmpty ? (
            <tr>
              <td
                colSpan={isReadOnly ? headers.length : headers.length + 1}
                className="py-8 text-center"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon style="regular" name="inbox" className="size-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No data yet</p>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      <Icon style="solid" name="plus" className="size-4" />
                      Add First Item
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            values?.map((field: Record<string, any>, index: number) => (
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
                        />
                      </td>
                    );
                  } else {
                    return (
                      <td key={inner_index} className="py-3 px-4" style={{ width: '60px' }}>
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                          {index + 1}
                        </span>
                      </td>
                    );
                  }
                })}
                {!isReadOnly && (
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end">
                      {editIndex === index ? (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-colors"
                            title="Save"
                          >
                            <Icon style="solid" name="check" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            title="Cancel"
                          >
                            <Icon style="solid" name="xmark" className="size-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(index)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Edit"
                          >
                            <Icon style="solid" name="pen" className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(index)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                            title="Delete"
                          >
                            <Icon style="solid" name="trash" className="size-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
        {/* Sum Row */}
        {hasSumRow && (
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              {(() => {
                let hasRenderedTotalLabel = false;
                return headers.map((header, index) => {
                  if ('name' in header && sumColumns.includes(header.name)) {
                    const currentTotal = totalFieldName
                      ? (watch(totalFieldName) ?? calculatedTotal)
                      : calculatedTotal;
                    const alignClass =
                      'align' in header && header.align === 'right' ? 'text-right' : '';
                    return (
                      <td key={index} className={`py-3 px-4 ${alignClass}`}>
                        {isReadOnly ? (
                          <span className="text-sm font-semibold text-gray-900 text-right block">
                            {formatNumber(currentTotal)}
                          </span>
                        ) : totalFieldName ? (
                          <div className="flex items-center gap-2">
                            {isOverridden ? (
                              <>
                                <div className="relative flex-1">
                                  <NumberInput
                                    value={currentTotal}
                                    onChange={e => {
                                      if (totalFieldName) setValue(totalFieldName, e.target.value);
                                    }}
                                    decimalPlaces={2}
                                    className="!bg-amber-50 !border-amber-300 font-semibold"
                                  />
                                  <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px]">
                                    <Icon style="solid" name="pen" className="size-2" />
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleResetTotal}
                                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                  title="Reset to calculated sum"
                                >
                                  <Icon style="solid" name="rotate-left" className="size-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <NumberInput
                                  value={currentTotal}
                                  disabled
                                  decimalPlaces={2}
                                  className="font-semibold"
                                />
                                <button
                                  type="button"
                                  onClick={handleEnableOverride}
                                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                  title="Override total"
                                >
                                  <Icon style="solid" name="pen" className="size-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-gray-900 block">
                            {formatNumber(calculatedTotal)}
                          </span>
                        )}
                      </td>
                    );
                  } else if ('rowNumberColumn' in header) {
                    return <td key={index} className="py-3 px-4" />;
                  } else if (!hasRenderedTotalLabel) {
                    hasRenderedTotalLabel = true;
                    return (
                      <td key={index} className="py-3 px-4 text-sm font-semibold text-gray-600">
                        <div className="flex items-center gap-2">
                          <Icon style="solid" name="sigma" className="size-4 text-primary" />
                          Total
                          {isOverridden && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                              Override
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  } else {
                    return <td key={index} className="py-3 px-4" />;
                  }
                });
              })()}
              {!isReadOnly && <td className="py-3 px-4" />}
            </tr>
          </tfoot>
        )}
      </table>
      {!isEmpty && !isReadOnly && (
        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary bg-gray-50 hover:bg-primary/10 transition-colors rounded-b-lg"
          >
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Icon style="solid" name="plus" className="size-3 text-white" />
            </div>
            Add row
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, index: null })}
        onConfirm={confirmDelete}
        title="Delete Row"
        message="Are you sure you want to delete this row? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

const TableCell = ({ name, index, editIndex, value, header, control }: TableCellProps) => {
  const cellName = `${name}.${index}.${header.name}`;
  const {
    field,
    fieldState: { error },
  } = useController({ name: cellName, control });

  const isNumber = header.inputType === 'number';
  const decimalPlaces = header.decimalPlaces ?? 2;

  // Format value for display
  const formatDisplayValue = (val: unknown): string => {
    if (val === null || val === undefined || val === '') return '-';

    // For dropdown, show label instead of value
    if (header.inputType === 'dropdown' && header.options) {
      const option = header.options.find(opt => opt.value === val);
      return option?.label ?? String(val);
    }

    if (isNumber) {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (typeof num === 'number' && !isNaN(num)) {
        return num.toLocaleString('en-US', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        });
      }
    }
    return String(val);
  };

  const renderInput = () => {
    if (isNumber) {
      return <NumberInput {...field} decimalPlaces={decimalPlaces} />;
    }
    if (header.inputType === 'dropdown' && (header.options || header.group)) {
      return (
        <Dropdown
          value={field.value}
          onChange={field.onChange}
          group={header.group}
          options={header.options}
        />
      );
    }
    return <Input type={header.inputType} {...field} />;
  };

  return (
    <div>
      {editIndex === index ? (
        renderInput()
      ) : (
        <div className={isNumber ? 'text-right' : 'truncate'}>{formatDisplayValue(value)}</div>
      )}
      {error && <div className="mt-1 text-sm text-danger">{error?.message}</div>}
    </div>
  );
};

export default FormTable;
