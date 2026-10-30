import { useId } from 'react';
import { Description, Field, Label, Radio, RadioGroup } from '@headlessui/react';
import clsx from 'clsx';

export interface SegmentedOption<V extends string = string> {
  value: V;
  label: string;
  /** Segmented: shown under the control while this option is selected. Cards: on every card. */
  description?: string;
  /** This option only: dimmed, not selectable. */
  disabled?: boolean;
  /** Cards: shown in place of the description while the option is disabled. */
  disabledReason?: string;
}

interface SegmentedChoiceProps<V extends string> {
  options: SegmentedOption<V>[];
  /** '' = nothing selected. */
  value: V | '';
  onChange: (value: V) => void;
  /**
   * segmented = soft pill track for a sub-choice; cards = one radio card per option, for the main
   * decision (assignment type).
   */
  variant?: 'segmented' | 'cards';
  /** The whole control: greyed out (the selection stays visible, in grey), not selectable. */
  disabled?: boolean;
  /** The visible label lives outside; give the group its name one way or the other. */
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /** For the width of the track, e.g. `max-w-[18.5rem]`. It fills its container by default. */
  className?: string;
}

/**
 * A radio group drawn either as a soft segmented track (grey track, white selected pill, teal
 * text, the selected option's description as a hint underneath) or as radio cards. Arrow keys move
 * the selection, Space selects (Headless UI RadioGroup).
 */
export default function SegmentedChoice<V extends string>({
  options,
  value,
  onChange,
  variant = 'segmented',
  disabled = false,
  ariaLabel,
  ariaLabelledBy,
  className,
}: SegmentedChoiceProps<V>) {
  const descriptionId = useId();
  const cards = variant === 'cards';
  const hint = cards ? undefined : options.find(option => option.value === value)?.description;

  return (
    // Cards lay out in a row once the card is 40rem wide, stacked below that.
    <div className={clsx(cards && '@container')}>
      <RadioGroup
        value={value}
        onChange={(next: V | '') => {
          if (next) onChange(next);
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={hint ? descriptionId : undefined}
        className={clsx(
          cards
            ? 'grid grid-cols-1 gap-2 @[40rem]:auto-cols-fr @[40rem]:grid-flow-col'
            : // The text-control height (DESIGN 17.3); the h-8 options sit centred in it.
              'flex h-ctl items-center gap-0.5 rounded-ctl border border-(--palette-line) bg-(--palette-surface-3) px-[0.2143rem]',
          'text-sm',
          className,
        )}
      >
        {options.map(option => {
          const checked = option.value === value;
          const off = disabled || !!option.disabled;
          // Teal only where it can still be chosen; a locked selection is grey.
          const on = checked && !off;
          if (cards) {
            const text =
              option.disabled && option.disabledReason ? option.disabledReason : option.description;
            // Field: the card is named by its label and described by the line under it (without
            // it, Headless UI v2 hands a Label inside a Radio to the group).
            return (
              <Field key={option.value} className="flex">
                <Radio
                  value={option.value}
                  disabled={option.disabled}
                  className={clsx(
                    'flex flex-1 items-start gap-2.5 rounded-section border px-3 py-2.5 text-left transition-colors select-none',
                    off ? 'cursor-not-allowed' : 'cursor-pointer',
                    // Disabled is a grey fill, not a fade, so the reason stays readable (17.5).
                    on
                      ? 'border-primary bg-(--palette-accent-wash) shadow-[inset_0_0_0_1px_var(--color-primary)]'
                      : off
                        ? clsx(
                            'bg-(--palette-surface-2)',
                            checked ? 'border-(--palette-line-strong)' : 'border-(--palette-line)',
                          )
                        : 'border-(--palette-line) bg-(--palette-surface) hover:border-(--palette-input-edge-hover)',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'mt-0.5 size-4 shrink-0 rounded-full bg-(--form-input-bg)',
                      on
                        ? 'border-[5px] border-primary'
                        : checked
                          ? 'border-[5px] border-(--palette-ink-3)'
                          : 'border-[1.5px] border-(--palette-input-edge-hover)',
                    )}
                  />
                  <span className="min-w-0">
                    <Label
                      as="span"
                      className={clsx(
                        'block font-semibold',
                        on
                          ? 'text-(--palette-accent-ink)'
                          : off && !checked
                            ? 'text-(--palette-ink-2)'
                            : 'text-(--palette-ink)',
                      )}
                    >
                      {option.label}
                    </Label>
                    {text && (
                      <Description
                        as="span"
                        className="mt-0.5 block text-xs text-(--palette-gray-500)"
                      >
                        {text}
                      </Description>
                    )}
                  </span>
                </Radio>
              </Field>
            );
          }
          return (
            <Radio
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              title={option.label}
              className={clsx(
                // flex-auto: grow from the label's own width, so a long Thai label gets more room
                // than a short one; min-w-0 lets it truncate (a Thai-safe `truncate`, DESIGN s.4).
                'flex h-8 min-w-0 flex-auto items-center justify-center rounded-ctl-c px-3 font-medium transition-colors select-none',
                off ? 'cursor-not-allowed' : 'cursor-pointer',
                checked
                  ? // Dark: the card colour sits below the track, so the pill takes a lighter line tone.
                    clsx(
                      'bg-(--palette-surface) font-semibold shadow-[0_1px_2px_rgb(16_24_40/0.10),0_0_0_1px_rgb(16_24_40/0.05)] dark:bg-(--palette-line-soft) dark:shadow-none',
                      on ? 'text-(--palette-accent-ink)' : 'text-(--palette-ink-2)',
                    )
                  : off
                    ? 'text-(--palette-ink-3)'
                    : 'text-(--palette-gray-600) hover:text-(--palette-ink)',
              )}
            >
              <span className="truncate">{option.label}</span>
            </Radio>
          );
        })}
      </RadioGroup>

      {hint && (
        <p id={descriptionId} className="mt-1.5 text-xs text-(--palette-gray-500)">
          {hint}
        </p>
      )}
    </div>
  );
}
