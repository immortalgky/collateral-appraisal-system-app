import { Icon, NumberInput } from '@/shared/components';
import { useController, useWatch, type Control, type FieldValues } from 'react-hook-form';

interface NumberInputCellProps {
  arrayName: string;
  rowIndex: number;
  fieldName: string;
  control: Control<FieldValues>;
  isEditing: boolean;
  render?: (value: string | number | boolean) => React.ReactNode;
  modifier?: (value: number | string | boolean) => string | number | boolean;
  isReadonly?: boolean;
}

const NumberInputCell = ({
  arrayName,
  rowIndex,
  fieldName,
  control,
  isEditing,
  render,
  modifier,
  isReadonly = false,
}: NumberInputCellProps) => {
  const cellName = `${arrayName}.${rowIndex}.${fieldName}`;

  const {
    field,
    fieldState: { error },
  } = useController({ name: cellName, control });

  const value = useWatch({ name: cellName });

  // Readonly display - shows a locked indicator
  if (isReadonly) {
    const displayValue = modifier ? modifier(value ?? 0) : (value ?? 0);
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-gray-600 w-full"
        title={`${displayValue} (auto-filled)`}
      >
        <Icon style="solid" name="lock" className="size-2.5 text-gray-400 shrink-0" />
        <span className="truncate">{displayValue}</span>
      </span>
    );
  }

  if (isEditing) {
    return (
      <div>
        <NumberInput {...field} />
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
            className="items-center justify-center text-xs truncate text-gray-600 w-full"
            title={modifier(value).toString()}
          >
            {modifier(value)}
          </span>
        );
      } else if (render != undefined) {
        return render(value);
      }
      return (
        <span
          className="items-center justify-center text-xs truncate text-gray-600 w-full"
          title={value}
        >
          {value}
        </span>
      );
    }
  }
};

export default NumberInputCell;
