import type { FormLayout } from '@shared/types';

/**
 * How the appraisal property forms lay out their fields.
 *
 * `classic` — label above its input, fields on a 12-column grid. What the screens
 *   have always done.
 * `grid` — label in a fixed left column beside the input, one field per row, zebra
 *   striping and sticky section headers. Reads like a spreadsheet and fits roughly a
 *   third more fields on screen, which matters on the long types: land-and-building
 *   is 129 fields and leasehold land-and-building is 145.
 *
 * Grid is the default because those long forms are the common case; anyone who
 * prefers the roomier layout switches once and the choice is persisted.
 *
 * Only the property detail forms respond to this — see `.cas-propform` in
 * styles/formLayout.css. A three-field dialog gains nothing from a label column.
 */
export const FORM_LAYOUT_OPTIONS: FormLayout[] = ['grid', 'classic'];

export const DEFAULT_FORM_LAYOUT: FormLayout = 'grid';

export function isFormLayout(value: unknown): value is FormLayout {
  return value === 'classic' || value === 'grid';
}
