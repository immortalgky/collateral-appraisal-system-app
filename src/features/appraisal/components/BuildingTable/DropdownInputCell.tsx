import type { ListBoxItem } from '@/shared/components';
import { useController, useFormContext, type Control, type FieldValues } from 'react-hook-form';

const DropdownInputCell = ({
  arrayName,
  rowIndex,
  fieldName,
  control,
  isEditing,
  inputType,
  displayValue,
}: {
  arrayName: string;
  rowIndex: number;
  fieldName: string;
  control: Control<FieldValues>;
  isEditing: boolean;
  inputType: string;
  displayValue: any;
  options: ListBoxItem[];
}) => {
  const cellName = `${arrayName}.${rowIndex}.${fieldName}`;

  const { getValues } = useFormContext();

  const {
    field,
    fieldState: { error },
  } = useController({ name: cellName, control });

  const defaultValue = getValues(cellName);

  return (
    <div>
      {/* {isEditing ? <Input type={'number'} {...field} /> : <div>{displayValue ?? defaultValue}</div>}
      {error ? <div className="mt-1 text-sm text-danger">{error.message}</div> : null} */}
    </div>
  );
};

export default DropdownInputCell;
