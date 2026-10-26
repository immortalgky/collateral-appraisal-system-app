import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTaskListPaging } from './useTaskListPaging';

const NO_FILTERS = {};
const setup = (search = '') =>
  renderHook(({ s }: { s: string }) => useTaskListPaging(s, NO_FILTERS), {
    initialProps: { s: search },
  });

describe('useTaskListPaging', () => {
  it('starts with no sort field, leaving the order to the backend default', () => {
    const { result } = setup();
    expect(result.current.queryParams.sortBy).toBeUndefined();
    expect(result.current.queryParams.sortDir).toBe('asc');
    expect(result.current.sortProps).toMatchObject({ sortField: null, sortDirection: 'asc' });
  });

  it('cycles a header through ascending, descending and off, and a new column starts ascending', () => {
    const { result } = setup();
    act(() => result.current.sortProps.onSort('status'));
    expect(result.current.queryParams).toMatchObject({ sortBy: 'status', sortDir: 'asc' });
    act(() => result.current.sortProps.onSort('status'));
    expect(result.current.queryParams).toMatchObject({ sortBy: 'status', sortDir: 'desc' });
    act(() => result.current.sortProps.onSort('status'));
    expect(result.current.queryParams.sortBy).toBeUndefined();
    act(() => result.current.sortProps.onSort('status'));
    act(() => result.current.sortProps.onSort('purpose'));
    expect(result.current.queryParams).toMatchObject({ sortBy: 'purpose', sortDir: 'asc' });
  });

  it('goes back to page 0 when the search, the sort or the page size changes', () => {
    const { result, rerender } = setup();
    act(() => result.current.paginationProps(100).onPageChange(3));
    expect(result.current.queryParams.pageNumber).toBe(3);
    rerender({ s: 'abc' });
    expect(result.current.queryParams.pageNumber).toBe(0);

    act(() => result.current.paginationProps(100).onPageChange(2));
    act(() => result.current.sortProps.onSort('status'));
    expect(result.current.queryParams.pageNumber).toBe(0);

    act(() => result.current.paginationProps(100).onPageChange(2));
    act(() => result.current.paginationProps(100).onPageSizeChange(50));
    expect(result.current.queryParams).toMatchObject({ pageNumber: 0, pageSize: 50 });
  });

  it('gives Pagination its page count from the total', () => {
    const { result } = setup();
    expect(result.current.paginationProps(51)).toMatchObject({
      currentPage: 0,
      totalPages: 3,
      totalCount: 51,
      pageSize: 25,
    });
  });

  it('never reads the old page under a new search: the render that sees the change is already page 0', () => {
    const seen: [string, number][] = [];
    const { result, rerender } = renderHook(
      ({ s }: { s: string }) => {
        const paging = useTaskListPaging(s, NO_FILTERS);
        seen.push([s, paging.queryParams.pageNumber]);
        return paging;
      },
      { initialProps: { s: '' } },
    );
    act(() => result.current.paginationProps(500).onPageChange(3));
    rerender({ s: 'abc' });
    expect(seen.filter(([s]) => s === 'abc')).toEqual([['abc', 0]]);
  });

  it('steps back to the last page when the list shrinks from under it', () => {
    const { result, rerender } = renderHook(
      ({ total }: { total: number | undefined }) => {
        const paging = useTaskListPaging('', NO_FILTERS);
        return { paging, props: paging.paginationProps(total) };
      },
      { initialProps: { total: 100 as number | undefined } },
    );
    act(() => result.current.props.onPageChange(3));
    expect(result.current.paging.queryParams.pageNumber).toBe(3);

    // the page being loaded has no total yet: it must not read as empty and drop the page
    rerender({ total: undefined });
    expect(result.current.paging.queryParams.pageNumber).toBe(3);
    expect(result.current.props.currentPage).toBe(3);

    // 30 rows are 2 pages: page 3 is past the end
    rerender({ total: 30 });
    expect(result.current.paging.queryParams.pageNumber).toBe(1);
    expect(result.current.props.currentPage).toBe(1);

    // everything gone: back to the first, empty one
    rerender({ total: 0 });
    expect(result.current.paging.queryParams.pageNumber).toBe(0);
  });
});
