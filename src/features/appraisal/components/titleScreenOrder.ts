/**
 * The order a land title's fields are laid out in on the land page's form view (`TitleFormView`).
 * It is the one list the rest of the app follows, so the request page's form, its save schema (and
 * so the "still missing" list) and its table chips cannot drift from the screen: which of the
 * position fields show for a deed type is up to each field's own `showWhen`, this only orders them.
 */
export const DOCUMENT_ORDER = ['titleNumber', 'bookNumber', 'pageNumber'] as const;

export const POSITION_ORDER = [
  'rawang',
  'aerialMapName',
  'aerialMapNumber',
  'mapSheetNumber',
  'landParcelNumber',
  'surveyNumber',
] as const;

/** The area parts, under the land page's names. */
export const AREA_ORDER = ['rai', 'ngan', 'squareWa'] as const;

export const TITLE_SCREEN_ORDER: readonly string[] = [
  'titleType',
  ...DOCUMENT_ORDER,
  ...POSITION_ORDER,
  ...AREA_ORDER,
];

/** The request page names the area parts after its DTO. */
const AREA_ALIASES: Record<string, string> = {
  areaRai: 'rai',
  areaNgan: 'ngan',
  areaSquareWa: 'squareWa',
};

/** The fields in screen order; any a screen does not list (owner, notes, …) keep their order, after. */
export function inScreenOrder<T extends { name: string }>(fields: readonly T[]): T[] {
  const rank = (name: string) => {
    const at = TITLE_SCREEN_ORDER.indexOf(AREA_ALIASES[name] ?? name);
    return at === -1 ? TITLE_SCREEN_ORDER.length : at;
  };
  return fields
    .map((field, position) => ({ field, position }))
    .sort((a, b) => rank(a.field.name) - rank(b.field.name) || a.position - b.position)
    .map(({ field }) => field);
}
