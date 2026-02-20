import { Dropdown, NumberInput, TextInput, Toggle, type ListBoxItem } from '@/shared/components';
import { Input } from '@headlessui/react';
import clsx from 'clsx';
import { useController, useFormContext, useFormState } from 'react-hook-form';

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
  toggle?: {
    checked: unknown;
    options: [string, string];
  };
  text?: {
    label: string;
  };
  options?: ListBoxItem[];
  onUserChange?: (value: number | null) => number | null;
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
  toggle,
  text,
  options,
  onUserChange,
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
        value={field.value ?? ''}
        onChange={e => {
          const parsed = toNumber(e.target.value);
          const next = onUserChange ? onUserChange(parsed as any) : parsed;
          field.onChange(next);
        }}
        allowNegative={true}
        error={error?.message}
        inputMode="numeric"
        className={clsx('w-full border border-gray-300 rounded-lg px-2 py-2 focus:scroll-smooth')}
      />
    );
  }

  if (inputType === 'select') {
    const dropdownProps = {
      required: false,
      disabled: false,
    };

    return <Dropdown {...field} {...dropdownProps} options={options} error={error?.message} />; // TODO error message on validation
  }

  if (inputType === 'toggle') {
    return (
      <Toggle
        {...field}
        options={toggle.options}
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
      />
    );
  }

  if (inputType === 'display') {
    const value = getValues(fieldName) ?? '';
    return accessor ? accessor({ value, getValues, getFieldState, formState }) : value;
  }
};
