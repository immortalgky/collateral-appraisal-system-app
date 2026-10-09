/**
 * True when two list params differ at most in `pageNumber` — i.e. the new key is another page of the
 * SAME tab/filter. List hooks use it so `placeholderData` keeps the previous result only for a page
 * change; a tab/filter change must drop to the skeleton, not show the previous filter's rows/total.
 * `undefined` and a missing key count as equal (params are built with optional filters).
 */
export function isSameFilterOtherPage(prev: object | undefined, next: object): boolean {
  if (!prev) return false;
  const a = prev as Record<string, unknown>;
  const b = next as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.delete('pageNumber');
  return [...keys].every(k => a[k] === b[k]);
}
