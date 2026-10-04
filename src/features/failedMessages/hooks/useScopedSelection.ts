import { useState } from 'react';

/**
 * A source's row selection, DROPPED whenever the committed search changes — adjusted during render
 * (the same pattern `useCommittedSearch` uses for its page), so there is no window where a stale
 * selection is visible, and 'abc' → '' → 'abc' can never bring it back.
 *
 * `setSelection` is `useState`'s own setter (stable), so a caller can put it in an effect's
 * dependency array.
 */
export function useScopedSelection<T>(committed: string) {
  const [selection, setSelection] = useState<Map<string, T>>(() => new Map());
  const [search, setSearch] = useState(committed);
  if (search !== committed) {
    setSearch(committed);
    setSelection(new Map());
  }
  return [selection, setSelection, () => setSelection(new Map())] as const;
}
