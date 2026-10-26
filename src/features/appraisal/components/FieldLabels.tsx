import { useCallback, useContext, type ReactNode } from 'react';
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

/** A block-project form whose field labels live under `fieldLabels.<scope>` in the blockProject locales. */
export type BlockFieldLabelScope = 'projectInfo' | 'tower' | 'model' | 'projectLand' | 'pricing';

type FieldLabelsProps = { children: ReactNode } & (
  | { ns?: 'appraisal'; scope: FieldLabelScope }
  | { ns: 'blockProject'; scope: BlockFieldLabelScope }
);

/**
 * Translates the labels of every field rendered below it, by field name within the scope. A field
 * without an entry keeps its config label, and so does one whose label is deliberately blank.
 *
 * Beyond the label, a namespace may also carry `fieldLabels.specifyPlaceholder` (replaces the
 * placeholder of any field that has one). Only blockProject defines it, so the property editor is
 * untouched. A `blockProject` provider also turns the character counter on for textareas. Toggle
 * captions are translated by FormBooleanToggle itself (`common:toggle.*`).
 *
 * Providers nest: a form that mixes configs from two places wraps the reused part in its own scope
 * (the appraisal one) and the rest in an inner one, which refines what the outer already labelled.
 */
export function FieldLabels({ scope, ns = 'appraisal', children }: FieldLabelsProps) {
  const { t, i18n } = useTranslation(ns);
  const outer = useContext(FieldLabelContext);
  const relabel = useCallback(
    (input: FormField): FormField => {
      let field = outer ? outer(input) : input;
      const key = `fieldLabels.${scope}.${field.name}`;
      if (field.label && i18n.exists(key, { ns })) {
        field = { ...field, label: t(key as never) } as FormField;
      }
      if (field.placeholder && i18n.exists('fieldLabels.specifyPlaceholder', { ns })) {
        field = {
          ...field,
          placeholder: String(t('fieldLabels.specifyPlaceholder' as never)),
        } as FormField;
      }
      // Block pages count the characters of every textarea, including the ones reused from the
      // appraisal configs; an explicit `showCharCount` on the field (even false) still wins.
      if (ns === 'blockProject' && field.type === 'textarea' && field.showCharCount === undefined) {
        field = { ...field, showCharCount: true };
      }
      return field;
    },
    // `t` changes with the language, so labels follow a language switch.
    [scope, ns, outer, t, i18n],
  );
  return <FieldLabelContext.Provider value={relabel}>{children}</FieldLabelContext.Provider>;
}
