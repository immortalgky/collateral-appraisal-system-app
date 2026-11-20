import { useContext, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import clsx from 'clsx';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { useFormReadOnly } from '@/shared/components/form/context';
import { FormFieldShell } from '@/shared/components/form/FormFieldShell';
import { useFormLayout } from '@/shared/components/form/formLayoutContext';
import { FormSectionBodyContext } from '@/shared/components/form/formSheetContext';
import { ValidationText } from '@/shared/components/form/ValidationText';
import { chipClass, chipGroupGap, ERROR_TEXT } from '@/shared/components/inputs/controlStyles';
import {
  ChipCheck,
  OtherChip,
  OtherNote,
  useOtherEdit,
  type OtherSpec,
} from '@/shared/components/inputs/OtherText';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import {
  COLOR_SWATCH,
  OTHER_COLOR,
  WHITE_GREEN_DIAGONAL,
  recommendedColor,
} from '../utils/urbanPlanningColor';

const NAME = 'urbanPlanningColor';
const OTHER_NAME = 'urbanPlanningColorOther';

/** The colour tile: a flat fill, white with green diagonals (07) or a dark tile with dots (99). */
export function ColorSwatch({
  code,
  className,
  dot,
}: {
  code: string;
  className?: string;
  /** The small round form inside a compact chip. */
  dot?: boolean;
}) {
  let style: CSSProperties | undefined;
  let dots = false;
  if (code === WHITE_GREEN_DIAGONAL)
    style = {
      backgroundColor: '#ffffff',
      backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 4px, #5a9a6e 4px 6px)',
    };
  else if (code === OTHER_COLOR) {
    style = { backgroundColor: '#374151' };
    dots = true;
  } else style = { backgroundColor: COLOR_SWATCH[code] ?? '#9ca3af' };
  return (
    <span
      aria-hidden
      style={style}
      className={clsx(
        'flex shrink-0 items-center justify-center font-bold leading-none text-white ring-1 ring-inset ring-black/15',
        dot ? 'size-3.5 rounded-full text-[0.5rem] tracking-[-0.1em]' : 'size-7 rounded-lg text-xs',
        className,
      )}
    >
      {dots && '···'}
    </span>
  );
}

/**
 * The "other" colour as a card: its name is typed inside the card, and once the appraiser leaves a
 * filled text the card reads as the typed colour (clicking it edits again). While typing, the swatch
 * is the radio: a click on it clears the choice.
 */
function OtherColorCard({
  spec,
  name,
  cardBase,
  focusOnMount,
  onRemove,
}: {
  spec: OtherSpec;
  name: string;
  cardBase: string;
  focusOnMount: boolean;
  onRemove: () => void;
}) {
  const { t } = useTranslation('common');
  const edit = useOtherEdit(spec, focusOnMount);
  const { control } = useFormContext();
  const { field } = useController({ name: spec.name, control });
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!edit.focusRequest) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [edit.focusRequest, edit.typing]);

  const accent = 'border-(--palette-accent) bg-(--palette-accent-wash) text-(--palette-ink)';
  if (!edit.typing)
    return (
      <button
        type="button"
        role="radio"
        aria-checked
        aria-label={t('chips.otherEdit', { text: edit.text })}
        title={edit.text}
        onClick={edit.edit}
        className={clsx(cardBase, 'cursor-pointer', accent)}
      >
        <ColorSwatch code={OTHER_COLOR} />
        <span className="min-w-0 flex-1 truncate">{edit.text}</span>
        <Icon style="solid" name="pen" className="shrink-0 text-xs text-(--palette-accent-ink)" />
        <Icon style="solid" name="check" className="shrink-0 text-(--palette-accent-ink)" />
      </button>
    );
  return (
    <div
      data-field={spec.name}
      className={clsx(cardBase, accent, edit.invalid && 'border-danger')}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) edit.commit();
      }}
    >
      <button
        type="button"
        role="radio"
        aria-checked
        aria-label={name}
        onClick={onRemove}
        className="cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--palette-accent)"
      >
        <ColorSwatch code={OTHER_COLOR} />
      </button>
      <input
        type="text"
        name={field.name}
        value={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        ref={el => {
          inputRef.current = el;
          field.ref(el);
        }}
        maxLength={spec.maxLength}
        aria-label={spec.label}
        aria-invalid={edit.invalid ? true : undefined}
        placeholder={t('chips.otherPlaceholder')}
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-(--palette-ink) outline-none placeholder:text-(--palette-ink-3)"
      />
      <button
        type="button"
        aria-label={t('chips.otherRemove')}
        title={t('chips.otherRemove')}
        // The input keeps focus, so the card does not turn into its typed form under the click.
        onMouseDown={e => e.preventDefault()}
        onClick={onRemove}
        className="inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 text-xs text-(--palette-ink-2) hover:text-(--palette-ink)"
      >
        <Icon style="solid" name="xmark" />
      </button>
      <Icon style="solid" name="check" className="shrink-0 text-(--palette-accent-ink)" />
    </div>
  );
}

/**
 * The colour the town plan shows for the plot, picked as a card with its swatch, under the planning
 * type it follows from. Changing the planning type sets the colour it usually carries (or clears it
 * where there is none), only for the appraiser's own change, never for a record loading.
 * Still two plain form values (`urbanPlanningColor`, `urbanPlanningColorOther`).
 */
export default function UrbanPlanningColorField() {
  const { t } = useTranslation('appraisal');
  const readOnly = useFormReadOnly();
  const { control, watch, getValues, setValue } = useFormContext();
  const options = useParametersByGroup('UrbanPlanningColor');
  const { field } = useController({ name: NAME, control });
  const other = useController({ name: OTHER_NAME, control });
  const planningType = useWatch({ control, name: 'urbanPlanningType' });
  const recommended = recommendedColor(planningType);
  const otherError = other.fieldState.error?.message;
  const headingId = useId();
  // Set when the user picks "Other", so only that (not a record loading with 99) focuses the input.
  const [focusOtherChip, setFocusOtherChip] = useState(false);
  const layout = useFormLayout();
  // Compact lays out as label-left rows only inside a section body, as FormFieldShell does.
  const inSectionBody = useContext(FormSectionBodyContext);
  const compact = layout === 'compact' && inSectionBody;

  // Every edit of the planning type sets the colour it usually carries, over whatever was picked
  // before (the appraiser can still change it afterwards); a type with no usual colour clears it.
  // `type === 'change'` is an edit by the user; a reset() or setValue() (a record loading, a copy)
  // carries none, so opening a saved record never touches the colour or dirties the form.
  useEffect(() => {
    const subscription = watch((_values, { name, type }) => {
      if (name !== 'urbanPlanningType' || type !== 'change') return;
      const suggested = recommendedColor(getValues('urbanPlanningType'));
      setValue(NAME, suggested ?? '', { shouldDirty: true });
      setValue(OTHER_NAME, '', { shouldDirty: true });
    });
    return () => subscription.unsubscribe();
  }, [watch, getValues, setValue]);

  const otherSpec: OtherSpec = {
    name: OTHER_NAME,
    is: OTHER_COLOR,
    maxLength: 100,
    label: t('forms.urbanColor.otherLabel'),
  };
  const selected = (field.value as string | null | undefined) || '';
  // 07 is long in the parameter table; the card uses the short form.
  const labelOf = (code: string, description: string) =>
    code === WHITE_GREEN_DIAGONAL ? t('forms.urbanColor.shortWhiteGreen') : description;

  const select = (code: string) => {
    const next = selected === code ? '' : code;
    setFocusOtherChip(next === OTHER_COLOR);
    field.onChange(next);
    if (next !== OTHER_COLOR) other.field.onChange('');
  };

  if (compact) {
    const label = t('forms.urbanColor.label');
    const nameOf = (code: string) =>
      labelOf(code, options.find(o => o.code === code)?.description ?? code);
    if (readOnly)
      return (
        <FormFieldShell name={NAME} label={label} labelId={headingId} read full>
          {selected ? (
            <div className="flex items-center gap-2 text-sm text-(--palette-ink)">
              <ColorSwatch code={selected} dot />
              <span>
                {nameOf(selected)}
                {selected === OTHER_COLOR && other.field.value
                  ? ` · ${String(other.field.value)}`
                  : ''}
              </span>
            </div>
          ) : (
            <span className="text-sm text-(--palette-ink-3)">—</span>
          )}
        </FormFieldShell>
      );
    return (
      <FormFieldShell name={NAME} label={label} labelId={headingId} full>
        <div
          role="radiogroup"
          aria-labelledby={headingId}
          className={clsx('flex flex-wrap', chipGroupGap(layout))}
        >
          {options.map(option => {
            const on = selected === option.code;
            if (on && option.code === OTHER_COLOR)
              return (
                <OtherChip
                  key={option.code}
                  spec={otherSpec}
                  layout={layout}
                  focusOnMount={focusOtherChip}
                  optionLabel={labelOf(option.code, option.description)}
                  onRemove={() => select(option.code)}
                  renderTextChip={chip => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked
                      aria-label={chip.label}
                      title={chip.title}
                      onClick={chip.onClick}
                      className={chip.className}
                    >
                      {chip.children}
                    </button>
                  )}
                />
              );
            return (
              <button
                key={option.code}
                type="button"
                role="radio"
                aria-checked={on}
                title={nameOf(option.code)}
                onClick={() => select(option.code)}
                className={chipClass(layout, on, false)}
              >
                {on && <ChipCheck />}
                <ColorSwatch code={option.code} dot className="mr-[0.4286rem]" />
                <span className="min-w-0 truncate">{nameOf(option.code)}</span>
                {option.code === recommended && (
                  <span
                    className={clsx(
                      'ml-[0.4286rem] shrink-0 text-xs',
                      on ? 'text-white/80' : 'text-(--palette-accent-ink)',
                    )}
                  >
                    {t('forms.urbanColor.recommendedTag')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selected === OTHER_COLOR && <OtherNote spec={otherSpec} />}
        <p className="mt-1 text-xs text-(--palette-ink-2)">{t('forms.urbanColor.note')}</p>
      </FormFieldShell>
    );
  }

  if (readOnly) {
    const option = options.find(o => o.code === selected);
    return (
      <div className="col-span-12" data-field={NAME}>
        <div className="mb-px text-xs font-medium text-(--palette-ink-2)">
          {t('forms.urbanColor.heading')}
        </div>
        {selected ? (
          <div className="flex items-center gap-2 text-sm text-(--palette-ink)">
            <ColorSwatch code={selected} />
            <span>
              {labelOf(selected, option?.description ?? selected)}
              {selected === OTHER_COLOR && other.field.value
                ? ` · ${String(other.field.value)}`
                : ''}
            </span>
          </div>
        ) : (
          <span className="text-sm text-(--palette-ink-3)">—</span>
        )}
      </div>
    );
  }

  return (
    <div className="col-span-12 border-t border-(--palette-line-soft) pt-3" data-field={NAME}>
      <div className="mb-2 flex items-center gap-2">
        <span id={headingId} className="text-xs font-medium text-(--palette-ink)">
          {t('forms.urbanColor.heading')}
        </span>
        {recommended && (
          <span className="ml-auto rounded-full bg-(--palette-accent-wash) px-2 py-px text-xs font-medium text-(--palette-accent-ink)">
            {t('forms.urbanColor.recommendedPill')}
          </span>
        )}
      </div>
      <div role="radiogroup" aria-labelledby={headingId} className="grid gap-2 md:grid-cols-2">
        {options.map(option => {
          const on = selected === option.code;
          const cardBase =
            'flex min-w-0 items-center gap-3 rounded-ctl border px-3 py-2 text-left text-sm';
          if (on && option.code === OTHER_COLOR)
            return (
              <OtherColorCard
                key={option.code}
                spec={otherSpec}
                name={labelOf(option.code, option.description)}
                cardBase={cardBase}
                focusOnMount={focusOtherChip}
                onRemove={() => select(option.code)}
              />
            );
          return (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => select(option.code)}
              className={clsx(
                cardBase,
                'cursor-pointer transition-colors',
                on
                  ? 'border-(--palette-accent) bg-(--palette-accent-wash) text-(--palette-ink)'
                  : 'border-(--palette-line) bg-(--palette-surface) text-(--palette-ink) hover:bg-(--palette-surface-2)',
              )}
            >
              <ColorSwatch code={option.code} />
              <span className="min-w-0 flex-1 truncate">
                {labelOf(option.code, option.description)}
              </span>
              {option.code === recommended && (
                <span className="shrink-0 rounded-full bg-(--palette-accent-wash) px-2 py-px text-xs font-medium text-(--palette-accent-ink)">
                  {t('forms.urbanColor.recommendedTag')}
                </span>
              )}
              {on && (
                <Icon style="solid" name="check" className="shrink-0 text-(--palette-accent-ink)" />
              )}
            </button>
          );
        })}
      </div>
      {otherError && (
        <p className={clsx('mt-1', ERROR_TEXT)}>
          <ValidationText message={otherError} />
        </p>
      )}
      <p className="mt-2 flex items-start gap-1.5 text-xs text-(--palette-ink-2)">
        <Icon style="solid" name="circle-info" className="mt-0.5 shrink-0" />
        {t('forms.urbanColor.note')}
      </p>
    </div>
  );
}
