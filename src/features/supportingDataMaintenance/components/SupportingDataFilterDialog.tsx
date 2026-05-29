import { useEffect, useState, type SelectHTMLAttributes } from 'react';
import { format } from 'date-fns';
import type { SupportingDataDateType, SupportingDataParams } from '../api/types';
import Modal from '@/shared/components/Modal';
import { Button, DateInput, Icon, TextInput } from '@/shared/components';
import clsx from 'clsx';
import { DATE_TYPE_OPTIONS } from '../constants/parameters';

const SUPPORTING_DATA_STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'RoutedBack', label: 'Routed Back' },
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
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setDateRangeError(null);
    }
  }, [open, initialValues]);

  const handleClear = () => {
    setValues({});
    setDateRangeError(null);
  };

  const handleApply = () => {
    if (values.dateFrom && values.dateTo && new Date(values.dateFrom) > new Date(values.dateTo)) {
      setDateRangeError('"From" date cannot be after "To" date.');
      return;
    }
    setDateRangeError(null);

    const toApply = { ...values };
    if (toApply.dateType && !toApply.dateFrom && !toApply.dateTo) {
      delete toApply.dateType;
    }

    onApply(toApply);
    onClose();
  };

  const hasDateRange = !!values.dateFrom || !!values.dateTo || !!values.dateType;
  const selectedDateTypeLabel = DATE_TYPE_OPTIONS.find(o => o.value === values.dateType)?.label;

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
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Date Range
              {selectedDateTypeLabel && (
                <span className="ml-2 normal-case tracking-normal text-gray-400 font-normal">
                  · {selectedDateTypeLabel}
                </span>
              )}
            </h3>
            {hasDateRange && (
              <button
                type="button"
                onClick={() =>
                  setValues(v => ({
                    ...v,
                    dateType: undefined,
                    dateFrom: undefined,
                    dateTo: undefined,
                  }))
                }
                className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
              >
                <Icon style="regular" name="xmark" className="size-3" />
                Clear dates
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-4">
            <SelectField
              label="Date Type"
              options={DATE_TYPE_OPTIONS}
              value={values.dateType}
              onChange={dateType =>
                setValues(v => ({ ...v, dateType: dateType as SupportingDataDateType | undefined }))
              }
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
              <DateInput
                value={values.dateFrom ?? null}
                onChange={val => {
                  setDateRangeError(null);
                  setValues(v => ({
                    ...v,
                    dateFrom: val ? format(new Date(val), 'yyyy-MM-dd') : undefined,
                  }));
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
              <DateInput
                value={values.dateTo ?? null}
                onChange={val => {
                  setDateRangeError(null);
                  setValues(v => ({
                    ...v,
                    dateTo: val ? format(new Date(val), 'yyyy-MM-dd') : undefined,
                  }));
                }}
              />
            </div>
          </div>

          {dateRangeError && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <Icon style="solid" name="circle-exclamation" className="size-3" />
              {dateRangeError}
            </p>
          )}
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
