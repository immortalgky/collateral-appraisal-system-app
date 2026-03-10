import Icon from '@/shared/components/Icon';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { type FormField } from '@/shared/components/form';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Control,
  type FieldValues,
  useController,
  useFieldArray,
  useFormContext,
} from 'react-hook-form';
import LandTitleInputModal from '../LandTitleInputModal';

interface LandTitleTableProps {
  name: string;
  fields: FormField[];
  showRowNumber?: boolean;
  stickyColumns?: number;
}

interface TableCellProps {
  name: string;
  index: number;
  value: string;
  field: FormField;
  row: Record<string, any>;
  allFields: FormField[];
  control: Control<FieldValues, any, FieldValues>;
}

const LandTitleTable = ({
  name,
  fields,
  showRowNumber,
  stickyColumns = 0,
}: LandTitleTableProps) => {
  const tableFields = fields.filter(f => !('showWhen' in f && f.showWhen));
  const { control, getValues } = useFormContext();
  const { append, remove, update } = useFieldArray({ control, name });
  const values = getValues(name) || [];

  const tableRef = useRef<HTMLTableElement>(null);
  const [stickyOffsets, setStickyOffsets] = useState<number[]>([]);
  const totalSticky = (showRowNumber ? 1 : 0) + stickyColumns;

  const computeOffsets = useCallback(() => {
    if (!tableRef.current || stickyColumns <= 0) return;
    const headerCells = tableRef.current.querySelectorAll('thead th');
    const offsets: number[] = [];
    let cumulative = 0;
    for (let i = 0; i < totalSticky && i < headerCells.length; i++) {
      offsets.push(cumulative);
      cumulative += (headerCells[i] as HTMLElement).offsetWidth;
    }
    setStickyOffsets(offsets);
  }, [stickyColumns, totalSticky]);

  useEffect(() => {
    computeOffsets();
  }, [computeOffsets, values.length]);

  const [modalState, setModalState] = useState<
    { type: 'add' } | { type: 'edit'; index: number } | null
  >(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const handleDeleteRow = (index: number) => {
    setDeleteConfirmIndex(index);
  };

  const confirmDelete = () => {
    if (deleteConfirmIndex !== null) {
      remove(deleteConfirmIndex);
      setDeleteConfirmIndex(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmIndex(null);
  };

  const isEmpty = values.length === 0;

  return (
    <div className="w-full grid">
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-gray-200 rounded-lg bg-gray-50">
          <Icon name="file-lines" style="regular" className="text-3xl text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-500">No land title data</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">Click the button below to add a title</p>
          <button
            type="button"
            onClick={() => setModalState({ type: 'add' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            <Icon style="solid" name="plus" className="size-2.5" />
            Add item
          </button>
        </div>
      ) : (
        <>
          <div className="max-h-60 overflow-auto border border-gray-200 rounded-lg min-w-0">
            <table ref={tableRef} className="table table-zebra table-xs min-w-max">
              <thead>
                <tr>
                  {showRowNumber && (
                    <th
                      className="bg-primary-700 text-white text-xs font-medium py-2 px-3 text-left first:rounded-tl-lg sticky z-10"
                      style={{ left: stickyOffsets[0] ?? 0 }}
                    >
                      #
                    </th>
                  )}
                  {tableFields.map((field, index) => {
                    const stickyIndex = (showRowNumber ? 1 : 0) + index;
                    const isSticky = stickyIndex < totalSticky;
                    return (
                      <th
                        key={index}
                        className={`bg-primary-700 text-white text-xs font-medium py-2 px-3 text-left ${
                          isSticky ? 'sticky z-10' : ''
                        } ${!showRowNumber && index === 0 ? 'first:rounded-tl-lg' : ''}`}
                        style={isSticky ? { left: stickyOffsets[stickyIndex] ?? 0 } : undefined}
                      >
                        {'label' in field ? field.label : field.name}
                      </th>
                    );
                  })}
                  <th className="bg-primary-700 text-white text-xs font-medium py-2 px-3 text-right sticky right-0 w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {values.map((row: Record<string, any>, index: number) => {
                  const rowBg = index % 2 === 1 ? 'bg-base-200' : 'bg-base-100';
                  return (
                    <tr key={index}>
                      {showRowNumber && (
                        <td
                          className={`py-1.5 px-3 sticky z-10 ${rowBg}`}
                          style={{ left: stickyOffsets[0] ?? 0 }}
                        >
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                            {index + 1}
                          </span>
                        </td>
                      )}
                      {tableFields.map((field, innerIndex) => {
                        const stickyIndex = (showRowNumber ? 1 : 0) + innerIndex;
                        const isSticky = stickyIndex < totalSticky;
                        return (
                          <td
                            key={innerIndex}
                            className={`py-1.5 px-3 text-xs ${isSticky ? `sticky z-10 ${rowBg}` : ''}`}
                            style={isSticky ? { left: stickyOffsets[stickyIndex] ?? 0 } : undefined}
                          >
                            <TableCell
                              name={name}
                              index={index}
                              value={row[field.name]}
                              field={field}
                              row={row}
                              allFields={fields}
                              control={control}
                            />
                          </td>
                        );
                      })}
                      <td className={`py-1.5 px-3 sticky right-0 z-10 ${rowBg}`}>
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => setModalState({ type: 'edit', index })}
                            className="w-6 h-6 flex items-center justify-center rounded bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                            title="Edit"
                          >
                            <Icon style="solid" name="pen" className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(index)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                            title="Delete"
                          >
                            <Icon style="solid" name="trash" className="size-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalState({ type: 'add' })}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-primary-600 bg-gray-50 hover:bg-primary-50 transition-colors rounded-b-lg"
            >
              <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                <Icon style="solid" name="plus" className="size-2.5 text-white" />
              </div>
              Add item
            </button>
          </div>
        </>
      )}
      {modalState && (
        <LandTitleInputModal
          fields={fields}
          defaultValues={modalState.type === 'edit' ? values[modalState.index] : undefined}
          onCancel={() => setModalState(null)}
          onSave={data => {
            if (modalState.type === 'add') {
              append(data);
            } else {
              update(modalState.index, data);
            }
            setModalState(null);
          }}
        />
      )}

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
    </div>
  );
};

const TableCell = ({ name, index, value, field, row, allFields, control }: TableCellProps) => {
  const cellName = `${name}.${index}.${field.name}`;
  const {
    fieldState: { error },
  } = useController({ name: cellName, control });

  // Format number values
  if (field.type === 'number-input' && value != null && value !== '') {
    const numValue = typeof value === 'number' ? value : Number(value);
    if (!isNaN(numValue)) {
      const formatted = formatNumber(numValue, field.decimalPlaces ?? 0);
      return (
        <div>
          <div>{formatted}</div>
          {error && <div className="mt-1 text-xs text-danger">{error?.message}</div>}
        </div>
      );
    }
  }

  // Check if field uses parameterGroup (no inline options)
  const hasGroup = 'group' in field && field.group;
  const hasOptions = 'options' in field && field.options;
  const groupFieldTypes = ['dropdown', 'radio-group', 'checkbox-group', 'boolean-toggle', 'string-toggle'];

  if (hasGroup && !hasOptions && groupFieldTypes.includes(field.type)) {
    const dependentField = allFields.find(
      f => 'showWhen' in f && f.showWhen && 'field' in f.showWhen && f.showWhen.field === field.name,
    );
    const depValue = dependentField ? row[dependentField.name] : null;
    return (
      <div>
        <div>
          <ParameterDisplay group={field.group!} code={value} />
          {depValue ? ` - ${depValue}` : ''}
        </div>
        {error && <div className="mt-1 text-xs text-danger">{error?.message}</div>}
      </div>
    );
  }

  // Lookup option label for dropdown/radio-group (use loose equality for boolean values)
  let displayValue = value;
  if (field.type === 'boolean-toggle' && 'options' in field && field.options) {
    displayValue = value ? field.options[1] : field.options[0];
  } else if (
    (field.type === 'dropdown' || field.type === 'radio-group') &&
    'options' in field &&
    field.options
  ) {
    const matched = field.options.find(opt => opt.value == value);
    if (matched) displayValue = matched.label;
  }

  const dependentField = allFields.find(
    f => 'showWhen' in f && f.showWhen && 'field' in f.showWhen && f.showWhen.field === field.name,
  );
  if (dependentField) {
    const depValue = row[dependentField.name];
    if (depValue) displayValue = `${displayValue} - ${depValue}`;
  }

  return (
    <div>
      <div>{displayValue}</div>
      {error && <div className="mt-1 text-xs text-danger">{error?.message}</div>}
    </div>
  );
};

export default LandTitleTable;
