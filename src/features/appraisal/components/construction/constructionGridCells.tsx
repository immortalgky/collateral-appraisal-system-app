import clsx from 'clsx';
import { pct, TH } from './constructionGrid';

/** Presentational cells shared by the detail grid and the summary form. */

/**
 * This round against the previous one. A 0 against a previous figure may just be "not entered yet"
 * (see constructionGrid): a dash while editing, the change in neutral grey when `final`.
 */
export function Change({
  from,
  to,
  final = false,
  incomplete = false,
}: {
  from: number;
  to: number;
  final?: boolean;
  /** A total over rows some of which are still "not entered yet": its figure is not a real one. */
  incomplete?: boolean;
}) {
  const d = Math.round((to - from) * 100) / 100;
  const unknown = (to === 0 && from > 0) || incomplete;
  if (unknown && !final) return <span className="text-[#8a96a0]">—</span>;
  return (
    <span
      className={clsx(
        'font-medium',
        unknown || d === 0 ? 'text-[#8a96a0]' : d > 0 ? 'text-[#15803d]' : 'text-[#dc2626]',
      )}
    >
      {d > 0 ? '+' : d < 0 ? '−' : ''}
      {pct(Math.abs(d))}
    </span>
  );
}

/** A right-aligned column header with its unit on a second line; shared with the summary form. */
export function HeaderCell({
  label,
  unit,
  className,
}: {
  label: string;
  unit: string;
  className?: string;
}) {
  return (
    <th className={clsx(TH, 'text-right', className)}>
      {label}
      <span className="block text-[10px] text-[#8a96a0] font-normal leading-[12px]">{unit}</span>
    </th>
  );
}
