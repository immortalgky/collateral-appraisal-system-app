import type { ListBoxItem } from '@/shared/components';
import { useController, useFormContext, type Control, type FieldValues } from 'react-hook-form';

const DropdownInputCell = ({
  arrayName,
  rowIndex,
  fieldName,
  control,
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

  const { getValues: _getValues } = useFormContext();

  const {
    field: _field,
    fieldState: { error: _error },
  } = useController({ name: cellName, control });

  // TODO: Implement dropdown cell
  return <div />;
};

export default DropdownInputCell;
