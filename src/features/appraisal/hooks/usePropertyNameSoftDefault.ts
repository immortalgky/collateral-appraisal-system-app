import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

export interface UsePropertyNameSoftDefaultOptions {
  fields: string[];
  separator?: string;
  arrayField?: (values: any[]) => string;
  enabled?: boolean;
}

export function usePropertyNameSoftDefault(
  options: UsePropertyNameSoftDefaultOptions,
  isLoaded: boolean,
) {
  const { separator = ' ', arrayField, enabled = true } = options;
  const { setValue, control } = useFormContext();
  const prevValue = useRef<string | null>(null);

  const watchedValues = useWatch({ control, name: options.fields });

  useEffect(() => {
    if (!isLoaded || !enabled) return;

    const checkingValue = arrayField
      ? arrayField(watchedValues)
      : watchedValues.map(v => (typeof v === 'object' ? JSON.stringify(v) : v)).join(separator);

    const displayValue = arrayField
      ? arrayField(watchedValues)
      : watchedValues.filter(Boolean).join(separator);

    if (prevValue.current === null) {
      prevValue.current = checkingValue;
      return;
    }

    if (checkingValue === prevValue.current) return;

    prevValue.current = checkingValue;

    if (displayValue) {
      setValue('propertyName', displayValue);
    }
  }, [isLoaded, enabled, watchedValues]);
}
