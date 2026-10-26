import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import type { FilterField } from '@/features/appraisal/components/search/tabConfigs';
import { useChipSummary } from '@/features/appraisal/components/search/filterOptions';

function SummaryChip({
  field,
  values,
  onRemove,
}: {
  field: FilterField;
  values: Record<string, string>;
  onRemove: (key: string) => void;
}) {
  const { t } = useTranslation('appraisal');
  const summary = useChipSummary(field, values);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-100 py-1 pr-1 pl-2.5 text-xs whitespace-nowrap text-gray-700">
      <span className="font-medium text-gray-500">{field.label}:</span>
      <span className="max-w-52 truncate">{summary}</span>
      <button
        type="button"
        aria-label={`${t('list.removeFilter')}: ${field.label}`}
        onClick={() => {
          // A range is two keys, its own is only the control's identity
          if (field.type === 'date-range') {
            if (field.fromKey) onRemove(field.fromKey);
            if (field.toKey) onRemove(field.toKey);
          } else onRemove(field.key);
        }}
        className="rounded p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
      >
        <Icon style="solid" name="xmark" className="text-xs" />
      </button>
    </span>
  );
}

/**
 * What the table is filtered by, as removable chips on one row: shown instead of the chip bar while
 * the filter panel is open, so the filters in force stay visible without opening the panel's groups.
 */
export function TaskFilterSummary({
  fields,
  values,
  onRemove,
  onClear,
}: {
  /** The filters that hold a value. */
  fields: FilterField[];
  values: Record<string, string>;
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation(['task', 'common']);
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-gray-100 bg-gray-50/50 px-4 py-2">
      <span className="mr-0.5 text-xs text-gray-500">{t('task:panel.summary')}</span>
      {fields.map(field => (
        <SummaryChip key={field.key} field={field} values={values} onRemove={onRemove} />
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-medium text-primary hover:underline"
      >
        {t('common:actions.clearAll')}
      </button>
    </div>
  );
}
