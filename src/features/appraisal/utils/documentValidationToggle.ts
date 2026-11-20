import type { FormField } from '@/shared/components/form';

/**
 * "Document validation result" as the two-sided toggle both the condo form and the land title use:
 * inconsistent on the left, consistent on the right. Stored as the parameter codes '02' / '01',
 * so the data does not change. `tc` is the `common` translator (`toggle.Inconsistent` / `toggle.Consistent`).
 *
 * It is the field's own config with its type and options swapped, so what the field already says
 * (help, rules, wrapper classes) carries over. A record with no answer chooses neither side (the
 * value is not made up) and either click sets it; being required, it is not clearable (`showUnset`,
 * not `nullable`).
 */
export const documentValidationToggle = (
  field: FormField,
  tc: (key: string) => string,
): FormField => {
  // The field's own parameter group, layout and variant belong to the control it was; the toggle has
  // its own options, so no DocumentValidation parameter query is needed.
  const rest: Record<string, unknown> = { ...field };
  for (const key of ['group', 'orientation', 'variant']) delete rest[key];
  return {
    ...rest,
    type: 'string-toggle',
    label: field.label ?? '',
    showUnset: true,
    options: [
      { name: '02', label: tc('toggle.Inconsistent') },
      { name: '01', label: tc('toggle.Consistent') },
    ],
  } as FormField;
};
