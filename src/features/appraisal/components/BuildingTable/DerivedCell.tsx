import { useWatch, type Control, type FieldValues } from 'react-hook-form';

interface DerivedCellProps {
  arrayName: string;
  rowIndex: number;
  fieldName: string;
  control: Control<FieldValues>;
  isEditing: boolean;
  row?: Record<string, any>;
  render?: (ctx: { value: any; row: any; rowIndex: number }) => React.ReactNode;
  modifier?: (v: number | string | boolean) => number | string | boolean;
}

const DerivedCell = ({ arrayName, rowIndex, fieldName, row, render, modifier }: DerivedCellProps) => {
  const cellName = `${arrayName}.${rowIndex}.${fieldName}`;

  const value = useWatch({ name: cellName });

  const renderValue = (displayValue: string | number | boolean) => {
    return <span className="truncate">{displayValue}</span>;
  };

  if (value != undefined) {
    if (modifier != undefined) {
      if (render != undefined) {
        return render({ value: modifier(value), row: row ?? {}, rowIndex });
      }
      return (
        <span
          className="items-center justify-center text-xs truncate text-gray-600 w-full"
          title={modifier(value).toString()}
        >
          {renderValue(modifier(value))}
        </span>
      );
    } else if (render != undefined) {
      return render({ value, row: row ?? {}, rowIndex });
    }
    return (
      <span
        className="items-center justify-center text-xs truncate text-gray-600 w-full"
        title={value}
      >
        {renderValue(value)}
      </span>
    );
  }

  return <span></span>;
};

export default DerivedCell;
