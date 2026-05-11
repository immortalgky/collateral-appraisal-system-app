interface EvaluationStatusBadgeProps {
  status: string;
}

const STATUS_COLOR_MAP: Record<string, 'amber' | 'blue' | 'emerald' | 'gray'> = {
  Pending: 'amber',
  Draft: 'blue',
  Completed: 'emerald',
};

function EvaluationStatusBadge({ status }: EvaluationStatusBadgeProps) {
  const color = STATUS_COLOR_MAP[status] ?? 'gray';

  // Map to badge variant via the typeColorMap approach — use className override
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    gray: 'bg-gray-100 text-gray-600',
  };

  const dotClasses: Record<string, string> = {
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    gray: 'bg-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}
    >
      <span className={`size-1.5 rounded-full shrink-0 ${dotClasses[color]}`} />
      {status}
    </span>
  );
}

export default EvaluationStatusBadge;
