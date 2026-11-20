import { useId } from 'react';
import { get, useController, useFormContext, useFormState } from 'react-hook-form';

import { chipClass, chipGroupGap, ERROR_TEXT } from '../inputs/controlStyles';
import { ChipCheck } from '../inputs/OtherText';
import type { ChipSpec } from './types';
import { useFormReadOnly } from './context';
import { useFormLayout } from './formLayoutContext';
import { FormFieldShell } from './FormFieldShell';
import { ValidationText } from './ValidationText';
import clsx from 'clsx';

export interface BooleanChipItem {
  /** The full form path of the boolean. */
  name: string;
  label: string;
  /** A chip over a field that is not a boolean (see `FormField.chip`). */
  chip?: ChipSpec;
}

/** One chip: selected while its boolean is true. A stored null reads as unselected and is not written. */
function BooleanChip({ name, label, chip, disabled }: BooleanChipItem & { disabled: boolean }) {
  const { control } = useFormContext();
  const layout = useFormLayout();
  const { field } = useController({ name, control });
  const selected = chip ? chip.isOn(field.value) : field.value === true;
  return (
    <button
      type="button"
      onClick={() => field.onChange(chip ? (selected ? chip.off : chip.on) : !selected)}
      onBlur={field.onBlur}
      disabled={disabled}
      aria-pressed={selected}
      title={label}
      className={chipClass(layout, selected, disabled)}
    >
      {selected && <ChipCheck />}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

/**
 * A multi-select chip group over several yes/no fields (`booleanChips()`): a chip per boolean,
 * selected while true. On a read page only the selected chips are drawn.
 */
export function BooleanChipsField({
  name,
  label,
  chips,
}: {
  name: string;
  label: string;
  chips: BooleanChipItem[];
}) {
  const labelId = useId();
  const layout = useFormLayout();
  const readOnly = useFormReadOnly();
  const { control, getValues } = useFormContext();
  const { errors } = useFormState({ control, name: chips.map(c => c.name) });
  const shown = readOnly
    ? chips.filter(c => (c.chip ? c.chip.isOn(getValues(c.name)) : getValues(c.name) === true))
    : chips;
  // A chip over a field the form draws itself (see `FormField.chip`) leaves its message to that field.
  const messages = chips.flatMap(c => {
    if (c.chip) return [];
    const error = get(errors, c.name) as { message?: string } | undefined;
    return error?.message ? [{ label: c.label, message: error.message }] : [];
  });
  return (
    <FormFieldShell name={name} label={label} labelId={labelId} chips full>
      <div className={clsx('flex flex-wrap', chipGroupGap(layout))}>
        {shown.map(c => (
          <BooleanChip key={c.name} {...c} disabled={readOnly} />
        ))}
        {readOnly && shown.length === 0 && (
          <span className="text-sm text-(--palette-ink-2)">—</span>
        )}
      </div>
      {messages.map(m => (
        <p key={m.label} className={ERROR_TEXT}>
          <ValidationText message={m.message} label={m.label} />
        </p>
      ))}
    </FormFieldShell>
  );
}
