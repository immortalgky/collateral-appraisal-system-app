import { useCallback, useState } from 'react';
import type { TaskFilterParams } from '../types';

/**
 * Paging and sorting of one task table (My or Pool): the page and its size, the sort that the
 * header cycles through (ascending, descending, off), and the way back to page 0 when what is
 * listed changes.
 *
 * The page is only meaningful for the search, filters and sort it was picked under, so it remembers
 * them and reads as 0 as soon as any of them differs. That is derived in the same render that
 * sees the change, so the query goes out once, for page 0, and not first for the old page.
 */
export function useTaskListPaging(search: string, filters: TaskFilterParams) {
  const [pageSize, setPageSize] = useState(25);
  // No sort field = the backend default order (assigned date, oldest first)
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [picked, setPicked] = useState({ page: 0, search, filters, sortField, sortDirection });

  const underSame =
    picked.search === search &&
    picked.filters === filters &&
    picked.sortField === sortField &&
    picked.sortDirection === sortDirection;
  const pageNumber = underSame ? picked.page : 0;

  const setPage = (page: number) => setPicked({ page, search, filters, sortField, sortDirection });

  const onSort = useCallback(
    (field: string) => {
      if (sortField !== field) {
        setSortField(field);
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    },
    [sortField, sortDirection],
  );

  return {
    /** What the list query takes. */
    queryParams: {
      pageNumber,
      pageSize,
      sortBy: sortField ?? undefined,
      sortDir: sortDirection,
    },
    /** What `TaskTable` takes. */
    sortProps: { sortField, sortDirection, onSort },
    /**
     * What `Pagination` takes, given how many there are in all (undefined while that is not known:
     * a page being loaded must not look like an empty list). When the list has shrunk from under
     * the page (the last row of the last page taken out) the page steps back to the last one.
     */
    paginationProps: (totalCount: number | undefined) => {
      const total = totalCount ?? 0;
      const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
      // Derived state, set while rendering: React runs the render again at once, before anything
      // is painted or fetched for the page that is not there.
      if (totalCount !== undefined && pageNumber > lastPage) setPage(lastPage);
      return {
        currentPage: totalCount === undefined ? pageNumber : Math.min(pageNumber, lastPage),
        totalPages: Math.ceil(total / pageSize),
        totalCount: total,
        pageSize,
        onPageChange: setPage,
        onPageSizeChange: (size: number) => {
          setPageSize(size);
          setPage(0);
        },
      };
    },
    pageSize,
  };
}
