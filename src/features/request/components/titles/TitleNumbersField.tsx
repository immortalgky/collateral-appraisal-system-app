import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { get, useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useFormReadOnly } from '@/shared/components/form';
import { CONDO_TITLE_NUMBER_MAX } from '../../configs/fields';
import {
  normaliseLandTitleNumbers,
  parcelsIn,
  splitLandTitleNumbers,
  summariseTitleNumber,
} from '../../utils/titleList';

/** A condominium's `titleNumber` length: the same limit the field config and the save schema hold. */
const MAX_LENGTH = CONDO_TITLE_NUMBER_MAX;
/** Past this the box scrolls instead of growing, so a list of hundreds does not push the drawer. */
const MAX_HEIGHT_PX = 320;

const idOf = (index: number) => `title-numbers-${index}`;

/**
 * The text as the box shows it: a space after each comma, so a long list wraps between numbers and
 * never inside one. Only what is displayed; the stored list has no spaces (the column is short).
 */
const forDisplay = (stored: string) => stored.replace(/,\s*/g, ', ');

/**
 * A condominium's land title numbers, one string in `titleNumber`: a box that grows with what is
 * pasted into it. It is tidied only when the user leaves it (split on commas, semicolons and
 * whitespace, ranges kept, repeats dropped, joined with a bare ","), and only if the tidy text
 * still fits the column: otherwise the text stays as typed and the field's max-length error shows.
 * A value that is merely loaded is never rewritten.
 *
 * The box shows ", " between numbers so lines wrap between them, while the form holds ",": the
 * counter, the 500 limit and the validation are all about the stored text, not the spaces shown.
 */
export function TitleNumbersField({ index }: { index: number }) {
  const { t } = useTranslation('request');
  const readOnly = useFormReadOnly();
  const path = `titles.${index}.titleNumber`;
  const { control, setValue, trigger, formState } = useFormContext();
  const { field } = useController({ name: path, control });
  const value = (field.value as string | null | undefined) ?? '';
  // What is in the box while it is being edited; null when it is just showing the stored list.
  const [editing, setEditing] = useState<string | null>(null);
  const written = useRef<string | undefined>(undefined);
  // The stored text when the box was entered: leaving it unchanged must not rewrite or dirty it.
  const valueAtFocus = useRef(value);
  // A value set from outside while the box is open (a reset, an import) replaces what is in it.
  useEffect(() => {
    if (editing !== null && value !== written.current) setEditing(forDisplay(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const shown = editing ?? forDisplay(value);
  // The length that counts is the stored one: what the list will be once tidied while it is being
  // edited, the stored text itself otherwise.
  const length = editing === null ? value.length : normaliseLandTitleNumbers(editing).length;
  const { count } = summariseTitleNumber(editing ?? value);
  const error = get(formState.errors, path)?.message as string | undefined;
  const tooLong = length > MAX_LENGTH;

  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [shown]);

  const tidyOnBlur = () => {
    if (value === valueAtFocus.current) {
      setEditing(null);
      field.onBlur();
      return;
    }
    const tidy = normaliseLandTitleNumbers(value);
    // Text with no number in it is left as typed: tidying must never erase what the user wrote
    const next = tidy === '' || tidy.length > MAX_LENGTH ? value : tidy;
    if (next !== value) setValue(path, next, { shouldDirty: true, shouldValidate: true });
    if (next.length > MAX_LENGTH) void trigger(path);
    setEditing(null);
    field.onBlur();
  };

  const id = idOf(index);
  return (
    // data-field is where the page scrolls to for this field (see scrollToField).
    <div data-field={path} className="col-span-6 grid gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-gray-800">
        {t('titleSection.numbers.heading', { count })}
        {!readOnly && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <textarea
        id={id}
        name={field.name}
        ref={element => {
          field.ref(element);
          ref.current = element;
        }}
        value={shown}
        onFocus={() => {
          valueAtFocus.current = value;
          setEditing(shown);
        }}
        onChange={event => {
          setEditing(event.target.value);
          written.current = event.target.value;
          field.onChange(event.target.value);
        }}
        onBlur={tidyOnBlur}
        readOnly={readOnly}
        rows={3}
        spellCheck={false}
        aria-invalid={error || tooLong ? true : undefined}
        aria-describedby={`${id}-hint`}
        className={clsx(
          'block w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm leading-relaxed tabular-nums transition-colors',
          'placeholder:text-gray-400 focus:outline-none focus:ring-2',
          error || tooLong
            ? 'border-danger focus:border-danger focus:ring-danger/20'
            : 'border-gray-300 hover:border-gray-400 focus:border-gray-500 focus:ring-gray-200',
          readOnly && 'cursor-default bg-gray-50 text-gray-600',
        )}
      />
      <div
        id={`${id}-hint`}
        className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5"
      >
        <p className={clsx('m-0 text-xs', error || tooLong ? 'text-danger' : 'text-gray-500')}>
          {error ?? (readOnly ? null : t('titleSection.numbers.hint'))}
        </p>
        <span
          className={clsx(
            'ml-auto whitespace-nowrap text-xs tabular-nums',
            tooLong ? 'font-medium text-danger' : 'text-gray-500',
          )}
        >
          {t('titleSection.numbers.counter', { length, max: MAX_LENGTH, count })}
        </span>
      </div>
    </div>
  );
}

/**
 * What the paper shows for the land title numbers: the first few, then how many parcels are left.
 * Clicking it goes to the box below, where they are edited.
 */
export function TitleNumbersSummary({ index }: { index: number }) {
  const { t } = useTranslation('request');
  const { control } = useFormContext();
  const { field } = useController({ name: `titles.${index}.titleNumber`, control });
  const entries = splitLandTitleNumbers(field.value as string | null | undefined);
  const shown = entries.slice(0, 3);
  const left = entries.slice(3).reduce((sum, entry) => sum + parcelsIn(entry), 0);

  const goToBox = () => {
    const box = document.getElementById(idOf(index));
    box?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    box?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={goToBox}
      title={entries.join(',') || undefined}
      aria-label={t('titleSection.numbers.goTo')}
      className="min-h-[1.6rem] min-w-0 flex-1 cursor-pointer truncate px-1 pb-px pt-0.5 text-center text-[15px] font-semibold text-blue-700 outline-none focus-visible:underline"
    >
      {shown.join(',')}
      {left > 0 && ` … ${t('titleSection.numbers.more', { count: left })}`}
    </button>
  );
}
