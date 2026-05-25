interface PriorityBadgeProps {
  value: string | null;
}

const PRIORITY_STYLES: Record<string, string> = {
  High: 'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-gray-50 text-gray-700 border-gray-200',
  Critical: 'bg-rose-50 text-rose-700 border-rose-200',
};

function PriorityBadge({ value }: PriorityBadgeProps) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>;

  const cls =
    PRIORITY_STYLES[value] ?? 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {value}
    </span>
  );
}

export default PriorityBadge;
