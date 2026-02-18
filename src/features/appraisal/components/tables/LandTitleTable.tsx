import Icon from '@/shared/components/Icon';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useState } from 'react';
import {
  useController,
  useFieldArray,
  useForm,
  useFormContext,
  type Control,
  type FieldValues,
} from 'react-hook-form';
import LandTitleInputModal from '../LandTitleInputModal';

interface LandTitleTableProps {
  name: string;
  headers: LandTitleTableHeader[];
}

type LandTitleTableHeader = LandTitleTableRegularHeader | LandTitleTableRowNumberHeader;

interface LandTitleTableRegularHeader {
  name: string;
  label: string;
  type?: 'text-input' | 'number-input' | 'dropdown' | 'radio-group' | 'date-input';
  disabled?: boolean;
  colSpan?: number;
  options?: { value: any; label: string }[];
  required?: boolean;
  orientation?: 'horizontal' | 'vertical';
  decimalPlace?: number;
}

interface LandTitleTableRowNumberHeader {
  rowNumberColumn: true;
  label: string;
}

interface TableCellProps {
  name: string;
  index: number;
  editIndex: number | undefined;
  value: string;
  header: LandTitleTableRegularHeader;
  control: Control<FieldValues, any, FieldValues>;
}

// TODO: Find and add unique key
const LandTitleTable = ({ name, headers }: LandTitleTableProps) => {
  const { control, getValues } = useFormContext();

  const { append, remove, update } = useFieldArray({ control, name });
  const values = getValues(name) || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const editForm = useForm();
  const addForm = useForm();

  const handleAddSave = () => {
    const data = addForm.getValues();
    append(data);
    addForm.reset({});
    setIsAddOpen(false);
  };

  const handleEditSave = () => {
    const data = editForm.getValues();
    update(editIndex!, data);
    setEditIndex(null);
    setIsEditOpen(false);
  };

  const handleEditOpen = (index: number) => {
    setEditIndex(index);
    editForm.reset(values[index]);
    setIsEditOpen(true);
  };

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
            onClick={() => {
              addForm.reset({});
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            <Icon style="solid" name="plus" className="size-2.5" />
            Add item
          </button>
        </div>
      ) : (
        <>
          <div className="max-h-60 overflow-auto border border-gray-200 rounded-lg min-w-0">
            <table className="table table-zebra table-xs min-w-max">
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className={`bg-primary-700 text-white text-xs font-medium py-2 px-3 text-left ${
                        index === 0 ? 'first:rounded-tl-lg sticky left-0 z-10' : ''
                      }`}
                    >
                      {header.label}
                    </th>
                  ))}
                  <th
                    className="bg-primary-700 text-white text-xs font-medium py-2 px-3 text-right sticky right-0 w-20"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {values.map((field: Record<string, any>, index: number) => (
                  <tr key={index}>
                    {headers.map((header, inner_index) => {
                      if ('name' in header) {
                        return (
                          <td
                            key={inner_index}
                            className={`py-1.5 px-3 text-xs ${inner_index === 0 ? 'sticky left-0 z-10 bg-inherit' : ''}`}
                          >
                            <TableCell
                              name={name}
                              index={index}
                              value={field[header.name]}
                              header={header}
                              control={control}
                              editIndex={undefined}
                            />
                          </td>
                        );
                      } else {
                        return (
                          <td
                            key={inner_index}
                            className={`py-1.5 px-3 ${inner_index === 0 ? 'sticky left-0 z-10 bg-inherit' : ''}`}
                          >
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                              {index + 1}
                            </span>
                          </td>
                        );
                      }
                    })}
                    <td className="py-1.5 px-3 sticky right-0 z-10 bg-inherit">
                      <div className="flex gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => handleEditOpen(index)}
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
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                addForm.reset({});
                setIsAddOpen(true);
              }}
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
      {isAddOpen && (
        <LandTitleInputModal
          headers={headers.filter((h): h is LandTitleTableRegularHeader => 'name' in h)}
          popupForm={addForm}
          onCancel={() => setIsAddOpen(false)}
          onConfirm={handleAddSave}
          isEdit={false}
        />
      )}
      {isEditOpen && (
        <LandTitleInputModal
          headers={headers.filter((h): h is LandTitleTableRegularHeader => 'name' in h)}
          popupForm={editForm}
          onCancel={() => setIsEditOpen(false)}
          onConfirm={handleEditSave}
          isEdit={true}
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

const TableCell = ({ name, index, value, header, control }: TableCellProps) => {
  const cellName = `${name}.${index}.${header.name}`;
  const {
    fieldState: { error },
  } = useController({ name: cellName, control });

  // Format number values
  if (header.type === 'number-input' && value != null && value !== '') {
    const numValue = typeof value === 'number' ? value : Number(value);
    if (!isNaN(numValue)) {
      const formatted = formatNumber(numValue, header.decimalPlace ?? 0);
      return (
        <div>
          <div>{formatted}</div>
          {error && <div className="mt-1 text-xs text-danger">{error?.message}</div>}
        </div>
      );
    }
  }

  // Lookup option label (use loose equality for boolean values like true vs "true")
  // eslint-disable-next-line eqeqeq
  const label = header?.options?.find((opt) => opt.value == value)?.label ?? value;

  return (
    <div>
      <div>{label}</div>
      {error && <div className="mt-1 text-xs text-danger">{error?.message}</div>}
    </div>
  );
};

export default LandTitleTable;
