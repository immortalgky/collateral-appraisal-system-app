import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldLabelContext, type FormField } from '@/shared/components/form';

/** A property form whose field labels live under `fieldLabels.<scope>` in the appraisal locales. */
export type FieldLabelScope =
  | 'land'
  | 'building'
  | 'condo'
  | 'lease'
  | 'rental'
  | 'landBuildingPma'
  | 'condoPma';

/**
 * Translates the labels of every field rendered below it, by field name within the scope. A field
 * without an entry keeps its config label, and so does one whose label is deliberately blank.
 */
export function FieldLabels({ scope, children }: { scope: FieldLabelScope; children: ReactNode }) {
  const { t, i18n } = useTranslation('appraisal');
  const relabel = useCallback(
    (field: FormField): FormField => {
      const key = `fieldLabels.${scope}.${field.name}`;
      if (!field.label || !i18n.exists(key, { ns: 'appraisal' })) return field;
      return { ...field, label: t(key as never) } as FormField;
    },
    // `t` changes with the language, so labels follow a language switch.
    [scope, t, i18n],
  );
  return <FieldLabelContext.Provider value={relabel}>{children}</FieldLabelContext.Provider>;
}
