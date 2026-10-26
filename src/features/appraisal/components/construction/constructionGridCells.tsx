import { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import NumberInput from '@shared/components/inputs/NumberInput';
import Icon from '@shared/components/Icon';
import { useFormLayout } from '@/shared/components/form';
import { baht, pct } from './constructionGrid';

/** Presentational cells shared by the detail grid and the summary form. */

/**
 * This round against the previous one. A 0 against a previous figure may just be "not entered yet"
 * (see constructionGrid): a dash while editing, the change in neutral grey when `final`.
 */
export function Change({
  from,
  to,
  final = false,
  incomplete = false,
}: {
  from: number;
  to: number;
  final?: boolean;
  /** A total over rows some of which are still "not entered yet": its figure is not a real one. */
  incomplete?: boolean;
}) {
  const d = Math.round((to - from) * 100) / 100;
  const unknown = (to === 0 && from > 0) || incomplete;
  if (unknown && !final) return <span className="text-(--palette-ink-3)">—</span>;
  return (
    <span
      className={clsx(
        'font-medium',
        unknown || d === 0
          ? 'text-(--palette-ink-3)'
          : d > 0
            ? 'text-[#15803d]'
            : 'text-(--palette-danger)',
      )}
    >
      {d > 0 ? '+' : d < 0 ? '−' : ''}
      {pct(Math.abs(d))}
    </span>
  );
}

/** A column header's label with its unit on a second line; shared with the summary form. */
export function HeadLabel({ label, unit }: { label: string; unit: string }) {
  return (
    <>
      {label}
      <span className="block text-xs font-normal text-(--palette-ink-3)">{unit}</span>
    </>
  );
}

/** The appraiser's own "value this round" for the whole inspection, in place of the calculated one. */
export interface CurrentValueOverride {
  value: number | null;
  /** The value at 100%: the most the override may be. */
  max: number;
  onChange: (value: number | null) => void;
}

/**
 * "Edited" mark that takes no room: a dot hung in the gap to the left of its `relative` parent, so
 * marking a figure never widens a line that is already full (the toolbar wraps at its limit).
 */
export function EditedDot() {
  const { t } = useTranslation('appraisal');
  const label = t('constructionInspection.override.badge');
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="absolute top-1/2 -left-[8px] size-[5px] -translate-y-1/2 rounded-full bg-(--palette-warn)"
    />
  );
}

/**
 * The inspection's current value: the calculated figure, or the typed override when there is one.
 * Editable only when an `override` is given and the form is not read-only. Overridden, the input
 * gets an amber edge and a reset icon beside it, so the cell keeps one line.
 */
export function CurrentValueCell({
  calculated,
  override,
  readOnly,
  ariaLabel,
  onKeyDown,
  panel,
}: {
  calculated: number;
  override?: CurrentValueOverride;
  readOnly?: boolean;
  ariaLabel: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  /** The summary form's value panel: the full-size control, reset beside it on the right. */
  panel?: boolean;
}) {
  const { t } = useTranslation('appraisal');
  const standard = useFormLayout() === 'standard';
  // An emptied field stays empty while focused (it is mid-edit); on blur it means "follow the rows".
  // The key remounts the input then, so it shows the calculated value even when nothing else changed.
  const [emptied, setEmptied] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const overridden = override?.value != null;
  const shown = override?.value ?? calculated;
  if (!override || readOnly)
    return (
      <span
        className={clsx(
          'relative',
          panel && 'text-base font-bold',
          overridden && 'text-(--palette-warn)',
        )}
      >
        {overridden && <EditedDot />}
        {baht(shown)}
      </span>
    );
  const resetLabel = t('constructionInspection.override.resetTitle');
  const reset = overridden && (
    <button
      type="button"
      title={resetLabel}
      aria-label={resetLabel}
      onClick={() => override.onChange(null)}
      className={
        panel
          ? clsx(
              'inline-flex shrink-0 items-center justify-center rounded-ctl border border-(--palette-line) bg-(--palette-surface) text-(--palette-ink-2) hover:border-(--palette-line-strong) hover:text-(--palette-ink)',
              standard ? 'size-[2.2857rem]' : 'size-[2rem]',
            )
          : 'shrink-0 rounded-[4px] p-[3px] text-[0.8571rem] text-(--palette-warn) hover:bg-(--palette-warn-wash)'
      }
    >
      <Icon name="rotate-left" style="solid" className={panel ? 'text-[0.8571rem]' : undefined} />
    </button>
  );
  return (
    <div className="flex items-center justify-end gap-[4px]">
      {!panel && reset}
      <div className="min-w-0 flex-1">
        <NumberInput
          key={inputKey}
          cell={!panel}
          value={shown}
          // Typing 0 is an override; only an empty field is not.
          onChange={e => {
            setEmptied(e.target.value == null);
            // Typing the calculated figure is not an override: store null, as the server will.
            if (e.target.value != null)
              override.onChange(e.target.value === calculated ? null : e.target.value);
          }}
          onBlur={() => {
            if (!emptied) return;
            setEmptied(false);
            setInputKey(k => k + 1);
            override.onChange(null);
          }}
          decimalPlaces={0}
          max={override.max}
          onKeyDown={onKeyDown}
          aria-label={
            overridden ? `${ariaLabel} (${t('constructionInspection.override.badge')})` : ariaLabel
          }
          // The base moved under the typed figure (Building tab): the server refuses it, so say so here.
          invalid={shown > override.max}
          className={clsx(
            panel && 'text-base! font-bold! bg-(--palette-surface)!',
            panel && (standard ? 'h-[2.8571rem]!' : 'h-[2.4286rem]!'),
            !panel && standard && 'h-ctl-c!',
            overridden && 'border-(--palette-warn)! text-(--palette-warn)!',
          )}
        />
      </div>
      {panel && reset}
    </div>
  );
}
