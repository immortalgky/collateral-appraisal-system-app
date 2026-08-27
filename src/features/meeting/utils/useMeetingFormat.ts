/**
 * Locale-aware formatters for the meeting screens.
 *
 * Replaces the previous hardcoded `toLocaleString('en-GB', …)` on the detail page, which
 * rendered English dates even when the app was switched to Thai. Everything here follows the
 * active i18n language via the shared `useFormatters` hooks.
 */
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

const EM_DASH = '—';

/**
 * Assembles `dd/MM/yyyy` (+ optional ` HH:mm`) from formatted parts.
 *
 * Going through `formatToParts` rather than hardcoding `getDate()`/`getMonth()` keeps the
 * locale's CALENDAR intact — Thai renders the Buddhist year (2569, not 2026) — while still
 * pinning the field order and separators to the requested format. It also drops the comma
 * `Intl` inserts between date and time.
 */
const assemble = (formatter: Intl.DateTimeFormat, date: Date, withTime: boolean): string => {
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '';

  const day = `${get('day')}/${get('month')}/${get('year')}`;
  return withTime ? `${day} ${get('hour')}:${get('minute')}` : day;
};

export const useMeetingFormat = () => {
  const { i18n } = useTranslation();
  const isThai = i18n.language?.startsWith('th');
  const dateLocale = isThai ? 'th-TH-u-ca-buddhist' : 'en-GB';
  const numberLocale = isThai ? 'th-TH' : 'en-US';

  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(dateLocale, DATE_TIME_OPTIONS),
    [dateLocale],
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(dateLocale, DATE_OPTIONS),
    [dateLocale],
  );
  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [numberLocale],
  );
  const compactFormatter = useMemo(
    () => new Intl.NumberFormat(numberLocale, { notation: 'compact', maximumFractionDigits: 2 }),
    [numberLocale],
  );

  /** `dd/MM/yyyy HH:mm`, or an em dash when absent. */
  const formatDateTime = useCallback(
    (iso: string | null | undefined): string =>
      iso ? assemble(dateTimeFormatter, new Date(iso), true) : EM_DASH,
    [dateTimeFormatter],
  );

  /** `dd/MM/yyyy`, or an em dash when absent. */
  const formatDate = useCallback(
    (iso: string | null | undefined): string =>
      iso ? assemble(dateFormatter, new Date(iso), false) : EM_DASH,
    [dateFormatter],
  );

  /**
   * Money with 2 decimals. Returns an em dash for null/undefined — a *missing* valuation must
   * not render as `0.00`, which reads as a real zero.
   */
  const formatMoney = useCallback(
    (value: number | null | undefined): string =>
      value == null || !Number.isFinite(value) ? EM_DASH : moneyFormatter.format(value),
    [moneyFormatter],
  );

  /** Abbreviated money for KPI tiles and chart labels, e.g. `1.2M`. */
  const formatCompact = useCallback(
    (value: number | null | undefined): string =>
      value == null || !Number.isFinite(value) ? EM_DASH : compactFormatter.format(value),
    [compactFormatter],
  );

  return { formatDateTime, formatDate, formatMoney, formatCompact };
};

export { EM_DASH };
