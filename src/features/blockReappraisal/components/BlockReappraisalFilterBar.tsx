import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { TextInput, DateInput, NumberInput } from '@/shared/components/inputs';
import type { BlockReappraisalFilterValues } from '../types';

interface BlockReappraisalFilterBarProps {
  values: BlockReappraisalFilterValues;
  onChange: (values: BlockReappraisalFilterValues) => void;
}

/**
 * DateInput emits a full ISO timestamp with a timezone offset (e.g.
 * "2020-04-03T00:00:00+07:00"). Keep only the calendar date (yyyy-MM-dd) so the
 * backend's date comparison can't shift by a day across timezones.
 */
const toDateOnly = (v: string | null): string | undefined =>
  v ? v.slice(0, 10) : undefined;

/**
 * Inline filter bar shown above the due-list table. Each change applies
 * immediately (the parent resets to the first page). Empty inputs clear their key.
 */
export function BlockReappraisalFilterBar({ values, onChange }: BlockReappraisalFilterBarProps) {
  const { t } = useTranslation(['blockReappraisal', 'common']);

  const patch = (next: Partial<BlockReappraisalFilterValues>) =>
    onChange({ ...values, ...next });

  const hasActiveFilter = Object.values(values).some(v => v != null && v !== '');

  return (
    <div className="shrink-0 mb-3">
      {hasActiveFilter && (
        <div className="flex justify-end mb-1.5">
          <button
            onClick={() => onChange({})}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 hover:underline underline-offset-2"
          >
            <Icon style="solid" name="xmark" className="size-2.5" />
            {t('filter.clear')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <TextInput
          label={t('filter.fields.search')}
          placeholder={t('filter.placeholders.search')}
          leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
          value={values.search ?? ''}
          onChange={e => patch({ search: e.target.value || undefined })}
        />

        {/* Last Appraised Date — inclusive From / To range */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('filter.fields.lastAppraisedDate')}
          </label>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              <DateInput
                placeholder={t('filter.placeholders.dateFrom')}
                value={values.lastAppraisedDateFrom ?? null}
                onChange={v => patch({ lastAppraisedDateFrom: toDateOnly(v) })}
              />
            </div>
            <span className="text-gray-300">–</span>
            <div className="flex-1 min-w-0">
              <DateInput
                placeholder={t('filter.placeholders.dateTo')}
                value={values.lastAppraisedDateTo ?? null}
                onChange={v => patch({ lastAppraisedDateTo: toDateOnly(v) })}
              />
            </div>
          </div>
        </div>

        {/* Remaining Day — Min / Max range */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('filter.fields.remainingDay')}
          </label>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              <NumberInput
                placeholder={t('filter.placeholders.min')}
                allowNegative
                decimalPlaces={0}
                value={values.remainingDayMin ?? null}
                onChange={e => patch({ remainingDayMin: e.target.value ?? undefined })}
              />
            </div>
            <span className="text-gray-300">–</span>
            <div className="flex-1 min-w-0">
              <NumberInput
                placeholder={t('filter.placeholders.max')}
                allowNegative
                decimalPlaces={0}
                value={values.remainingDayMax ?? null}
                onChange={e => patch({ remainingDayMax: e.target.value ?? undefined })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
