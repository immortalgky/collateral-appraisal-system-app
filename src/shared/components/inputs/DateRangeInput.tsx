import { useTranslation } from 'react-i18next';
import DatePickerInput from './DatePickerInput';

/**
 * One control, one calendar, for a From/To date pair.
 *
 * Exists because filter bars were spending two full-width controls on every range — the appraisal
 * list burned 8 of its 18 slots on four of them.
 *
 * Thin on purpose: DatePickerInput does the work in `mode="range"`, so the calendar chrome, the
 * month/year panel, the flip-up/flip-left positioning and the ISO output are the same ones every
 * other date field in the product uses. Building a second calendar here would have duplicated
 * ~70 lines that would then drift.
 *
 * The range is drafted in the calendar and applied on an explicit Apply, so choosing a start date
 * does not fire a query for a one-day range on the way to picking the end.
 */
interface DateRangeInputProps {
  from: string;
  to: string;
  /** Called with BOTH ends on every pick; callers usually write two filter keys. */
  onChange: (from: string, to: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * DatePickerInput emits a full ISO timestamp with a timezone offset (e.g.
 * "2020-04-03T00:00:00+07:00"). Keep only the calendar date (yyyy-MM-dd) so a backend date
 * comparison can't shift by a day across timezones.
 */
const toDateOnly = (v: string): string => (v ? v.slice(0, 10) : '');

function DateRangeInput({ from, to, onChange, placeholder, className }: DateRangeInputProps) {
  const { t } = useTranslation('common');
  return (
    <DatePickerInput
      mode="range"
      rangeValue={{ from, to }}
      onRangeChange={(nextFrom, nextTo) => onChange(toDateOnly(nextFrom), toDateOnly(nextTo))}
      rangeLabels={{ apply: t('actions.apply'), clear: t('actions.clear') }}
      placeholder={placeholder}
      className={className}
    />
  );
}

export default DateRangeInput;
