import { useEffect, useState, type SelectHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { TextInput, DateInput } from '@/shared/components/inputs';
import type { ReappraisalFilterValues, ReviewTypeCode } from '../types';

// ─── Local select field (same pattern as TaskFilterDialog) ────────────────────

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (value: string | undefined) => void;
  value: string | undefined;
}

function SelectField({ label, options, placeholder, value, onChange, ...rest }: SelectFieldProps) {
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

// ─── Component ────────────────────────────────────────────────────────────────

interface ReappraisalFilterDialogProps {
  open: boolean;
  initialValues: ReappraisalFilterValues;
  onApply: (values: ReappraisalFilterValues) => void;
  onClose: () => void;
}

export function ReappraisalFilterDialog({
  open,
  initialValues,
  onApply,
  onClose,
}: ReappraisalFilterDialogProps) {
  const { t } = useTranslation(['reappraisal', 'common']);
  const [values, setValues] = useState<ReappraisalFilterValues>(initialValues);

  const reviewTypeOptions = (['1', '2', '3'] as ReviewTypeCode[]).map(value => ({
    value,
    label: t(`reviewType.${value}`),
  }));

  useEffect(() => {
    if (open) setValues(initialValues);
  }, [open, initialValues]);

  const handleClear = () => setValues({});

  const handleApply = () => {
    onApply(values);
    onClose();
  };

  const hasDateRange = !!values.reviewDateFrom || !!values.reviewDateTo;
  const hasRemainingRange = values.remainingDayFrom != null || values.remainingDayTo != null;

  return (
    <Modal isOpen={open} onClose={onClose} title={t('filter.title')} size="lg">
      <div className="space-y-5">
        {/* ── Text fields ── */}
        <section className="grid grid-cols-2 gap-x-4 gap-y-4">
          <TextInput
            label={t('filter.fields.customerName')}
            placeholder={t('filter.placeholders.customerName')}
            value={values.customerName ?? ''}
            onChange={e => setValues(v => ({ ...v, customerName: e.target.value || undefined }))}
          />
          <TextInput
            label={t('filter.fields.oldAppraisalReportNumber')}
            placeholder={t('filter.placeholders.oldAppraisalReportNumber')}
            value={values.oldAppraisalReportNumber ?? ''}
            onChange={e =>
              setValues(v => ({
                ...v,
                oldAppraisalReportNumber: e.target.value || undefined,
              }))
            }
          />
          <TextInput
            label={t('filter.fields.cifNumber')}
            placeholder={t('filter.placeholders.cifNumber')}
            value={values.cifNumber ?? ''}
            onChange={e => setValues(v => ({ ...v, cifNumber: e.target.value || undefined }))}
          />
          <TextInput
            label={t('filter.fields.collateralId')}
            placeholder={t('filter.placeholders.collateralId')}
            value={values.collateralId ?? ''}
            onChange={e => setValues(v => ({ ...v, collateralId: e.target.value || undefined }))}
          />
          <SelectField
            label={t('filter.fields.reviewType')}
            placeholder={t('common:select.placeholder')}
            options={reviewTypeOptions}
            value={values.reviewType}
            onChange={reviewType =>
              setValues(v => ({ ...v, reviewType: reviewType as ReviewTypeCode | undefined }))
            }
          />
        </section>

        <div className="border-t border-gray-100" />

        {/* ── Appraisal Date range ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {t('filter.reviewDateRange')}
            </h3>
            {hasDateRange && (
              <button
                type="button"
                onClick={() =>
                  setValues(v => ({
                    ...v,
                    reviewDateFrom: undefined,
                    reviewDateTo: undefined,
                  }))
                }
                className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
              >
                <Icon style="regular" name="xmark" className="size-3" />
                {t('filter.clearDates')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('common:range.from')}
              </label>
              <DateInput
                value={values.reviewDateFrom ?? null}
                onChange={val => setValues(v => ({ ...v, reviewDateFrom: val ?? undefined }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('common:range.to')}
              </label>
              <DateInput
                value={values.reviewDateTo ?? null}
                onChange={val => setValues(v => ({ ...v, reviewDateTo: val ?? undefined }))}
              />
            </div>
          </div>
        </section>

        <div className="border-t border-gray-100" />

        {/* ── Remaining Days range ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {t('filter.remainingDays')}
            </h3>
            {hasRemainingRange && (
              <button
                type="button"
                onClick={() =>
                  setValues(v => ({
                    ...v,
                    remainingDayFrom: undefined,
                    remainingDayTo: undefined,
                  }))
                }
                className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
              >
                <Icon style="regular" name="xmark" className="size-3" />
                {t('filter.clearRange')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('common:range.from')}
              </label>
              <input
                type="number"
                min={0}
                placeholder={t('filter.placeholders.remainingDayFrom')}
                value={values.remainingDayFrom ?? ''}
                onChange={e =>
                  setValues(v => ({
                    ...v,
                    remainingDayFrom: e.target.value !== '' ? Number(e.target.value) : undefined,
                  }))
                }
                className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('common:range.to')}
              </label>
              <input
                type="number"
                min={0}
                placeholder={t('filter.placeholders.remainingDayTo')}
                value={values.remainingDayTo ?? ''}
                onChange={e =>
                  setValues(v => ({
                    ...v,
                    remainingDayTo: e.target.value !== '' ? Number(e.target.value) : undefined,
                  }))
                }
                className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            {t('common:actions.clear')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply}>
            {t('common:actions.apply')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
