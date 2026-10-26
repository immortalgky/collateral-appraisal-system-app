import type { FormLayout } from '@shared/types';

/**
 * The user's stored form-layout setting for the appraisal property forms. The stored values are
 * kept as they are so persisted choices keep working; `UserFormLayoutProvider` maps them onto the
 * two layouts the components read with `useFormLayout()` (DESIGN.md 17.1).
 *
 * `classic` — Standard: label above its input, fields on a 12-column grid, one card per section
 *   (option label "Standard" / "มาตรฐาน").
 * `grid` — Compact: label in a 152px column beside the input, two pairs per row on a wide sheet,
 *   one sheet with section bands. Fits roughly a third more fields on screen, which matters on
 *   the long types: land-and-building is 129 fields and leasehold land-and-building is 145.
 *
 * Compact is the default because those long forms are the common case; anyone who prefers the
 * roomier layout switches once and the choice is persisted.
 *
 * Only the property form screens (and the Data Correction editor) respond to this; every other
 * form, Block pages included, is Standard.
 */
export const FORM_LAYOUT_OPTIONS: FormLayout[] = ['grid', 'classic'];

export const DEFAULT_FORM_LAYOUT: FormLayout = 'grid';

export function isFormLayout(value: unknown): value is FormLayout {
  return value === 'classic' || value === 'grid';
}
