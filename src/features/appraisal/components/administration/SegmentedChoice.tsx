import { useId } from 'react';
import { Radio, RadioGroup } from '@headlessui/react';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';

export interface SegmentedOption<V extends string = string> {
  value: V;
  label: string;
  /** Shown under the control while this option is the selected one. */
  description?: string;
  /** This option only: dimmed and struck through, not selectable. */
  disabled?: boolean;
  icon?: string;
}

interface SegmentedChoiceProps<V extends string> {
  options: SegmentedOption<V>[];
  /** '' = nothing selected. */
  value: V | '';
  onChange: (value: V) => void;
  /** Teal for internal and neutral choices, purple for the external ones. */
  tone?: 'teal' | 'purple';
  /**
   * hint = grey helper line (assignment method); callout = tinted box with a dot (assignment type).
   */
  descriptionVariant?: 'hint' | 'callout';
  /** The whole control: dimmed, not selectable, nothing struck through. */
  disabled?: boolean;
  /** The visible label lives outside; give the group its name one way or the other. */
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /** For the width of the track, e.g. `max-w-[18.5rem]`. It fills its container by default. */
  className?: string;
}

// The selected pill uses the Toggle's recipe (bg + tinted shadow), static so Tailwind sees the classes.
const TONE = {
  teal: {
    on: 'bg-primary text-white shadow-md shadow-primary/25',
    callout:
      'border-primary-200 dark:border-primary-500/30 bg-(--palette-accent-wash) text-(--palette-accent-ink)',
    dot: 'bg-primary',
  },
  purple: {
    on: 'bg-purple-600 text-white shadow-md shadow-purple-600/25',
    callout:
      'border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-purple-800 dark:text-purple-300',
    dot: 'bg-purple-600',
  },
} as const;

/**
 * Segmented radio group: a pill track with one pill per option, and the selected option's
 * description underneath. Arrow keys move the selection, Space selects (Headless UI RadioGroup).
 * Same height as a text input (track p-1 + option py, like Toggle md).
 */
export default function SegmentedChoice<V extends string>({
  options,
  value,
  onChange,
  tone = 'teal',
  descriptionVariant = 'hint',
  disabled = false,
  ariaLabel,
  ariaLabelledBy,
  className,
}: SegmentedChoiceProps<V>) {
  const descriptionId = useId();
  const styles = TONE[tone];
  const description = options.find(option => option.value === value)?.description;

  return (
    <div>
      <RadioGroup
        value={value}
        onChange={(next: V | '') => {
          if (next) onChange(next);
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={description ? descriptionId : undefined}
        className={clsx(
          'flex rounded-full bg-gray-100/80 p-1 text-sm',
          disabled && 'opacity-65',
          className,
        )}
      >
        {options.map(option => {
          const checked = option.value === value;
          const off = disabled || !!option.disabled;
          return (
            <Radio
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              title={option.label}
              className={clsx(
                // flex-auto: grow from the label's own width, so a long Thai label gets more room
                // than a short one; min-w-0 lets it truncate (a Thai-safe `truncate`, DESIGN s.4).
                'flex min-w-0 flex-auto select-none items-center justify-center gap-1.5 rounded-full px-4 py-[calc(0.25rem+1px)] font-medium transition-colors',
                off ? 'cursor-not-allowed' : 'cursor-pointer',
                checked
                  ? styles.on
                  : option.disabled
                    ? 'text-(--palette-gray-300) line-through decoration-gray-200'
                    : 'text-(--palette-gray-600) hover:text-(--palette-ink)',
              )}
            >
              {option.icon && (
                <Icon
                  name={option.icon}
                  style={checked ? 'solid' : 'regular'}
                  className="shrink-0"
                />
              )}
              <span className="truncate">{option.label}</span>
            </Radio>
          );
        })}
      </RadioGroup>

      {description &&
        (descriptionVariant === 'callout' ? (
          <p
            id={descriptionId}
            className={clsx(
              'mt-2 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs',
              styles.callout,
            )}
          >
            <span
              className={clsx('size-1.5 shrink-0 rounded-full', styles.dot)}
              aria-hidden="true"
            />
            {description}
          </p>
        ) : (
          <p id={descriptionId} className="mt-1.5 text-xs text-(--palette-gray-500)">
            {description}
          </p>
        ))}
    </div>
  );
}
