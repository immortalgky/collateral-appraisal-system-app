import { useMemo } from 'react';
import type { OptionFilter } from '../components/inputs/Dropdown';
import { useWatch } from 'react-hook-form';

export function useFilterWatchValues(
  filterOptions: OptionFilter | OptionFilter[] | undefined,
): Record<string, unknown> {
  const filters = useMemo<OptionFilter[]>(() => {
    if (!filterOptions) return [];
    return Array.isArray(filterOptions) ? filterOptions : [filterOptions];
  }, [filterOptions]);

  const dynamicFields = useMemo<string[]>(() => {
    const fields = filters
      .filter((f): f is Extract<OptionFilter, { type: 'dynamic' }> => f.type === 'dynamic')
      .map(f => f.field);
    const arrayFields = filters
      .filter(
        (f): f is Extract<OptionFilter, { type: 'dynamic-array' }> => f.type === 'dynamic-array',
      )
      .map(f => f.field);
    return [...new Set([...fields, ...arrayFields])];
  }, [filters]);

  const watchedValues = useWatch({ name: dynamicFields });

  return useMemo(() => {
    if (dynamicFields.length === 0) return {};
    const field: Record<string, unknown> = {};
    const values = Array.isArray(watchedValues) ? watchedValues : [watchedValues];
    dynamicFields.forEach((fieldName, i) => {
      field[fieldName] = values[i];
    });
    return field;
  }, [dynamicFields, watchedValues]);
}
