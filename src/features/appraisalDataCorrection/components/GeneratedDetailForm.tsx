import { useTranslation } from 'react-i18next';
import { FormFields, FormSection, FormSheet, type FormField } from '@shared/components/form';

/**
 * Fallback form body for property types that have no create/edit screen to reuse — today
 * only vehicle and vessel, which have always been API-and-domain-only.
 *
 * Their fields are generated from the backend DTO, so the types are right but the presentation
 * is plain: no section grouping, and anything that should be a dropdown renders as a text or
 * number input because nothing in the codebase says which parameter group it belongs to. If a
 * real vehicle/vessel screen is ever built, delete this and point the registry at it instead.
 *
 * `titleKey` is looked up here rather than passed in as text, so the registry stays free of hooks
 * and of i18next's `t`: threading that overloaded function through a plain callback parameter is
 * what made `tsc` crash outright with "No error for last overload signature".
 */
const GeneratedDetailForm = ({ titleKey, fields }: { titleKey: string; fields: FormField[] }) => {
  // The create screens' namespace: same strings, not a second copy that drifts.
  const { t } = useTranslation('appraisal');
  return (
    <FormSheet>
      <FormSection title={String(t(titleKey as never, { defaultValue: titleKey }))} icon="car">
        <FormFields fields={fields} />
      </FormSection>
    </FormSheet>
  );
};

export default GeneratedDetailForm;
