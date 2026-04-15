import { Dropdown, NumberInput, TextInput, Toggle, type ListBoxItem } from '@/shared/components';
import clsx from 'clsx';
import { useController, useFormContext, useFormState } from 'react-hook-form';
import TDropdown from './TDropdown';

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
        disabled={disabled}
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
        disabled={disabled}
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
        disabled={disabled}
      />
    );
  }

  if (inputType === 'display') {
    const value = getValues(fieldName) ?? '';
    return accessor ? accessor({ value, getValues, getFieldState, formState }) : value;
  }
};
