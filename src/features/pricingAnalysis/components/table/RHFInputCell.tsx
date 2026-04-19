import { Dropdown, NumberInput, TextInput, Toggle, type ListBoxItem } from '@/shared/components';
import clsx from 'clsx';
import { createContext, useContext } from 'react';
import { useController, useFormContext, useFormState } from 'react-hook-form';
import TDropdown from './TDropdown';

// When true, every RHFInputCell inside this subtree renders plain text instead
// of an input control. Used by the "View Assumption Summary" modal so the
// existing method-modal layouts can be reused as a read-only summary without
// duplicating structure or passing isReadOnly props through every component.
const DisplayOnlyContext = createContext(false);

export const DisplayOnlyProvider = DisplayOnlyContext.Provider;

export function toNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;

  const raw = String(v ?? '')
    .replace(/,/g, '')
    .trim();
  if (raw === '' || raw === '-') return null;

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

interface RHFInputCellProps {
  fieldName: string;
  inputType?: 'number' | 'select' | 'text' | 'display' | 'toggle';
  disabled?: boolean;
  number?: {
    label?: string;
    decimalPlaces?: number;
    maxIntegerDigits?: number;
    allowNegative?: boolean;
    maxValue?: number;
    minValue?: number;
  };
  toggle?: {
    checked: unknown;
    options: [string, string];
  };
  text?: {
    label?: string;
    maxLength?: number;
  };
  dropdown?: {
    label?: string;
    showValue?: boolean;
  };
  options?: ListBoxItem[];
  onUserChange?: (value: number | null) => number | null;
  onSelectChange?: (value: string) => void;
  accessor?: (args: {
    value: number | string;
    getValues: any;
    getFieldState: any;
    formState: any;
  }) => React.ReactNode;
}
export const RHFInputCell = ({
  fieldName,
  inputType,
  disabled,
  number,
  toggle,
  text,
  dropdown,
  options,
  onUserChange,
  onSelectChange,
  accessor,
}: RHFInputCellProps) => {
  const { control, getValues, getFieldState } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ control, name: fieldName });
  const formState = useFormState({ control });

  const displayOnly = useContext(DisplayOnlyContext);
  if (displayOnly && inputType !== 'display') {
    const raw = field.value;
    let rendered: React.ReactNode;
    if (inputType === 'number') {
      const n = toNumber(raw);
      rendered = n == null
        ? '—'
        : n.toLocaleString(undefined, {
            maximumFractionDigits: number?.decimalPlaces ?? 4,
            minimumFractionDigits: number?.decimalPlaces ?? 0,
          });
    } else if (inputType === 'select') {
      const match = (options ?? []).find(o => o.value === raw);
      rendered = match?.label ?? (raw ? String(raw) : '—');
    } else if (inputType === 'toggle') {
      const opts: [string, string] = toggle?.options ?? ['No', 'Yes'];
      rendered = raw ? opts[1] : opts[0];
    } else {
      rendered = raw == null || raw === '' ? '—' : String(raw);
    }
    return <span className="text-xs text-gray-800">{rendered}</span>;
  }

  if (inputType === 'number') {
    return (
      <NumberInput
        {...field}
        label={number?.label ?? ''}
        value={field.value ?? ''}
        decimalPlaces={number?.decimalPlaces}
        maxIntegerDigits={number?.maxIntegerDigits}
        onChange={e => {
          const parsed = toNumber(e.target.value);
          const next = onUserChange ? onUserChange(parsed as any) : parsed;
          field.onChange(next);
        }}
        max={number?.maxValue}
        min={number?.minValue}
        allowNegative={number?.allowNegative ?? true}
        disabled={disabled}
        error={error?.message}
        inputMode="numeric"
        className={clsx(
          'w-full border border-gray-300 rounded-lg px-1.5 py-0.5 text-xs focus:scroll-smooth',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-100',
        )}
      />
    );
  }

  if (inputType === 'select') {
    return (
      <TDropdown
        {...field}
        value={field.value ?? ''}
        onChange={(value: any) => {
          field.onChange(value);
          onSelectChange?.(value);
        }}
        label={dropdown?.label ?? ''}
        options={options ?? []}
        showValue={dropdown?.showValue ?? true}
        error={error?.message}
      />
    );
  }

  if (inputType === 'toggle') {
    return (
      <Toggle
        {...field}
        options={toggle.options ?? []}
        checked={field.value}
        onChange={e => {
          const next = onUserChange ? onUserChange(e as any) : e;
          field.onChange(next);
        }}
      ></Toggle>
    );
  }

  // text default
  if (inputType === 'text') {
    return (
      <TextInput
        {...field}
        value={field.value ?? ''}
        onChange={e => {
          const next = onUserChange ? onUserChange(e as any) : e;
          field.onChange(next);
        }}
        label={text?.label ?? ''}
        error={error?.message}
        maxLength={text?.maxLength}
      />
    );
  }

  if (inputType === 'display') {
    const value = getValues(fieldName) ?? '';
    return accessor ? accessor({ value, getValues, getFieldState, formState }) : value;
  }
};
