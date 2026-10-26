import clsx from 'clsx';
import { format, isValid, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { useBooleanToggleOptions, useStringToggleOptions } from '../inputs/toggleOptions';
import { findAddressBySubDistrictCode } from '../../data/thaiAddresses';
import { useParameterAsRadioOptions, useParameterOptions } from '../../utils/parameterUtils';
import type { FormField } from './types';

const VALUE = 'min-w-0 text-sm text-(--palette-ink) [overflow-wrap:anywhere]';
const MISSING =
  'ml-2 rounded-full border border-(--palette-warn) bg-(--palette-warn-wash) px-2 text-xs font-semibold text-(--palette-warn)';

/** Types `FormFields` draws as label + value on a read page; the rest keep their (disabled) control. */
export const READ_TYPES = new Set<FormField['type']>([
  'text-input',
  'number-input',
  'date-input',
  'datetime-input',
  'textarea',
  'select-input',
  'dropdown',
  'parameter-search',
  'boolean-toggle',
  'string-toggle',
  'radio-group',
  'checkbox-group',
  'location-selector',
  'checkbox',
  'switch',
]);

const isBlank = (value: unknown) => value == null || (typeof value === 'string' && !value.trim());

/** The value, or "—" (and a "missing" pill when the field is required). */
function Shown({ text, required, pre }: { text: string | null; required: boolean; pre?: boolean }) {
  const { t } = useTranslation('common');
  if (text) return <div className={clsx(VALUE, pre && 'whitespace-pre-line')}>{text}</div>;
  return (
    <div className={VALUE}>
      <span className="text-(--palette-ink-2)">—</span>
      {required && <span className={MISSING}>{t('missing.fieldMissing')}</span>}
    </div>
  );
}

/** Dropdown, select and parameter search: the option's label, never its code. */
function OptionText({
  group,
  options,
  value,
  required,
}: {
  group?: string;
  options?: { value?: string | null; label: string }[];
  value: unknown;
  required: boolean;
}) {
  const fromGroup = useParameterOptions(group ?? '');
  const code = isBlank(value) ? null : String(value);
  // A code the list does not know is shown as is rather than hidden.
  const text = code && ((options ?? fromGroup).find(o => o.value === code)?.label ?? code);
  return <Shown text={text} required={required} />;
}

function BooleanText({
  field,
  name,
  value,
  required,
}: {
  field: Extract<FormField, { type: 'boolean-toggle' }>;
  name: string;
  value: unknown;
  required: boolean;
}) {
  const captions = useBooleanToggleOptions(name, field.group, field.options);
  return <Shown text={isBlank(value) ? null : captions[value ? 1 : 0]} required={required} />;
}

function StringToggleText({
  field,
  value,
  required,
}: {
  field: Extract<FormField, { type: 'string-toggle' }>;
  value: unknown;
  required: boolean;
}) {
  const options = useStringToggleOptions(field.group, field.options);
  return <Shown text={options.find(o => o.name === value)?.label ?? null} required={required} />;
}

/** Radio and checkbox groups: only the chosen options, in the options' order, joined " · ". */
function ChoiceText({
  group,
  options,
  value,
  required,
  other,
}: {
  group?: string;
  options?: { value: string; label: string }[];
  value: unknown;
  required: boolean;
  /** The "อื่นๆ" option and the text typed for it: shown as `อื่นๆ: text`. */
  other?: { is: string; text: unknown };
}) {
  const fromGroup = useParameterAsRadioOptions(group ?? '');
  const chosen = Array.isArray(value) ? value : [value];
  const text = (options ?? fromGroup)
    .filter(o => chosen.includes(o.value))
    .map(o =>
      other && o.value === other.is && !isBlank(other.text)
        ? `${o.label}: ${String(other.text)}`
        : o.label,
    )
    .join(' · ');
  return <Shown text={text} required={required} />;
}

/** A checkbox or switch: its state as the yes / no caption the toggles use. */
function YesNoText({ value }: { value: unknown }) {
  const { t } = useTranslation('common');
  return <Shown text={t(value ? 'toggle.Yes' : 'toggle.No')} required={false} />;
}

function numberText(
  field: Extract<FormField, { type: 'number-input' }>,
  value: unknown,
  required: boolean,
) {
  const n = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (typeof n !== 'number' || isNaN(n)) return null;
  // The schema counts 0 as empty on a required number unless `allowZero`.
  if (n === 0 && required && !field.allowZero) return null;
  const places = field.decimalPlaces ?? 2;
  const figure =
    field.thousandSeparator === false
      ? n.toFixed(places)
      : n.toLocaleString('en-US', { minimumFractionDigits: places, maximumFractionDigits: places });
  return field.suffix ? `${figure} ${field.suffix}` : figure;
}

function dateText(value: unknown, withTime: boolean) {
  if (isBlank(value)) return null;
  // parseISO first: a date-only 'YYYY-MM-DD' is local time, not UTC midnight shifted a day. What it
  // cannot read falls back to Date, which accepts whatever the edit control did.
  const iso = typeof value === 'string' ? parseISO(value) : undefined;
  const date =
    value instanceof Date
      ? value
      : iso && isValid(iso)
        ? iso
        : typeof value === 'string'
          ? new Date(value)
          : undefined;
  return date && isValid(date) ? format(date, withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy') : null;
}

/**
 * A field on a read page (DESIGN.md 17.3): the value as text, formatted as its control shows it, with
 * choices as their labels. `FormFieldShell` draws the label around it.
 */
export function FormReadValue({
  field,
  name,
  value,
  required,
  other,
}: {
  field: FormField;
  name: string;
  value: unknown;
  required: boolean;
  other?: { is: string; text: unknown };
}) {
  switch (field.type) {
    case 'text-input':
      return <Shown text={isBlank(value) ? null : String(value)} required={required} />;
    case 'textarea':
      return <Shown text={isBlank(value) ? null : String(value)} required={required} pre />;
    case 'number-input':
      return <Shown text={numberText(field, value, required)} required={required} />;
    case 'date-input':
      return <Shown text={dateText(value, false)} required={required} />;
    case 'datetime-input':
      return <Shown text={dateText(value, true)} required={required} />;
    case 'select-input':
    case 'dropdown':
    case 'parameter-search':
      return (
        <OptionText
          group={'group' in field ? field.group : undefined}
          options={field.options}
          value={value}
          required={required}
        />
      );
    case 'boolean-toggle':
      return <BooleanText field={field} name={name} value={value} required={required} />;
    case 'string-toggle':
      return <StringToggleText field={field} value={value} required={required} />;
    case 'radio-group':
    case 'checkbox-group':
      return (
        <ChoiceText
          group={field.group}
          options={field.options}
          value={value}
          required={required}
          other={other}
        />
      );
    case 'checkbox':
    case 'switch':
      return <YesNoText value={value} />;
    case 'location-selector': {
      const code = isBlank(value) ? null : String(value);
      const address = code
        ? findAddressBySubDistrictCode(
            code,
            field.resolveFromAnySource ? undefined : field.addressSource,
          )
        : undefined;
      return <Shown text={address?.subDistrictName ?? code} required={required} />;
    }
    default:
      return null;
  }
}
