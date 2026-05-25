import { useTranslation } from 'react-i18next';
import Dropdown, { type ListBoxItem } from '@shared/components/inputs/Dropdown';
import type { GroupByField } from '../api/types';

type GroupByValue = GroupByField | null;

interface GroupByToggleProps {
  value: GroupByValue;
  onChange: (value: GroupByValue) => void;
  /** Restrict which group-by fields to expose. Defaults to all three. */
  availableFields?: GroupByField[];
}

const DEFAULT_FIELDS: GroupByField[] = ['pic', 'company', 'activity'];

/**
 * Compact dropdown for selecting group-by field.
 * Renders on Internal, External, Followups, and Quotations tabs.
 * Hidden on Evaluations and Meeting Followups (those tabs don't call this component).
 */
function GroupByToggle({ value, onChange, availableFields = DEFAULT_FIELDS }: GroupByToggleProps) {
  const { t } = useTranslation('monitoring');

  const allOptions: ListBoxItem[] = [
    { value: 'pic', label: t('common.groupBy.pic') },
    { value: 'company', label: t('common.groupBy.company') },
    { value: 'activity', label: t('common.groupBy.activity') },
  ];
  const options = allOptions.filter(o => availableFields.includes(o.value as GroupByField));

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[11px] text-gray-500 font-medium shrink-0">
        {t('common.groupBy.label')}:
      </span>
      <div className="w-36">
        <Dropdown
          options={options}
          value={value ?? undefined}
          onChange={v => onChange((v as GroupByValue) ?? null)}
          placeholder={t('common.groupBy.none')}
          showValuePrefix={false}
        />
      </div>
    </div>
  );
}

export default GroupByToggle;
