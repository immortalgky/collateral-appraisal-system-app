interface MovementCellProps {
  value: string | null;
}

const MOVEMENT_STYLES: Record<string, string> = {
  Forward: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Backward: 'text-red-700 bg-red-50 border-red-200',
  Stalled: 'text-amber-700 bg-amber-50 border-amber-200',
};

function MovementCell({ value }: MovementCellProps) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>;

  const cls =
    MOVEMENT_STYLES[value] ?? 'text-gray-700 bg-gray-50 border-gray-200';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {value}
    </span>
  );
}

export default MovementCell;
