import { useMemo } from 'react';
import { useAddressStore, useCompanyStore } from '@/shared/store';
import { useParameterOptions } from '@/shared/utils/parameterUtils';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { useSearchRequestors } from '@/features/request/api/requestors';
import { addDays, formatDate } from '@/shared/utils/dateUtils';
import type { FilterField } from './tabConfigs';

export interface FilterOption {
  value: string;
  label: string;
}

/** From this many options up, the panel offers a search box. */
export const SEARCHABLE_FROM = 10;

/**
 * From this many options up, the list is cut to LIST_CAP until the user types.
 *
 * Province is the case that sets this: the master holds all 77 whether or not any appraisal sits
 * in them, and scrolling 77 rows to reach "สงขลา" is slower than typing three characters.
 */
export const BIG_FROM = 40;

/** How many rows a big list shows before the user searches. */
export const LIST_CAP = 12;

/**
 * The selectable values for one filter field, in the user's language.
 *
 * Every source is read on every call — hooks cannot be called conditionally — and the switch
 * picks one. That is the same data the single-value controls used: `Dropdown group=…` for
 * parameter groups, `ProvinceAutocomplete` for provinces, `CompanyAutocomplete` for companies,
 * so a chip and the old dropdown always agree on what a code is called.
 */
export function useFilterFieldOptions(field: FilterField, search = ''): FilterOption[] {
  const parameterOptions = useParameterOptions(field.parameterGroup ?? '');
  const titleAddresses = useAddressStore(s => s.titleAddresses);
  const dopaAddresses = useAddressStore(s => s.dopaAddresses);
  const companies = useCompanyStore(s => s.companies);
  const localizeCompanyName = useLocalizedCompanyName();
  // Only a requestor field searches; for every other field the query stays disabled (empty term).
  const { data: requestors } = useSearchRequestors(
    field.type === 'requestor-autocomplete' ? search : '',
  );

  const provinceOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const addr of [...titleAddresses, ...dopaAddresses]) {
      if (!seen.has(addr.provinceCode)) seen.set(addr.provinceCode, addr.provinceName);
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, 'th'),
    );
  }, [titleAddresses, dopaAddresses]);

  const companyOptions = useMemo(
    () =>
      companies
        .map(c => ({ value: c.id, label: localizeCompanyName(c.companyName, c.companyNameLocal) }))
        // Backend orders by the English name, which reads arbitrary once labels are localized.
        .sort((a, b) => a.label.localeCompare(b.label)),
    [companies, localizeCompanyName],
  );

  return useMemo(() => {
    switch (field.type) {
      case 'select':
        return field.options ?? [];
      case 'parameter-select':
        // Retired codes stay filterable through the URL but are not offered here — same rule the
        // dropdown applied with filterOptions={{ type: 'isActive', values: true }}.
        return parameterOptions
          .filter(o => o.isActive !== false)
          .map(o => ({ value: String(o.value), label: o.label }));
      case 'province-autocomplete':
        return provinceOptions;
      case 'company-autocomplete':
        return companyOptions;
      case 'requestor-autocomplete':
        // `employeeId` is the user's UserName — the value request.Requests.Requestor holds.
        return (requestors ?? []).map(r => {
          const label = r.name ? `${r.name} (${r.employeeId})` : r.employeeId;
          requestorLabels.set(r.employeeId, label);
          return { value: r.employeeId, label };
        });
      default:
        // date, date-range and text carry no option list.
        return [];
    }
  }, [field, parameterOptions, provinceOptions, companyOptions, requestors]);
}

/** yyyy-MM-dd in local time, n days from today — the same shape DateRangeInput writes. */
const dayOffset = (n: number) => formatDate(addDays(new Date(), n));

/**
 * One-click ranges, relative to the viewer's today and computed at click time. Both ends are
 * inclusive, so "7 days" is today plus six — seven calendar days, as the label says.
 */
export const DATE_PRESETS = [
  { key: 'today', range: () => [dayOffset(0), dayOffset(0)] },
  { key: 'tomorrow', future: true, range: () => [dayOffset(1), dayOffset(1)] },
  { key: 'next7', future: true, range: () => [dayOffset(0), dayOffset(6)] },
  { key: 'past7', range: () => [dayOffset(-6), dayOffset(0)] },
  { key: 'past30', range: () => [dayOffset(-29), dayOffset(0)] },
] as const;

/** The preset a stored range corresponds to, so a chip can say "Today" instead of two dates. */
export const presetFor = (from: string, to: string) =>
  DATE_PRESETS.find(p => {
    const [f, t] = p.range();
    return f === from && t === to;
  });

/**
 * Names of requestors seen in any search this session, by user code. A remote field only knows
 * the labels of its CURRENT results, so a value picked earlier would otherwise fall back to its
 * bare code once the search box is cleared.
 * ponytail: session-lifetime module cache, unbounded; fine for the few dozen names one user picks.
 */
const requestorLabels = new Map<string, string>();
export const requestorLabel = (code: string) => requestorLabels.get(code);

/** Values currently set on a field, as a list. Empty when the field is not filtered. */
export const selectedValues = (values: Record<string, string>, key: string): string[] =>
  (values[key] || '').split(',').filter(Boolean);

/**
 * Is this field filtering anything right now?
 *
 * A date-range field writes two OTHER keys (`createdFrom`/`createdTo`) and never its own, so
 * asking `values[field.key]` would report every range as unset.
 */
export const isFieldActive = (values: Record<string, string>, field: FilterField): boolean =>
  field.type === 'date-range'
    ? Boolean(values[field.fromKey ?? ''] || values[field.toKey ?? ''])
    : // Present-but-empty counts: a field whose values were all unticked keeps its chip (and so
      // keeps its panel mounted) until the user removes it with the X. An absent key does not.
      values[field.key] !== undefined;
