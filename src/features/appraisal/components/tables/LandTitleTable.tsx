import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import { useState } from 'react';
import {
  useController,
  useFieldArray,
  useForm,
  useFormContext,
  type Control,
  type FieldValues,
} from 'react-hook-form';
import LandTitleModal from '../LandTitleModal';

interface LandTitleTableProps {
  name: string;
  headers: LandTitleTableHeader[];
}

type LandTitleTableHeader = LandTitleTableRegularHeader | LandTitleTableRowNumberHeader;

interface LandTitleTableRegularHeader {
  name: string;
  label: string;
  inputType?: string;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const popupForm = useForm();

  const handleConfirmPopup = () => {
    const data = popupForm.getValues();

    const newData: Record<string, any> = {};
    headers.forEach(h => {
      if ('name' in h) {
        newData[h.name] = data[h.name] ?? '';
      }
    });

    if (editIndex !== undefined) {
      update(editIndex, newData);
      setEditIndex(undefined);
    } else {
      append(newData);
    }

    popupForm.reset({});
    setIsModalOpen(false);
  };

  const { getValues, control } = useFormContext();
  const { append, remove, update } = useFieldArray({
    control,
    name: name,
  });
  const values = getValues(name);

  const [editIndex, setEditIndex] = useState<number | undefined>();

  const handleDeleteRow = (index: number) => {
    setEditIndex(undefined);
    remove(index);
  };

  const isEmpty = values.length === 0;

  return (
    <div className="overflow-hidden">
      <table className="table w-full">
        <thead>
          <tr className="bg-primary-700">
            {headers.map((header, index) => (
              <th
                key={index}
                className="text-white text-sm font-medium py-3 px-4 text-left first:rounded-tl-lg"
              >
                {header.label}
              </th>
            ))}
            <th className="text-white text-sm font-medium py-3 px-4 text-right rounded-tr-lg w-24">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isEmpty ? (
            <div></div>
          ) : (
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
                <td className="py-3 px-4">
                  <div className="flex gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditIndex(index);
                        popupForm.reset(values[index]);
                        setIsModalOpen(true);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
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
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="border-t border-gray-100">
        <button
          type="button"
          onClick={() => {
            setEditIndex(undefined);
            popupForm.reset({});
            setIsModalOpen(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary-600 bg-gray-50 hover:bg-primary-50 transition-colors rounded-b-lg"
        >
          <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
            <Icon style="solid" name="plus" className="size-3 text-white" />
          </div>
          Add item
        </button>
      </div>
      {isModalOpen && (
        <LandTitleModal
          headers={headers}
          popupForm={popupForm}
          onCancel={() => setIsModalOpen(false)}
          onConfirm={handleConfirmPopup}
        />
      )}
    </div>
  );
};

const TableCell = ({ name, index, value, header, control }: TableCellProps) => {
  const cellName = `${name}.${index}.${header.name}`;
  const {
    fieldState: { error },
  } = useController({ name: cellName, control });

  return (
    <div>
      <div>{value}</div>
      {error && <div className="mt-1 text-sm text-danger">{error?.message}</div>}
    </div>
  );
};

export default LandTitleTable;
