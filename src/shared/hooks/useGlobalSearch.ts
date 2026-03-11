import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchQuery } from '@shared/api/search';
import type { SearchFilter, SearchResultItem } from '@shared/types/search';
import { addRecentSearch, getRecentSearches } from '@shared/utils/recentSearches';

export function useGlobalSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SearchFilter>('all');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [previewItem, setPreviewItem] = useState<SearchResultItem | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);

  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset highlight when query or filter changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [debouncedQuery, selectedFilter]);

  // React Query
  const { data, isLoading, isError, refetch } = useSearchQuery(debouncedQuery, selectedFilter);

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    if (!data?.results) return [];

    if (selectedFilter === 'all') {
      const categories = ['requests', 'customers', 'properties'] as const;
      return categories.flatMap(cat => data.results[cat] ?? []);
    }

    return data.results[selectedFilter] ?? [];
  }, [data, selectedFilter]);

  const isShowingResults = debouncedQuery.length >= 2;

  // Cmd/Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (previewItem) {
          setPreviewItem(null);
        }
        inputRef.current?.focus();
        setIsFocused(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [previewItem]);

  // Select a result
  const selectResult = useCallback(
    (item: SearchResultItem) => {
      addRecentSearch(searchQuery);
      setRecentSearches(getRecentSearches());
      setPreviewItem(item);
      setIsFocused(false);
    },
    [searchQuery],
  );

  // Select a recent search
  const selectRecentSearch = useCallback((term: string) => {
    setSearchQuery(term);
    setDebouncedQuery(term);
  }, []);

  // Close preview
  const closePreview = useCallback(() => {
    setPreviewItem(null);
  }, []);

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsFocused(false);
    setHighlightedIndex(-1);
  }, []);

  // Keyboard navigation handler (to be attached to the search container)
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

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev < flatResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : flatResults.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < flatResults.length) {
          selectResult(flatResults[highlightedIndex]);
        }
      }
    },
    [isFocused, flatResults, highlightedIndex, selectResult, closeDropdown],
  );

  return {
    // State
    searchQuery,
    selectedFilter,
    isFocused,
    highlightedIndex,
    previewItem,
    recentSearches,
    isShowingResults,

    // Data
    data,
    flatResults,
    isLoading: isLoading && debouncedQuery.length >= 2,
    isError,

    // Refs
    inputRef,

    // Actions
    setSearchQuery,
    setSelectedFilter,
    setIsFocused,
    setHighlightedIndex,
    selectResult,
    selectRecentSearch,
    closePreview,
    closeDropdown,
    handleKeyDown,
    refetch,
  };
}
