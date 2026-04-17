import { useEffect, useState, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { TextInput, DateInput } from '@/shared/components/inputs';
import type { TaskDateType, TaskFilterParams } from '../types';
import { ACTIVITY_IDS, getActivityConfig } from '../config/activityConfig';

const REQUEST_STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'UnderReview', label: 'Under Review' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const TASK_TYPE_OPTIONS = ACTIVITY_IDS.map(id => ({
  value: id,
  label: getActivityConfig(id)?.title ?? id,
}));

const DATE_TYPE_OPTIONS: { value: TaskDateType; label: string }[] = [
  { value: 'assigned', label: 'Assign Date' },
  { value: 'appointment', label: 'Appointment Date' },
  { value: 'requested', label: 'Requested At' },
];

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange: (value: string | undefined) => void;
  value: string | undefined;
}

function SelectField({ label, options, placeholder = 'Please select', value, onChange, ...rest }: SelectFieldProps) {
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

interface TaskFilterDialogProps {
  open: boolean;
  initialValues: TaskFilterParams;
  onApply: (values: TaskFilterParams) => void;
  onClose: () => void;
}

export function TaskFilterDialog({ open, initialValues, onApply, onClose }: TaskFilterDialogProps) {
  const [values, setValues] = useState<TaskFilterParams>(initialValues);

  useEffect(() => {
    if (open) setValues(initialValues);
  }, [open, initialValues]);

  const handleClear = () => setValues({});

  const handleApply = () => {
    onApply(values);
    onClose();
  };

  const hasDateRange = !!values.dateFrom || !!values.dateTo || !!values.dateType;
  const selectedDateTypeLabel = DATE_TYPE_OPTIONS.find(o => o.value === values.dateType)?.label;

  return (
    <Modal isOpen={open} onClose={onClose} title="Filter" size="lg">
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-x-4 gap-y-4">
          <TextInput
            label="Appraisal Report No."
            placeholder="Enter report no."
            value={values.appraisalNumber ?? ''}
            onChange={e =>
              setValues(v => ({ ...v, appraisalNumber: e.target.value || undefined }))
            }
          />
          <TextInput
            label="Customer Name"
            placeholder="Enter customer name"
            value={values.customerName ?? ''}
            onChange={e =>
              setValues(v => ({ ...v, customerName: e.target.value || undefined }))
            }
          />
          <SelectField
            label="Appraisal Request Status"
            options={REQUEST_STATUS_OPTIONS}
            value={values.status}
            onChange={status => setValues(v => ({ ...v, status }))}
          />
          <SelectField
            label="Task Type"
            options={TASK_TYPE_OPTIONS}
            value={values.activityId}
            onChange={activityId => setValues(v => ({ ...v, activityId }))}
          />
        </section>

        <div className="border-t border-gray-100" />

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
                setValues(v => ({ ...v, dateType: dateType as TaskDateType | undefined }))
              }
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
              <DateInput
                value={values.dateFrom ?? null}
                onChange={val => setValues(v => ({ ...v, dateFrom: val ?? undefined }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
              <DateInput
                value={values.dateTo ?? null}
                onChange={val => setValues(v => ({ ...v, dateTo: val ?? undefined }))}
              />
            </div>
          </div>
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
