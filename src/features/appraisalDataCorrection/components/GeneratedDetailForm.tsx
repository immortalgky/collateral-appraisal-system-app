import { FormFields, type FormField } from '@shared/components/form';

/**
 * Fallback form body for property types that have no create/edit screen to reuse — today
 * only vehicle and vessel, which have always been API-and-domain-only.
 *
 * Their fields are generated from the backend DTO, so the types are right but the presentation
 * is plain: no section grouping, and anything that should be a dropdown renders as a text or
 * number input because nothing in the codebase says which parameter group it belongs to. If a
 * real vehicle/vessel screen is ever built, delete this and point the registry at it instead.
 */
const GeneratedDetailForm = ({ fields }: { fields: FormField[] }) => (
  <div className="grid grid-cols-12 gap-4">
    <FormFields fields={fields} />
  </div>
);

export default GeneratedDetailForm;
