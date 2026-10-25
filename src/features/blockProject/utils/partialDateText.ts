import { isValidPartialDate } from './partialDate';

/** Buddhist Era offset from CE. */
export const BE_OFFSET = 543;

/** Splits a CE-canonical partial date: null | "YYYY" | "YYYY-MM" | "YYYY-MM-DD". */
export function parseValue(value: string | null | undefined) {
  if (!value) return { year: '', month: '', day: '' };
  const [y = '', m = '', d = ''] = value.split('-');
  return { year: y, month: m, day: d };
}

/** True when the user's chosen language is Thai: the year is shown in Buddhist Era then. */
export function shouldShowBE(language: string | undefined): boolean {
  return (language ?? '').toLowerCase() === 'th';
}

/** A year as the year dropdown labels it (CE, or Buddhist Era in Thai). */
export const yearLabel = (year: number, isBE: boolean) => String(isBE ? year + BE_OFFSET : year);

/** A month (1-12) as the month dropdown labels it: its long name in the UI language. */
export const monthLabel = (locale: string, month: number) =>
  new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, month - 1, 1));

/**
 * A partial date for a read page: the stored parts, labelled as the Year / Month / Day dropdowns
 * label them, joined day / month / year ("5 March 2026", "2569"). Everything from the first part
 * that is not valid is left out (a month needs a valid year, a day a valid month and to exist in
 * it, by `isValidPartialDate`); null when no year is left.
 */
export function partialDateText(
  value: string | null | undefined,
  language: string | undefined,
  locale: string,
): string | null {
  const { year, month, day } = parseValue(value);
  const valid = (s: string) => isValidPartialDate(s) && s !== '';
  const hasYear = valid(year);
  const hasMonth = hasYear && valid(`${year}-${month}`);
  const hasDay = hasMonth && valid(`${year}-${month}-${day}`);
  if (!hasYear) return null;
  return [
    hasDay && String(Number(day)),
    hasMonth && monthLabel(locale, Number(month)),
    yearLabel(Number(year), shouldShowBE(language)),
  ]
    .filter(Boolean)
    .join(' ');
}
