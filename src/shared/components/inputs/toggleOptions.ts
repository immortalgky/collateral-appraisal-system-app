import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParametersByGroup } from '../../utils/parameterUtils';
import type { FormStringToggleOption } from './FormStringToggle';

/** The two captions of a boolean toggle: the translated `options`, else the first two rows of `group`. */
export function useBooleanToggleOptions(
  name: string,
  group?: string,
  options?: [string, string],
): [string, string] {
  const { t } = useTranslation('common');
  const params = useParametersByGroup(group ?? '');
  return useMemo<[string, string]>(() => {
    if (options) {
      // Captions in configs are English text; `common:toggle.<caption>` translates the known ones,
      // and `toggle.<fieldName>.<caption>` where a field needs its own wording. Anything else
      // (a form that already translated its captions) passes through.
      const fieldName = name.split('.').pop();
      // A key array takes the first one that exists, else the caption itself.
      const caption = (option: string) =>
        String(
          t([`toggle.${fieldName}.${option}`, `toggle.${option}`] as never, {
            defaultValue: option,
          }),
        );
      return [caption(options[0]), caption(options[1])];
    }
    const first = params[0]?.description ?? '';
    const second = params[1]?.description ?? '';
    return [first, second];
  }, [options, params, name, t]);
}

/** The two options of a string toggle: `options` as given, else the first two rows of `group`. */
export function useStringToggleOptions(
  group?: string,
  options?: [FormStringToggleOption, FormStringToggleOption],
): [FormStringToggleOption, FormStringToggleOption] {
  const params = useParametersByGroup(group ?? '');
  return useMemo(() => {
    if (options) return options;
    const first: FormStringToggleOption = {
      name: params[0]?.code ?? '',
      label: params[0]?.description ?? '',
    };
    const second: FormStringToggleOption = {
      name: params[1]?.code ?? '',
      label: params[1]?.description ?? '',
    };
    return [first, second];
  }, [options, params]);
}
