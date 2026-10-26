import clsx from 'clsx';
import Icon from '@/shared/components/Icon';

export interface PillSegmentOption<T extends string> {
  value: T;
  label: string;
  icon: string;
  /** A count after the label (My / Pool). */
  count?: number;
}

interface PillSegmentsProps<T extends string> {
  options: readonly PillSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers. */
  label: string;
}

/**
 * Mutually exclusive choices in a rounded grey track, the chosen one filled teal. The same control
 * as the request list's status segments, with an icon (and a count) per option.
 */
export function PillSegments<T extends string>({
  options,
  value,
  onChange,
  label,
}: PillSegmentsProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 rounded-full bg-gray-100/80 p-1 text-sm"
    >
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={clsx(
              'flex cursor-pointer items-center gap-1.5 rounded-full py-[calc(0.25rem+1px)] font-medium whitespace-nowrap transition-colors select-none',
              'px-4',
              active
                ? 'bg-primary text-white shadow-[0_2px_6px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]'
                : 'text-gray-600 hover:text-gray-800',
            )}
          >
            <Icon style="solid" name={option.icon} className="text-xs" />
            {option.label}
            {option.count !== undefined && (
              <span
                className={clsx('text-xs tabular-nums', active ? 'text-white/80' : 'text-gray-400')}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
