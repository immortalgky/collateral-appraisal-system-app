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

  return (
    <div>
      <table className="table">
        <thead className="bg-primary">
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="text-neutral-2">
                {header.label}
              </th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {values.map((field: Record<string, any>, index: number) => (
            <tr key={index}>
              {headers.map((header, inner_index) => {
                if ('name' in header) {
                  return (
                    <td key={inner_index}>
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
                  return <td key={inner_index}>{index + 1}</td>;
                }
              })}
              <td className="flex gap-2 justify-end">
                {editIndex === index ? (
                  <button type="button" onClick={() => setEditIndex(undefined)}>
                    <Icon style="solid" name="check" className="text-secondary" />
                  </button>
                ) : (
                  <button type="button" onClick={() => setEditIndex(index)}>
                    <Icon style="solid" name="pen" className="text-secondary" />
                  </button>
                )}
                <button type="button" onClick={() => handleDeleteRow(index)}>
                  <Icon style="solid" name="trash" className="text-danger" />
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={headers.length + 1} className="p-0">
              <button
                type="button"
                onClick={handleAddRow}
                className="w-full flex items-center justify-center m-0 px-0 py-1 bg-neutral-2"
              >
                <div className="bg-success size-6 rounded-full flex items-center justify-center">
                  <Icon style="solid" name="plus" className="text-neutral-2" />
                </div>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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
