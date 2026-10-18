import type { FormLayout } from '@shared/types';

/**
 * How the appraisal property forms lay out their fields.
 *
 * `classic` — label above its input, fields on a 12-column grid (option label
 *   "Standard" / "มาตรฐาน"). Drawn in the standard skin: ThemeProvider writes
 *   `data-form-layout="classic"`, and styles/formLayoutStandard.css gives it the same family
 *   look as the compact skin — grey section bands, one framed sheet, white bordered inputs, the
 *   same tables. What both skins share is in styles/formLayoutSkin.css.
 * `grid` — label in a fixed left column beside the input, one field per row, zebra
 *   striping and sticky section headers. Reads like a spreadsheet and fits roughly a
 *   third more fields on screen, which matters on the long types: land-and-building
 *   is 129 fields and leasehold land-and-building is 145. Drawn in the compact skin:
 *   ThemeProvider writes `data-form-layout="grid"`, and styles/formLayoutCompact.css layers a
 *   tighter, flatter look over formLayout.css.
 *
 * Grid is the default because those long forms are the common case; anyone who
 * prefers the roomier layout switches once and the choice is persisted.
 *
 * Only the property detail forms respond to this: every rule is gated on `.cas-form-grid`, which
 * the property pages, the PMA pages and the Data Correction screen set on their form. A
 * three-field dialog gains nothing from a label column and stays out of it.
 */
export const FORM_LAYOUT_OPTIONS: FormLayout[] = ['grid', 'classic'];

export const DEFAULT_FORM_LAYOUT: FormLayout = 'grid';

export function isFormLayout(value: unknown): value is FormLayout {
  return value === 'classic' || value === 'grid';
}
