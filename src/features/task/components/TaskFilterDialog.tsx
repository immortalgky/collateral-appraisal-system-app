import { useEffect, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import type { TaskFilterParams } from '../types';

const TASK_STATUS_OPTIONS = [
  { value: 'Assigned', label: 'Assigned' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
];

const TASK_TYPE_OPTIONS = [
  { value: 'Pending Check', label: 'Pending Check' },
  { value: 'Pending Assign', label: 'Pending Assign' },
  { value: 'Pending Appointment', label: 'Pending Appointment' },
  { value: 'Pending Appraisal', label: 'Pending Appraisal' },
  { value: 'Pending Check Appraisal Book', label: 'Pending Check Appraisal Book' },
];

interface TaskFilterDialogProps {
  open: boolean;
  initialValues: TaskFilterParams;
  onApply: (values: TaskFilterParams) => void;
  onClose: () => void;
}

export function TaskFilterDialog({ open, initialValues, onApply, onClose }: TaskFilterDialogProps) {
  const [values, setValues] = useState<TaskFilterParams>(initialValues);

  // Sync local state when dialog opens
  useEffect(() => {
    if (open) setValues(initialValues);
  }, [open, initialValues]);

  const handleClear = () => setValues({});

  const handleApply = () => {
    onApply(values);
    onClose();
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none';
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Filter</h2>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {/* Appraisal Report No */}
            <div>
              <label className={labelClass}>Appraisal Report No.</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Enter report no."
                value={values.appraisalNumber ?? ''}
                onChange={e => setValues(v => ({ ...v, appraisalNumber: e.target.value || undefined }))}
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className={labelClass}>Customer Name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Enter customer name"
                value={values.customerName ?? ''}
                onChange={e => setValues(v => ({ ...v, customerName: e.target.value || undefined }))}
              />
            </div>

            {/* Request Status */}
            <div>
              <label className={labelClass}>Appraisal Request Status</label>
              <select
                className={inputClass}
                value={values.taskStatus ?? ''}
                onChange={e => setValues(v => ({ ...v, taskStatus: e.target.value || undefined }))}
              >
                <option value="">Please Select</option>
                {TASK_STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Task Type */}
            <div>
              <label className={labelClass}>Task Type</label>
              <select
                className={inputClass}
                value={values.taskType ?? ''}
                onChange={e => setValues(v => ({ ...v, taskType: e.target.value || undefined }))}
              >
                <option value="">Please Select</option>
                {TASK_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className={labelClass}>Function Date From</label>
              <input
                type="date"
                className={inputClass}
                value={values.dateFrom ?? ''}
                onChange={e => setValues(v => ({ ...v, dateFrom: e.target.value || undefined }))}
              />
            </div>

            {/* Date To */}
            <div>
              <label className={labelClass}>To</label>
              <input
                type="date"
                className={inputClass}
                value={values.dateTo ?? ''}
                onChange={e => setValues(v => ({ ...v, dateTo: e.target.value || undefined }))}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary/90"
            >
              Apply
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
