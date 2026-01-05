interface DisplayCellProps {
  isEditing: boolean;
  value: any;
  render?: (value: any) => React.ReactNode;
}
const DisplayCell = ({ value, render }: DisplayCellProps) => {
  return (
    <div>
      {render ? (
        render(value)
      ) : value ? (
        <span
          className="items-center justify-center text-sm font-medium truncate text-gray-600 w-full"
          title={value}
        >
          {value}
        </span>
      ) : (
        ''
      )}
    </div>
  );
};

export default DisplayCell;
