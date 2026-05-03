import { useMemo } from 'react';

import Dropdown, { type ListBoxItem } from '@/shared/components/inputs/Dropdown';
import { useFormReadOnly } from '@/shared/components/form/context';
import { useLocaleStore } from '@shared/store';

interface PartialDateInputProps {
  /** CE-canonical stored value: null | "YYYY" | "YYYY-MM" | "YYYY-MM-DD". */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  /** Inclusive start (CE) of the year dropdown range. Default: currentYear − 30. */
  yearStart?: number;
  /** Inclusive end (CE) of the year dropdown range. Default: currentYear + 5. */
  yearEnd?: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Buddhist Era offset from CE. */
const BE_OFFSET = 543;

function parseValue(value: string | null | undefined) {
  if (!value) return { year: '', month: '', day: '' };
  const [y = '', m = '', d = ''] = value.split('-');
  return { year: y, month: m, day: d };
}

function serialize(year: string, month: string, day: string): string | null {
  if (!year) return null;
  if (!month) return year;
  if (!day) return `${year}-${month}`;
  return `${year}-${month}-${day}`;
}

/** True when the user's chosen language is Thai — display in BE then. */
function shouldShowBE(language: string | undefined): boolean {
  return (language ?? '').toLowerCase() === 'th';
}

/**
 * Partial-precision date picker rendered as three dropdowns (Year / Month / Day).
 *
 * Storage is always CE-canonical (`"YYYY-MM-DD"` etc.). Display follows the
 * user's current locale: Thai → Buddhist Era (พ.ศ.), otherwise CE (ค.ศ.). The
 * dropdown options use CE codes underneath but render BE labels when in Thai;
 * picking from either calendar produces the same canonical CE-string.
 *
 * Month and Day are optional; clearing a higher segment cascades downward.
 */
export default function PartialDateInput({
  value,
  onChange,
  label,
  required,
  disabled,
  error,
  yearStart,
  yearEnd,
}: PartialDateInputProps) {
  const isReadOnly = useFormReadOnly();
  const isDisabled = Boolean(disabled || isReadOnly);
  const language = useLocaleStore(s => s.language);
  const isBE = shouldShowBE(language);

  const { year, month, day } = parseValue(value);

  const now = new Date();
  const start = yearStart ?? now.getFullYear() - 30;
  const end = yearEnd ?? now.getFullYear() + 5;

  // Year options. Stored values stay CE; labels reflect the user's locale.
  const yearOptions = useMemo<ListBoxItem[]>(() => {
    const opts: ListBoxItem[] = [];
    for (let y = end; y >= start; y--) {
      const code = String(y);
      const labelYear = isBE ? y + BE_OFFSET : y;
      opts.push({ id: code, value: code, label: String(labelYear) });
    }
    return opts;
  }, [start, end, isBE]);

  const monthOptions = useMemo<ListBoxItem[]>(
    () =>
      MONTH_NAMES.map((name, i) => {
        const code = String(i + 1).padStart(2, '0');
        return { id: code, value: code, label: name };
      }),
    [],
  );

  const dayOptions = useMemo<ListBoxItem[]>(() => {
    const max = daysInMonth(year, month);
    const opts: ListBoxItem[] = [];
    for (let d = 1; d <= max; d++) {
      const code = String(d).padStart(2, '0');
      opts.push({ id: code, value: code, label: String(d) });
    }
    return opts;
  }, [year, month]);

  const handleYearChange = (next: string | null | undefined) => {
    if (!next) {
      onChange(null);
      return;
    }
    onChange(serialize(next, month, dropDayIfInvalid(next, month, day)));
  };

  const handleMonthChange = (next: string | null | undefined) => {
    if (!year) return;
    if (!next) {
      onChange(serialize(year, '', ''));
      return;
    }
    onChange(serialize(year, next, dropDayIfInvalid(year, next, day)));
  };

  const handleDayChange = (next: string | null | undefined) => {
    if (!year || !month) return;
    onChange(serialize(year, month, next ?? ''));
  };

  return (
    <div>
      {label && (
        <span className="block text-xs font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
          <span className="ml-1.5 text-[10px] text-gray-400 font-normal">
            ({isBE ? 'พ.ศ.' : 'ค.ศ.'})
          </span>
        </span>
      )}

      <div className="grid grid-cols-[1.5fr_1.2fr_0.8fr] gap-2">
        <Dropdown
          options={yearOptions}
          value={year || undefined}
          onChange={handleYearChange}
          placeholder="Year"
          showValuePrefix={false}
          disabled={isDisabled}
          error={error}
        />
        <Dropdown
          options={monthOptions}
          value={month || undefined}
          onChange={handleMonthChange}
          placeholder="Month"
          showValuePrefix={false}
          disabled={isDisabled || !year}
        />
        <Dropdown
          options={dayOptions}
          value={day || undefined}
          onChange={handleDayChange}
          placeholder="Day"
          showValuePrefix={false}
          disabled={isDisabled || !year || !month}
        />
      </div>
    </div>
  );
}

/** Days in a month. Falls back to 31 if year/month is empty. Year argument is in CE. */
function daysInMonth(year: string, month: string): number {
  if (!year || !month) return 31;
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return 31;
  // JS quirk: day 0 of next month = last day of this month.
  return new Date(y, m, 0).getDate();
}

function dropDayIfInvalid(year: string, month: string, day: string): string {
  if (!day) return '';
  if (!year || !month) return '';
  const max = daysInMonth(year, month);
  return Number(day) <= max ? day : '';
}
