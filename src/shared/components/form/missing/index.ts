// The missing-fields chip: "ขาด n ช่อง" in the action bar, a popover of what is missing per section.
// DESIGN.md 17.8. `FormProvider` wires it for every schema-driven form; Request feeds the provider
// its own summary.
export { default as MissingFieldsChip } from './MissingFieldsChip';
export { MissingFieldsProvider, type MissingFieldsHandle } from './MissingFieldsProvider';
export {
  useMissingFields,
  useHasMissingFields,
  useRegisterMissingReveal,
} from './missingFieldsContext';
export { FormMissingFields } from './FormMissingFields';
export { SectionHeaderStatus, SectionStatusMark } from './SectionStatus';
export { useSectionStatus } from './useSectionStatus';
export { useFormMissingFields, buildFormMissingSummary } from './useFormMissingFields';
export { collectSchemaIssues, collectFieldLabels, type RefineRule } from './collectIssues';
export {
  sectionCount,
  type MissingFieldsItem,
  type MissingFieldsSection,
  type MissingFieldsSummary,
  type RevealFn,
} from './types';
