export function readFactorValue(s: {
  dataType: string;
  fieldDecimal?: number | undefined | null;
  value?: string | undefined | null;
}) {
  switch (s.dataType) {
    case 'Numeric':
      return s.fieldDecimal;
    case 'Text':
    case 'Dropdown':
    case 'Data':
      return s.value; // confirm enum name
    case 'Date':
      return s.value;
    default:
      return '';
  }
}

/** Safely coerce a factor value (which may be a string) to a number. */
export function toNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Compute the number of full years from a date string until today. */
export function yearDiffFromToday(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  const diffMs = Date.now() - d.getTime();
  return Math.max(0, Math.round(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
}
