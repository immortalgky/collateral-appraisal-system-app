import { useMemo } from 'react';
import { useParameterStore, useLocaleStore } from '../store';
import type { Parameter } from '../types/api';
import type { ListBoxItem } from '../components/inputs/Dropdown';
import type { CheckboxOption } from '../components/inputs/CheckboxGroup';
import type { RadioOption } from '../components/inputs/RadioGroup';

// =============================================================================
// Sync utilities (read from Zustand store directly, for use outside React)
// =============================================================================

/** Returns Parameter[] filtered by group + current locale */
export function getParametersByGroup(group: string): Parameter[] {
  const { parameters } = useParameterStore.getState();
  const { country, language } = useLocaleStore.getState();
  const key = `${group}.${country}.${language}`;
  return parameters[key] ?? [];
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

/** Reactive version of getParametersByGroup */
export function useParametersByGroup(group: string): Parameter[] {
  const parameters = useParameterStore(state => state.parameters);
  const country = useLocaleStore(state => state.country);
  const language = useLocaleStore(state => state.language);

  return useMemo(() => {
    const key = `${group}.${country}.${language}`;
    return parameters[key] ?? [];
  }, [parameters, group, country, language]);
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
      })),
    [params],
  );
}

/** Returns CheckboxOption[] for CheckboxGroup */
export function useParameterAsCheckboxOptions(group: string): CheckboxOption[] {
  const params = useParametersByGroup(group);

  return useMemo(
    () => params.map(p => ({ value: p.code, label: p.description })),
    [params],
  );
}

/** Returns RadioOption[] for RadioGroup */
export function useParameterAsRadioOptions(group: string): RadioOption[] {
  const params = useParametersByGroup(group);

  return useMemo(
    () => params.map(p => ({ value: p.code, label: p.description })),
    [params],
  );
}
