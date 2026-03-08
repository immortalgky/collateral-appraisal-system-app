export function readFactorValue(s: {
  dataType: string;
  fieldDecimal?: number | undefined | null;
  value?: string | undefined | null;
}) {
  switch (s.dataType) {
    case 'Numeric':
      return s.value;
    case 'Text':
    case 'Dropdown':
    case 'CheckboxGroup':
    case 'Data':
    default: {
      if (!s.value) return '';
      // Handle JSON array strings like '["01","02","03"]' → '01,02,03'
      if (s.value.startsWith('[')) {
        try {
          const arr = JSON.parse(s.value);
          if (Array.isArray(arr)) return arr.join(',');
        } catch { /* not valid JSON, return as-is */ }
      }
      return s.value;
    }
  }
}

/** Safely coerce a factor value (which may be a string) to a number. */
export function toNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Compute the number of full years from a date string until today. */
export function yearDiffFromToday(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  const monthDiff =
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  return Math.max(0, Math.round(monthDiff / 12));
}
