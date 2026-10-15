import * as appraisalFields from '@/features/appraisal/configs/fields';

/**
 * Field name → label, read from the very configs the create/edit forms render.
 *
 * The confirm dialog and the history name the fields that changed, and those names have to match
 * what the form showed a second earlier. Keeping a second label table here would let the two
 * drift apart the moment anyone renames a label upstream, so nothing is written by hand: every
 * exported field array in `appraisal/configs/fields.ts` is flattened once and indexed by name.
 *
 * Names repeat across property types (`titleNumber` appears in four of them) with the same label;
 * first one wins so the result doesn't depend on export order.
 */
type UnknownField = { name?: unknown; label?: unknown; fields?: unknown };

function collect(node: unknown, into: Map<string, string>): void {
  if (Array.isArray(node)) {
    for (const child of node) collect(child, into);
    return;
  }
  if (!node || typeof node !== 'object') return;

  const field = node as UnknownField;
  if (typeof field.name === 'string' && typeof field.label === 'string' && !into.has(field.name)) {
    into.set(field.name, field.label);
  }
  if (field.fields) collect(field.fields, into);
}

const LABELS: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const exported of Object.values(appraisalFields)) collect(exported, map);
  return map;
})();

/** Falls back to the raw field name — better a developer-looking label than a blank row. */
export function labelForField(name: string): string {
  return LABELS.get(name) ?? name;
}

/** "areaInSqWa" / "AreaInSqWa" → "Area In Sq Wa", for names no form config labels. */
export const humanize = (name: string) =>
  (name.charAt(0).toUpperCase() + name.slice(1)).replace(/([a-z0-9])([A-Z])/g, '$1 $2');

/** The form's own label for a name, or a humanized name — never a blank and never a raw key. */
export const labelOrHumanized = (name: string) => {
  const label = labelForField(name);
  return label === name ? humanize(name) : label;
};

/**
 * The tables (repeating rows) of the property forms. They are not `FormField`s — each is a
 * bespoke table component — so no config carries their titles. Keyed by the form's array name,
 * plus the names the backend's audit paths give the same tables in PascalCase (`Deductions`,
 * `WorkDetails`; `Titles`, `Surfaces` and `UpFrontEntries` match the form's).
 */
const TABLE_LABELS: Record<string, string> = {
  titles: 'Land titles',
  landAreaDeductions: 'Land area deductions',
  deductions: 'Land area deductions',
  surfaces: 'Floors',
  depreciationDetails: 'Depreciation',
  depreciationPeriods: 'Periods',
  periods: 'Periods',
  constructionSubItems: 'Construction work items',
  workDetails: 'Construction work items',
  areaDetails: 'Area details',
  upFrontEntries: 'Up-front payments',
  growthPeriodEntries: 'Growth periods',
  scheduleOverrides: 'Schedule overrides',
};

/** Title of a table, from its array name in either casing. */
export const labelForTable = (name: string) => {
  const camel = name.charAt(0).toLowerCase() + name.slice(1);
  return TABLE_LABELS[camel] ?? humanize(camel);
};
