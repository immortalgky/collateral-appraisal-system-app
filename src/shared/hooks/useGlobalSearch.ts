import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MIN_SEARCH_LENGTH, useSearchQuery } from '@shared/api/search';
import type { SearchAppraisal, SearchScope } from '@shared/types/search';
import { addRecentSearch, getRecentSearches } from '@shared/utils/recentSearches';
import { APPRAISAL_SEARCH_ROUTE, RETURN_PATH_KEY } from '@shared/constants/search';
import { groupKey, orderGroups } from '@shared/utils/searchGrouping';

export function useGlobalSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState<SearchScope>('all');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  // Opt-in substring search. The server matches by prefix by default (`term%`, seekable); a leading
  // `*` switches it to `%term%`, which scans. Offered only after a prefix search finds nothing, so
  // the scan happens when the user asks for it rather than on every half-typed word.
  const [expandSubstring, setExpandSubstring] = useState(false);
  // Which groups are folded away. Owned here rather than in the view because keyboard navigation
  // has to skip the rows a fold hides — otherwise the highlight lands on something invisible.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // A new term invalidates the previous "no prefix hits" verdict.
  useEffect(() => {
    setExpandSubstring(false);
  }, [debouncedQuery]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [debouncedQuery, selectedScope, expandSubstring]);

  const wireQuery = expandSubstring && debouncedQuery ? `*${debouncedQuery}` : debouncedQuery;
  const { data, isLoading, isFetching, isPlaceholderData, isError, refetch } = useSearchQuery(
    wireQuery,
    selectedScope,
  );

  const isShowingResults = debouncedQuery.length >= MIN_SEARCH_LENGTH;

  const termIsSearchable = searchQuery.trim().length >= MIN_SEARCH_LENGTH;

  /**
   * A request for what is typed is actually on the wire.
   *
   * `isLoading` cannot say this: the query keeps the previous term's data
   * (`placeholderData: keepPreviousData`), so from the second term onwards it stays false while a
   * request runs. `isFetching` alone says too much — it also fires for the background refetch on
   * window focus, which would blank a result list the user is looking at and spin the icon for an
   * answer already on screen. `isPlaceholderData` is the exact question: what is displayed belongs
   * to a DIFFERENT term than the one being fetched.
   */
  const isSearching =
    termIsSearchable && searchQuery === debouncedQuery && isFetching && isPlaceholderData;

  /**
   * Typed, but the 300ms debounce has not handed it to the query yet — so anything on screen is an
   * answer to an OLDER term. Deliberately separate from `isSearching`: nothing is being fetched
   * during this window, so the spinner in the box stays off, while the panel still has to stop
   * claiming "no results" for a term the search has not seen.
   */
  const hasPendingTerm = termIsSearchable && searchQuery !== debouncedQuery;

  const groups = useMemo(() => data?.groups ?? [], [data]);

  // A new result set invalidates which groups the user had folded away.
  useEffect(() => {
    setCollapsedGroups(new Set());
  }, [groups]);

  // Exact hits are pinned above the rest, so the flat sequence has to be built from that same
  // order — the view renders straight from `exact` and `rest` for exactly this reason.
  const { exact, rest, ordered } = useMemo(
    () => orderGroups(groups, debouncedQuery),
    [groups, debouncedQuery],
  );

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Keyboard navigation walks the two-level list as one flat sequence, in render order, skipping
  // any group the user has folded.
  // A single-appraisal group renders as a bare row with no header, so it has no fold to respect.
  const flatResults = useMemo(
    () =>
      ordered.flatMap(g =>
        g.appraisals.length > 1 && collapsedGroups.has(groupKey(g)) ? [] : g.appraisals,
      ),
    [ordered, collapsedGroups],
  );

  const hasResults = flatResults.length > 0;
  /** Index of the trailing "see all results" row, so ArrowDown can reach it. */
  const seeAllIndex = hasResults ? flatResults.length : -1;

  const rememberTerm = useCallback(() => {
    // Record what actually produced these results, not the in-flight input: clicking a stale row
    // while still typing used to store a term that never ran.
    addRecentSearch(debouncedQuery);
    setRecentSearches(getRecentSearches());
  }, [debouncedQuery]);

  /**
   * Where the Exit button on an appraisal should return to. Prefer a return path already parked by
   * AppraisalLayout so a search made from inside an appraisal does not overwrite the original
   * origin; keep the query string, or the list's filters are lost on the way back.
   */
  const resolveReturnPath = useCallback(() => {
    try {
      // AppraisalLayout parks {appraisalId, returnPath} here, not a bare string.
      const stored = sessionStorage.getItem(RETURN_PATH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { returnPath?: string };
        if (parsed?.returnPath) return parsed.returnPath;
      }
    } catch {
      // Unparseable, or sessionStorage unavailable in private mode — use the current location.
    }
    return `${location.pathname}${location.search}`;
  }, [location.pathname, location.search]);

  const openResult = useCallback(
    (item: SearchAppraisal) => {
      rememberTerm();
      setIsFocused(false);
      navigate(item.navigateTo, {
        state: { fromSearch: true, returnPath: resolveReturnPath() },
      });
    },
    [navigate, rememberTerm, resolveReturnPath],
  );

  const openFullResults = useCallback(() => {
    if (!debouncedQuery) return;
    rememberTerm();
    setIsFocused(false);
    navigate(`${APPRAISAL_SEARCH_ROUTE}?search=${encodeURIComponent(wireQuery)}`);
  }, [debouncedQuery, wireQuery, navigate, rememberTerm]);

  const selectRecentSearch = useCallback((term: string) => {
    setSearchQuery(term);
    setDebouncedQuery(term);
    setExpandSubstring(false);
  }, []);

  const searchSubstring = useCallback(() => {
    setExpandSubstring(true);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsFocused(false);
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isFocused) {
          closeDropdown();
          inputRef.current?.blur();
        }
        return;
      }

      if (!isFocused) return;

      // The "see all" row sits one past the last result, so the wrap-around length is +1.
      const stops = hasResults ? flatResults.length + 1 : 0;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (stops > 0) setHighlightedIndex(prev => (prev < stops - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (stops > 0) setHighlightedIndex(prev => (prev > 0 ? prev - 1 : stops - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < flatResults.length) {
          openResult(flatResults[highlightedIndex]);
        } else {
          // Enter with nothing highlighted used to do nothing at all.
          openFullResults();
        }
      }
    },
    [
      isFocused,
      hasResults,
      flatResults,
      highlightedIndex,
      openResult,
      openFullResults,
      closeDropdown,
    ],
  );

  return {
    searchQuery,
    selectedScope,
    exactGroups: exact,
    restGroups: rest,
    collapsedGroups,
    toggleGroup,
    isFocused,
    highlightedIndex,
    recentSearches,
    isShowingResults,
    expandSubstring,

    data,
    groups,
    flatResults,
    seeAllIndex,
    totalMatched: data?.totalMatchedAppraisals ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading: isLoading && isShowingResults,
    isSearching,
    hasPendingTerm,
    isError,

    inputRef,

    setSearchQuery,
    setSelectedScope,
    setIsFocused,
    setHighlightedIndex,
    openResult,
    openFullResults,
    selectRecentSearch,
    searchSubstring,
    closeDropdown,
    handleKeyDown,
    refetch,
  };
}
