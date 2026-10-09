import { useCallback, useRef, useState } from 'react';
import { useDebounce } from '@shared/hooks/useDebounce';
import { committedSearch } from '../utils/queueHealth';

const SEARCH_DEBOUNCE_MS = 400;

/**
 * One source's search box + its own remembered page, keyed to the committed search it was set
 * under — a search commit changing invalidates the stored page (falls back to 1) with no effect
 * needed.
 *
 * `gen` is bumped on every clear (typed or programmatic) so a debounced key still in flight from
 * before that clear can never resurrect the old term once it lands — see `committedSearch`.
 *
 * `setInput`/`setPage`/`clear` are `useCallback`-stable (never change identity) so a caller can put
 * them in an effect's dependency array without that effect re-running on every render.
 */
export function useCommittedSearch() {
  const [input, setInputState] = useState('');
  const [gen, setGen] = useState(0);
  const trimmed = input.trim();
  const debouncedKey = useDebounce(`${gen}\u0000${trimmed}`, SEARCH_DEBOUNCE_MS);
  const committed = committedSearch(trimmed, debouncedKey, gen);
  // Read by the stable `setPage` below so it never needs `committed` in its own dependency list.
  const committedRef = useRef(committed);
  committedRef.current = committed;

  const [pageState, setPageState] = useState<{ search: string; page: number }>({
    search: '',
    page: 1,
  });
  // Adjust-state-during-render: a commit to a different term overwrites the stored page immediately
  // (as 1), rather than leaving a stale `pageState.search` around that a later commit BACK to that
  // same term could still match and resurrect (e.g. 'abc' p3 → 'ab' → 'abc' must land on p1, not p3).
  if (pageState.search !== committed) {
    setPageState({ search: committed, page: 1 });
  }
  const page = pageState.search === committed ? pageState.page : 1;

  const setInput = useCallback((value: string) => {
    setInputState(value);
    if (value.trim() === '') {
      setGen(g => g + 1);
      setPageState({ search: '', page: 1 });
    }
  }, []);

  const setPage = useCallback((n: number) => {
    setPageState({ search: committedRef.current, page: n });
  }, []);

  const clear = useCallback(() => setInput(''), [setInput]);

  return { input, setInput, committed, page, setPage, clear };
}
