import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import { useState } from 'react';
import {
  useController,
  useFieldArray,
  useFormContext,
  type Control,
  type FieldValues,
} from 'react-hook-form';

interface FormTableProps {
  name: string;
  headers: FormTableHeader[];
}

type FormTableHeader = FormTableRegularHeader | FormTableRowNumberHeader;

interface FormTableRegularHeader {
  name: string;
  label: string;
  inputType?: string;
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

// TODO: Find and add unique key
const FormTable = ({ name, headers }: FormTableProps) => {
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
    append(newRow);
    setEditIndex(getValues(name).length - 1);
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
            <tr>
              <td colSpan={headers.length + 1} className="py-8 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon style="regular" name="inbox" className="size-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No data yet</p>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <Icon style="solid" name="plus" className="size-3.5" />
                    Add first item
                  </button>
                </div>
              </td>
            </tr>
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
                    {editIndex === index ? (
                      <button
                        type="button"
                        onClick={() => setEditIndex(undefined)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-colors"
                        title="Save"
                      >
                        <Icon style="solid" name="check" className="size-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditIndex(index)}
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
            ))
          )}
        </tbody>
      </table>
      {!isEmpty && (
        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary-600 bg-gray-50 hover:bg-primary-50 transition-colors rounded-b-lg"
          >
            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
              <Icon style="solid" name="plus" className="size-3 text-white" />
            </div>
            Add row
          </button>
        </div>
      )}
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

export default FormTable;
