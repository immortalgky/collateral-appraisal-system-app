import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import type { OverrideAccess } from '../overrideAccess';

const OPTIONS = [
  {
    value: 'inherit',
    icon: 'circle-check',
    labelKey: 'activityOverrides.access.inherit',
    activeClass: 'bg-(--palette-surface) text-emerald-700 dark:text-emerald-300 shadow-sm',
  },
  {
    value: 'readonly',
    icon: 'lock',
    labelKey: 'activityOverrides.access.readonly',
    activeClass: 'bg-(--palette-surface) text-(--palette-warn) shadow-sm',
  },
  {
    value: 'hidden',
    icon: 'eye-slash',
    labelKey: 'activityOverrides.access.hidden',
    activeClass: 'bg-(--palette-surface) text-(--palette-ink) shadow-sm',
  },
] as const;

interface OverrideAccessSelectProps {
  value: OverrideAccess;
  onChange: (next: OverrideAccess) => void;
  disabled?: boolean;
}

/**
 * Compact 3-state segmented control for an appraisal menu's access during a task.
 * Replaces the old Hidden/Read-only checkbox pair — the states are mutually
 * exclusive, so one click = one decision.
 */
export function OverrideAccessSelect({ value, onChange, disabled }: OverrideAccessSelectProps) {
  const { t } = useTranslation('menuManagement');
  return (
    <div
      role="group"
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-lg bg-(--palette-surface-3) p-0.5',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      {OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              active ? opt.activeClass : 'text-(--palette-gray-500) hover:text-(--palette-ink)',
            )}
          >
            <Icon name={opt.icon} style="solid" className="size-3" />
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
