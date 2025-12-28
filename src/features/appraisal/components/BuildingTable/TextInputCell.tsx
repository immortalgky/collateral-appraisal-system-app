import { Input } from '@headlessui/react';
import { useController, useWatch, type Control, type FieldValues } from 'react-hook-form';

interface TextInputCellProps {
  arrayName: string;
  rowIndex: number;
  fieldName: string;
  control: Control<FieldValues>;
  isEditing: boolean;
  render?: (value: string) => React.ReactNode;
}

const TextInputCell = ({
  arrayName,
  rowIndex,
  fieldName,
  control,
  isEditing,
  render,
}: TextInputCellProps) => {
  const cellName = `${arrayName}.${rowIndex}.${fieldName}`;

  const {
    field,
    fieldState: { error },
  } = useController({ name: cellName, control });

  const defaultValue = useWatch({ name: cellName }) ?? '';

  return (
    <div className="flex py-3 px-4">
      {isEditing ? (
        <Input type={'text'} {...field} />
      ) : render ? (
        render(defaultValue)
      ) : (
        <span>{defaultValue}</span>
      )}
      {error ? <div className="mt-1 text-sm text-danger">{error.message}</div> : null}
    </div>
  );
};

export default TextInputCell;
