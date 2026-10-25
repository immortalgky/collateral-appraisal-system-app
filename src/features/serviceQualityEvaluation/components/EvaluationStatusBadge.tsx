import { useTranslation } from 'react-i18next';

interface EvaluationStatusBadgeProps {
  status: string;
}

const STATUS_COLOR_MAP: Record<string, 'amber' | 'emerald' | 'gray'> = {
  Pending: 'amber',
  Completed: 'emerald',
};

function EvaluationStatusBadge({ status }: EvaluationStatusBadgeProps) {
  const { t } = useTranslation('serviceQualityEvaluation');
  // Historical 'Draft' rows surface as Pending — same colour, same label.
  const normalized = status === 'Draft' ? 'Pending' : status;
  const color = STATUS_COLOR_MAP[normalized] ?? 'gray';
  const labelKey = `evaluationStatus.${normalized}` as
    | 'evaluationStatus.Pending'
    | 'evaluationStatus.Completed';
  const label = normalized === 'Pending' || normalized === 'Completed' ? t(labelKey) : status;

  // Map to badge variant via the typeColorMap approach — use className override
  const colorClasses: Record<string, string> = {
    amber: 'bg-(--palette-warn-wash) text-(--palette-warn)',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    gray: 'bg-(--palette-surface-3) text-(--palette-gray-600)',
  };

  const dotClasses: Record<string, string> = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    gray: 'bg-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}
    >
      <span className={`size-1.5 rounded-full shrink-0 ${dotClasses[color]}`} />
      {label}
    </span>
  );
}

export default EvaluationStatusBadge;
