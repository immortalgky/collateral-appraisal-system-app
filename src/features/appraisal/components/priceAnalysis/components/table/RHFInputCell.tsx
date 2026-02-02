import { Dropdown, NumberInput, type ListBoxItem } from '@/shared/components';
import { Input } from '@headlessui/react';
import { useController, useFormContext } from 'react-hook-form';

export function toNumber(v: any) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

interface RHFInputCellProps {
  fieldName: string;
  inputType?: 'number' | 'select' | 'text' | 'display';
  options?: ListBoxItem[];
  compute?: (value: number) => number;
  accessor?: (value: number | string) => string;
}
export const RHFInputCell = ({
  fieldName,
  inputType,
  options,
  compute,
  accessor,
}: RHFInputCellProps) => {
  const { control, getValues } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ control, name: fieldName });

  if (inputType === 'number') {
    return (
      <NumberInput
        {...field}
        value={field.value ?? ''}
        onChange={e => {
          const value = compute ? compute(toNumber(e.target.value)) : toNumber(e.target.value);
          field.onChange(value);
        }}
        allowNegative={true}
        error={error?.message}
        inputMode="numeric"
        className="w-full border border-gray-300 rounded-lg px-2 py-2 focus:scroll-smooth"
      />
    );
  }

  if (inputType === 'select') {
    return <Dropdown {...field} options={options ?? []} error={error?.message} />; // TODO error message on validation
  }

  // text default
  if (inputType === 'text') {
    return <Input {...field} value={field.value ?? ''} error={error?.message} />;
  }

  if (inputType === 'display') {
    const value = getValues(fieldName) ?? '';
    console.log(value);
    return (
      <div className="flex truncate" title={getValues(fieldName)}>
        {accessor ? accessor(value) : value}
      </div>
    );
  }
};
