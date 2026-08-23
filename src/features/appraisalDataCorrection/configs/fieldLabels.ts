import * as appraisalFields from './fields';

/**
 * Field name → label, read from the very configs the create/edit forms render.
 *
 * The confirm dialog names the fields the user just changed, and those names have to match what
 * the form showed a second earlier. Keeping a second label table here would let the two drift
 * apart the moment anyone renames a label upstream, so nothing is written by hand: every exported
 * field array in `appraisal/configs/fields.ts` is flattened once and indexed by field name.
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
