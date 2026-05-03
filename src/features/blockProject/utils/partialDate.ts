/**
 * Validates a partial-precision date string used by Project.projectSaleLaunchDate.
 *
 * Three accepted shapes:
 *   • "YYYY"        — year only         (e.g. "2025")
 *   • "YYYY-MM"     — year + month      (e.g. "2025-05")
 *   • "YYYY-MM-DD"  — full calendar date (e.g. "2025-05-15")
 *
 * Null / undefined / empty is treated as "no value" and is considered valid —
 * the caller decides whether the field is optional.
 *
 * For the full-date case the value is also checked against the calendar
 * (rejects "2025-02-30", "2025-13-01", etc.) by round-tripping through
 * a Date and verifying the parts match.
 */
const SHAPE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;

export function isValidPartialDate(value: string | null | undefined): boolean {
  if (value == null || value === '') return true;
  if (!SHAPE.test(value)) return false;

  // Year only or year-month — already constrained by the regex.
  if (value.length !== 10) return true;

  // Full date — verify it's a real calendar day.
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}
