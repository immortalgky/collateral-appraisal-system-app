import Icon from '@shared/components/Icon';

interface MovementBadgeProps {
  value: string | null;
}

const MOVEMENT_STYLES: Record<string, { color: string; icon: string; label: string }> = {
  F: { color: 'text-emerald-700 dark:text-emerald-300', icon: 'arrow-right', label: 'Forward' },
  B: { color: 'text-(--palette-warn)', icon: 'arrow-rotate-left', label: 'Returned' },
  S: { color: 'text-(--palette-gray-600)', icon: 'minus', label: 'Stalled' },
};

function MovementBadge({ value }: MovementBadgeProps) {
  if (!value) return <span className="text-(--palette-gray-400)">—</span>;

  const config = MOVEMENT_STYLES[value];
  if (!config) return <span className="text-(--palette-gray-400)">—</span>;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.color}`}
      title={config.label}
    >
      <Icon style="solid" name={config.icon} className="size-3" />
      {config.label}
    </span>
  );
}

export default MovementBadge;

/**
 * Wrapper for task-list pages where the DTO stores full words
 * ("Forward", "Backward", "Static") instead of single letters.
 * Monitoring callers that already pass single letters are unaffected.
 */
export function MovementBadgeFromTaskDto({ value }: { value: string | null }) {
  const normalized =
    value === 'Forward' ? 'F' : value === 'Backward' ? 'B' : value === 'Static' ? 'S' : value; // pass through single-letter values unchanged
  return <MovementBadge value={normalized} />;
}
