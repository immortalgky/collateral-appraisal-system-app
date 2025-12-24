import { NumberInput } from '@/shared/components';
import {
  useController,
  useFormContext,
  useWatch,
  type Control,
  type FieldValues,
} from 'react-hook-form';

interface NumberInputCellProps {
  arrayName: string;
  rowIndex: number;
  fieldName: string;
  control: Control<FieldValues>;
  isEditing: boolean;
  render?: (value: string | number) => React.ReactNode;
  modifier?: (value: number | string | boolean) => string;
}

const NumberInputCell = ({
  arrayName,
  rowIndex,
  fieldName,
  control,
  isEditing,
  render,
  modifier,
}: NumberInputCellProps) => {
  const cellName = `${arrayName}.${rowIndex}.${fieldName}`;

  const {
    field,
    fieldState: { error },
  } = useController({ name: cellName, control });

  const value = useWatch({ name: cellName });

  if (isEditing) {
    return (
      <div>
        <NumberInput type={'number'} {...field} />
        {error ? <div className="mt-1 text-sm text-danger">{error.message}</div> : null}
      </div>
    );
  } else {
    if (value != undefined) {
      if (modifier != undefined) {
        if (render != undefined) {
          return render(modifier(value));
        }
        return (
          <span
            className="items-center justify-center text-sm truncate text-gray-600 w-full"
            title={modifier(value).toString()}
          >
            {modifier(value)}
          </span>
        );
      } else if (render != undefined) {
        return render(value);
      }
      console.log(modifier);
      return (
        <span
          className="items-center justify-center text-sm truncate text-gray-600 w-full"
          title={value}
        >
          {value}
        </span>
      );
    }
  }
};

export default NumberInputCell;
