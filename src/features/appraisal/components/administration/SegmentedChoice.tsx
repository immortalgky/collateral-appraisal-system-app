import { Description, Radio, RadioGroup } from '@headlessui/react';
import clsx from 'clsx';

export interface SegmentedOption<V extends string = string> {
  value: V;
  label: string;
  /** Shown under the control while this option is selected. */
  description?: string;
  /** This option only: dimmed, not selectable. */
  disabled?: boolean;
  /** Why a disabled option cannot be picked: its hover text and accessible description. */
  disabledReason?: string;
}

interface SegmentedChoiceProps<V extends string> {
  options: SegmentedOption<V>[];
  /** '' = nothing selected. */
  value: V | '';
  onChange: (value: V) => void;
  /** The whole control: greyed out (the selection stays visible, in grey), not selectable. */
  disabled?: boolean;
  /**
   * The group's accessible name (the visible label lives outside). Not aria-labelledby: Headless
   * UI's RadioGroup overwrites that with the ids of its own Label children.
   */
  ariaLabel: string;
  /** For the width of the track, e.g. `max-w-[18.5rem]`. It fills its container by default. */
  className?: string;
}

/**
 * A radio group drawn as a soft segmented track (grey track, white selected pill, teal text, the
 * selected option's description as a hint underneath). Arrow keys move the selection, Space selects
 * (Headless UI RadioGroup).
 */
export default function SegmentedChoice<V extends string>({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
  className,
}: SegmentedChoiceProps<V>) {
  // A locked group shows no hint: it reads as what will happen, and on a read-only page it has.
  const hint = disabled ? undefined : options.find(option => option.value === value)?.description;

  return (
    <RadioGroup
      value={value}
      onChange={(next: V | '') => {
        if (next) onChange(next);
      }}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <div
        className={clsx(
          // The text-control height (DESIGN 17.3); the h-8 options sit centred in it.
          'flex h-ctl items-center gap-0.5 rounded-ctl border border-(--palette-line) bg-(--palette-surface-3) px-[0.2143rem] text-sm',
          className,
        )}
      >
        {options.map(option => {
          const checked = option.value === value;
          // Every Radio gets the group lock too: Headless UI lets an explicit `disabled={false}` on a
          // Radio override the group's. ponytail: a selected option that is disabled has tabIndex
          // -1, and so do the rest, so Tab skips the group until the value is cleared (the
          // Administration page clears it); a focusable-but-aria-disabled radio needs a custom group.
          const off = disabled || !!option.disabled;
          // Teal only where it can still be chosen; a locked selection is grey.
          const on = checked && !off;
          return (
            <Radio
              key={option.value}
              value={option.value}
              disabled={off}
              // A paused option says why (hover, and the accessible description).
              title={
                option.disabled && !disabled && option.disabledReason
                  ? option.disabledReason
                  : option.label
              }
              className={clsx(
                // flex-auto: grow from the label's own width, so a long Thai label gets more room
                // than a short one; min-w-0 lets it truncate (a Thai-safe `truncate`, DESIGN s.4).
                'flex h-8 min-w-0 flex-auto items-center justify-center rounded-ctl-c px-3 font-medium transition-colors select-none',
                off ? 'cursor-not-allowed' : 'cursor-pointer',
                checked
                  ? // Dark: the card colour sits below the track, so the pill takes a lighter line tone.
                    clsx(
                      'bg-(--palette-surface) font-semibold shadow-xs ring-1 ring-black/5 dark:bg-(--palette-line-soft) dark:shadow-none dark:ring-0',
                      on ? 'text-(--palette-accent-ink)' : 'text-(--palette-ink-2)',
                    )
                  : off
                    ? 'text-(--palette-ink-2)'
                    : 'text-(--palette-gray-600) hover:text-(--palette-ink)',
              )}
            >
              <span className="truncate">{option.label}</span>
            </Radio>
          );
        })}
      </div>

      {/* A Description of the group itself (outside every Radio's Field), so it describes the group. */}
      {hint && (
        <Description as="p" className="mt-1.5 text-xs text-(--palette-gray-500)">
          {hint}
        </Description>
      )}
    </RadioGroup>
  );
}
