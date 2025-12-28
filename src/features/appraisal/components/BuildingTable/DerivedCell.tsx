import type { Modifier } from '@dnd-kit/core';
import { useWatch, type Control, type FieldValues } from 'react-hook-form';

interface DerivedCellProps {
  arrayName: string;
  rowIndex: number;
  fieldName: string;
  control: Control<FieldValues>;
  isEditing: boolean;
  render?: (value: number | string | boolean) => React.ReactNode;
  modifier?: (v: number | string | boolean) => number | string | boolean;
}

const DerivedCell = ({ arrayName, rowIndex, fieldName, render, modifier }: DerivedCellProps) => {
  const cellName = `${arrayName}.${rowIndex}.${fieldName}`;

  const value = useWatch({ name: cellName });

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
    return (
      <span
        className="items-center justify-center text-sm truncate text-gray-600 w-full"
        title={value}
      >
        {value}
      </span>
    );
  }

  return <span></span>;
};

export default DerivedCell;
