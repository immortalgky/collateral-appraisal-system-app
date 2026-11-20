import { useMemo } from 'react';
import { useParameterStore, useLocaleStore, useDealerStore } from '../store';
import type { Parameter } from '../types/api';
import type { ListBoxItem } from '../components/inputs/Dropdown';
import type { CheckboxOption } from '../components/inputs/CheckboxGroup';
import type { RadioOption } from '../components/inputs/RadioGroup';

// =============================================================================
// Sync utilities (read from Zustand store directly, for use outside React)
// =============================================================================

/**
 * Resolves a group for a locale, falling back to the EN rows when the requested language has none.
 * parameter.Parameters only carries EN and TH rows, so without this every parameter-driven dropdown
 * renders empty for a user on any other locale (e.g. ZH).
 */
function resolveGroup(
  parameters: Record<string, Parameter[]>,
  group: string,
  country: string,
  language: string,
): Parameter[] {
  const key = `${group}.${country}.${language}`.toLowerCase();
  const rows = parameters[key];
  if (rows?.length) return otherLast(rows);

  const fallbackKey = `${group}.${country}.en`.toLowerCase();
  return otherLast(parameters[fallbackKey] ?? []);
}

/** The parameter code for "other": always the last option, wherever its SeqNo puts it. */
const OTHER_CODE = '99';

/**
 * Every option list (chips, radios, dropdowns) comes through here, so this is the one place that
 * orders them: SeqNo order as stored, then "other" (code 99) moved to the end, the rest untouched.
 * Returns the same array when it is already in that order.
 */
function otherLast(rows: Parameter[]): Parameter[] {
  const firstOther = rows.findIndex(r => r.code === OTHER_CODE);
  if (firstOther < 0 || rows.slice(firstOther).every(r => r.code === OTHER_CODE)) return rows;
  return [...rows.filter(r => r.code !== OTHER_CODE), ...rows.filter(r => r.code === OTHER_CODE)];
}

/** Returns Parameter[] filtered by group + current locale (falls back to EN) */
export function getParametersByGroup(group: string): Parameter[] {
  const { parameters } = useParameterStore.getState();
  const { country, language } = useLocaleStore.getState();
  return resolveGroup(parameters, group, country, language);
}

/** Returns description for a group+code, falls back to code */
export function getParameterDescription(group: string, code: string): string {
  const params = getParametersByGroup(group);
  const param = params.find(p => p.code === code);
  return param?.description ?? code;
}

/** Returns ListBoxItem[] for dropdowns */
export function getParameterOptions(group: string): ListBoxItem[] {
  const params = getParametersByGroup(group);
  return params.map(p => ({
    value: p.code,
    label: p.description,
    id: p.code,
  }));
}

// =============================================================================
// React hooks (subscribe to store/locale changes)
// =============================================================================

/** Reactive version of getParametersByGroup (falls back to EN) */
export function useParametersByGroup(
  group: string,
  useCountry?: string,
  useLanguage?: string,
): Parameter[] {
  const parameters = useParameterStore(state => state.parameters);
  const country = useCountry ? useCountry : useLocaleStore(state => state.country);
  const language = useLanguage ? useLanguage : useLocaleStore(state => state.language);

  return useMemo(
    () => resolveGroup(parameters, group, country, language),
    [parameters, group, country, language],
  );
}

/** Reactive version of getParameterDescription */
export function useParameterDescription(group: string, code: string | null | undefined): string {
  const params = useParametersByGroup(group);

  return useMemo(() => {
    if (!code) return '';
    const param = params.find(p => p.code === code);
    return param?.description ?? code;
  }, [params, code]);
}

/** Reactive version of getParameterOptions — returns ListBoxItem[] for Dropdown */
export function useParameterOptions(group: string): ListBoxItem[] {
  const params = useParametersByGroup(group);

  return useMemo(
    () =>
      params.map(p => ({
        value: p.code,
        label: p.description,
        id: p.code,
        isActive: p.isActive,
      })),
    [params],
  );
}

/** Returns CheckboxOption[] for CheckboxGroup */
export function useParameterAsCheckboxOptions(group: string): CheckboxOption[] {
  const params = useParametersByGroup(group);

  return useMemo(() => params.map(p => ({ value: p.code, label: p.description })), [params]);
}

/** Returns RadioOption[] for RadioGroup */
export function useParameterAsRadioOptions(group: string): RadioOption[] {
  const params = useParametersByGroup(group);

  return useMemo(
    () => params.map(p => ({ value: p.code, label: p.description, isActive: p.isActive })),
    [params],
  );
}

/** Reactive — returns ListBoxItem[] for the Dealer dropdown */
export function useDealerOptions(): ListBoxItem[] {
  const dealers = useDealerStore(state => state.dealers);

  return useMemo(
    () => dealers.map(d => ({ value: d.dealerCode, label: d.dealerName, id: d.dealerCode })),
    [dealers],
  );
}
