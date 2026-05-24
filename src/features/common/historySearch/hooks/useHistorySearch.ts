import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { postHistorySearch } from '../api';
import { useUserVisibility } from './useUserVisibility';
import type { HistorySearchQuery, HistorySearchResult, PaginatedResult, CollateralPinDto } from '../types';

// ─── Empty paginated result helper ────────────────────────────────────────────

const emptyCollateral: PaginatedResult<CollateralPinDto> = {
  items: [],
  count: 0,
  pageNumber: 0,
  pageSize: 50,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Wraps POST /history-search in a TanStack Query mutation.
 *
 * Using a mutation rather than a query because:
 * 1. The request body is complex (lat/lon, radius, filters)
 * 2. The user triggers search explicitly via a Search button (standalone mode)
 *    or on mount (embedded mode) — not driven purely by URL state
 *
 * External-user defense: even if the backend somehow returns collateral data
 * for an external user, `isExternal` zeroes it out client-side.
 */
export function useHistorySearch() {
  const { isExternal } = useUserVisibility();

  const mutation = useMutation({
    mutationFn: (query: HistorySearchQuery) => postHistorySearch(query),
    // Results are stored in mutation.data — no cache invalidation needed
  });

  /**
   * The processed result:
   * - collateral items are emptied for external users (defense-in-depth)
   * - marketComparables pass through unchanged
   */
  // Memoized so the reference is stable across renders — consumers that watch
  // `result` in an effect (e.g. to fit the map) would otherwise loop forever,
  // since a fresh object each render retriggers the effect.
  const result: HistorySearchResult | undefined = useMemo(
    () =>
      mutation.data
        ? {
            ...mutation.data,
            collateral: isExternal ? emptyCollateral : mutation.data.collateral,
          }
        : undefined,
    [mutation.data, isExternal],
  );

  return {
    search: mutation.mutate,
    searchAsync: mutation.mutateAsync,
    result,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
