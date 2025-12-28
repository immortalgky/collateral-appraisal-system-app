interface RowNumberCellProps {
  rowIndex: number;
}

const RowNumberCell = ({ rowIndex }: RowNumberCellProps) => {
  return (
    <span className="inline-flex items-center w-7 h-7 justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
      {rowIndex + 1}
    </span>
  );
};

export default RowNumberCell;
