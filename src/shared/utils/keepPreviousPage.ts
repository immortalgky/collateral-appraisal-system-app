/**
 * True when two list params differ at most in the `ignored` keys (`pageNumber` by default; paging and
 * sort for a list that has both): the new key is another page of the SAME tab/filter.
 * `undefined` and a missing key count as equal (params are built with optional filters).
 */
export function isSameFilterOtherPage(
  prev: object | undefined,
  next: object,
  ignored: readonly string[] = ['pageNumber'],
): boolean {
  if (!prev) return false;
  const a = prev as Record<string, unknown>;
  const b = next as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  ignored.forEach(k => keys.delete(k));
  return [...keys].every(k => a[k] === b[k]);
}

interface KeepPreviousPageOptions {
  /** Keys that do not make it another list (see `isSameFilterOtherPage`). */
  ignored?: readonly string[];
  /**
   * Keep an EMPTIED page too (no rows, but the total says there are some). By default it is dropped:
   * the last row of the last page was taken out, and keeping the empty page would flash the empty
   * state, then the skeleton. A page that steps back on its own, in time (before paint), keeps it.
   */
  keepEmptiedPage?: boolean;
}

/**
 * The `placeholderData` of a paged list: the previous result is kept (flagged `isPlaceholderData`)
 * only for another page of the same list, so the pager and the rows stay put while the next page
 * loads. A tab, filter or search change drops to the skeleton instead of showing the previous
 * list's rows and total.
 *
 * A list that really is empty (total 0) is kept, so a sort or page-size change on it does not
 * flicker; an emptied page is dropped unless `keepEmptiedPage` (see the option).
 *
 * `next` is the params of the query being built, and `keyIndex` where the params sit in a query key
 * (the previous query's key is compared with it).
 */
export const keepPreviousPage =
  (next: object, keyIndex: number, { ignored, keepEmptiedPage }: KeepPreviousPageOptions = {}) =>
  <T extends { items?: unknown[]; count?: number }>(
    prev: T | undefined,
    prevQuery: { queryKey: readonly unknown[] } | undefined,
  ): T | undefined =>
    prev &&
    (!!prev.items?.length || prev.count === 0 || keepEmptiedPage) &&
    isSameFilterOtherPage(prevQuery?.queryKey[keyIndex] as object | undefined, next, ignored)
      ? prev
      : undefined;
