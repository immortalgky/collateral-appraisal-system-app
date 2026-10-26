interface MovementCellProps {
  value: string | null;
}

const MOVEMENT_STYLES: Record<string, string> = {
  Forward:
    'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
  Backward: 'text-(--palette-req) bg-(--palette-req-wash) border-(--palette-req-line)',
  Stalled:
    'text-(--palette-warn) bg-(--palette-warn-wash) border-amber-200 dark:border-amber-500/30',
};

function MovementCell({ value }: MovementCellProps) {
  if (!value) return <span className="text-(--palette-gray-400) text-xs">—</span>;

  const cls =
    MOVEMENT_STYLES[value] ??
    'text-(--palette-ink) bg-(--palette-surface-2) border-(--palette-line)';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {value}
    </span>
  );
}

export default MovementCell;
