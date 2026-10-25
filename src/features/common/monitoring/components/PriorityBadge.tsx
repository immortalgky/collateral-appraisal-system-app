interface PriorityBadgeProps {
  value: string | null;
}

const PRIORITY_STYLES: Record<string, string> = {
  High: 'bg-(--palette-req-wash) text-(--palette-req) border-(--palette-req-line)',
  Medium:
    'bg-(--palette-warn-wash) text-(--palette-warn) border-amber-200 dark:border-amber-500/30',
  Low: 'bg-(--palette-surface-2) text-(--palette-ink) border-(--palette-line)',
  Critical:
    'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
};

function PriorityBadge({ value }: PriorityBadgeProps) {
  if (!value) return <span className="text-(--palette-gray-400) text-xs">—</span>;

  const cls =
    PRIORITY_STYLES[value] ??
    'bg-(--palette-surface-2) text-(--palette-ink) border-(--palette-line)';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {value}
    </span>
  );
}

export default PriorityBadge;
