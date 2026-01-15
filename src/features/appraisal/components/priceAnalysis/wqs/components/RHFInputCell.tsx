import { NumberInput } from '@/shared/components';
import { Input } from '@headlessui/react';
import { useController, useFormContext } from 'react-hook-form';

export function toNumber(v: any) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

interface RHFInputCellProps {
  fieldName: string;
  inputType?: 'number' | 'select' | 'text' | 'display' | 'component';
  options?: { label: string; value: string }[];
}
export const RHFInputCell = ({ fieldName, inputType, options }: RHFInputCellProps) => {
  const { control, getValues } = useFormContext();
  const { field } = useController({ control, name: fieldName });

  if (inputType === 'number') {
    return (
      <NumberInput
        {...field}
        value={field.value ?? ''}
        onChange={e => field.onChange(toNumber(e.target.value))}
        inputMode="numeric"
        className="w-full border border-gray-300 rounded-lg px-2 py-2"
      />
    );
  }

  if (inputType === 'select') {
    return (
      <select
        className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
        value={field.value ?? ''}
        onChange={e => field.onChange(e.target.value)}
      >
        {(options ?? []).map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  // text default
  if (inputType === 'text') {
    return <Input {...field} value={field.value ?? ''} />;
  }

  if (inputType === 'display') {
    return <span>{`${getValues(fieldName)}`}</span>;
  }
};
