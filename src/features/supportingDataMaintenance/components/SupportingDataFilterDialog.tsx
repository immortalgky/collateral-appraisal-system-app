import { useEffect, useState, type SelectHTMLAttributes } from 'react';
import type { SupportingDataParams } from '../api/types';
import Modal from '@/shared/components/Modal';
import { Button, DateInput, Icon, TextInput } from '@/shared/components';
import clsx from 'clsx';

const SUPPORTING_DATA_STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Reject', label: 'Reject' },
];

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange: (value: string | undefined) => void;
  value: string | undefined;
}

function SelectField({
  label,
  options,
  placeholder = 'Please select',
  value,
  onChange,
  ...rest
}: SelectFieldProps) {
  return (
    <div className="w-full">
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <select
          {...rest}
          value={value ?? ''}
          onChange={e => onChange(e.target.value || undefined)}
          className={clsx(
            'block w-full appearance-none px-3 py-2 pr-9 border rounded-lg text-sm transition-colors duration-200',
            'border-gray-200 bg-white hover:border-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            !value && 'text-gray-400',
          )}
        >
          <option value="">{placeholder}</option>
          {options.map(o => (
            <option key={o.value} value={o.value} className="text-gray-900">
              {o.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
          <Icon style="regular" name="chevron-down" className="size-3.5" />
        </div>
      </div>
    </div>
  );
}

interface SupportingDataFilterProps {
  open: boolean;
  initialValues: SupportingDataParams;
  onApply: (values: SupportingDataParams) => void;
  onClose: () => void;
}

export function SupportingDataFilterDialog({
  open,
  initialValues,
  onApply,
  onClose,
}: SupportingDataFilterProps) {
  const [values, setValues] = useState<SupportingDataParams>(initialValues);

  useEffect(() => {
    if (open) setValues(initialValues);
  }, [open, initialValues]);

  const handleClear = () => setValues({});

  const handleApply = () => {
    onApply(values);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Filter" size="lg">
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-x-4 gap-y-4">
          <TextInput
            label="Supporting No."
            placeholder="Enter supporting no."
            value={values.supportingNumber ?? ''}
            onChange={e =>
              setValues(v => ({ ...v, supportingNumber: e.target.value || undefined }))
            }
          />
          <SelectField
            label="Supporting Data Status"
            options={SUPPORTING_DATA_STATUS_OPTIONS}
            value={values.status}
            onChange={status => setValues(v => ({ ...v, status }))}
          />
          <DateInput
            value={values.createdDate ?? null}
            onChange={val => setValues(v => ({ ...v, createdDate: val ?? undefined }))}
          />
        </section>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
}
