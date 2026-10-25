import { describe, it, expect } from 'vitest';
import { isSameFilterOtherPage, keepPreviousPage } from './keepPreviousPage';

describe('isSameFilterOtherPage', () => {
  it('is true when only the page differs', () => {
    expect(
      isSameFilterOtherPage(
        { status: 'Pending', queue: 'q', pageNumber: 1 },
        { status: 'Pending', queue: 'q', pageNumber: 2 },
      ),
    ).toBe(true);
  });

  it.each([
    ['tab', { status: 'Retried', pageNumber: 1 }],
    ['filter', { status: 'Pending', queue: 'other', pageNumber: 1 }],
    ['search', { status: 'Pending', queue: 'q', search: 'abc', pageNumber: 1 }],
  ])('is false when the %s differs', (_name, next) => {
    expect(isSameFilterOtherPage({ status: 'Pending', queue: 'q', pageNumber: 1 }, next)).toBe(
      false,
    );
  });

  it('treats an undefined filter and a missing one as equal', () => {
    expect(
      isSameFilterOtherPage({ status: 'Pending', node: undefined }, { status: 'Pending' }),
    ).toBe(true);
  });

  it('is false when there is no previous query', () => {
    expect(isSameFilterOtherPage(undefined, { status: 'Pending' })).toBe(false);
  });

  it('ignores the extra keys it is told to, and still tells another filter apart', () => {
    const ignored = ['pageNumber', 'pageSize', 'sortBy'];
    expect(
      isSameFilterOtherPage(
        { pageNumber: 0, pageSize: 25, q: 'a' },
        { pageNumber: 2, pageSize: 50, q: 'a' },
        ignored,
      ),
    ).toBe(true);
    expect(
      isSameFilterOtherPage({ pageNumber: 0, q: 'a' }, { pageNumber: 0, q: 'b' }, ignored),
    ).toBe(false);
  });
});

describe('keepPreviousPage', () => {
  const rows = { items: [{ id: 1 }], count: 9 };
  const prevQuery = (params: object) => ({ queryKey: ['list', 'x', params] });

  it('keeps the previous result for another page of the same list, at the key index it is told', () => {
    const keep = keepPreviousPage({ pageNumber: 2, q: 'a' }, 2);
    expect(keep(rows, prevQuery({ pageNumber: 1, q: 'a' }))).toBe(rows);
  });

  it('drops it for another filter, or with no previous query', () => {
    expect(
      keepPreviousPage({ pageNumber: 1, q: 'b' }, 2)(rows, prevQuery({ pageNumber: 1, q: 'a' })),
    ).toBeUndefined();
    expect(keepPreviousPage({ pageNumber: 1 }, 2)(rows, undefined)).toBeUndefined();
    expect(
      keepPreviousPage({ pageNumber: 1 }, 2)(undefined, prevQuery({ pageNumber: 1 })),
    ).toBeUndefined();
  });

  it('keeps a list that really is empty, so sorting it does not flicker', () => {
    const keep = keepPreviousPage({ pageNumber: 1, sortBy: 'x' }, 2, {
      ignored: ['pageNumber', 'sortBy'],
    });
    const empty = { items: [], count: 0 };
    expect(keep(empty, prevQuery({ pageNumber: 1 }))).toBe(empty);
  });

  it('drops an emptied page (no rows, but the total says there are some)', () => {
    const keep = keepPreviousPage({ pageNumber: 2 }, 2);
    expect(keep({ items: [], count: 9 }, prevQuery({ pageNumber: 1 }))).toBeUndefined();
  });

  it('passes the ignored keys on', () => {
    const keep = keepPreviousPage({ pageNumber: 2, sortBy: 'x' }, 2, {
      ignored: ['pageNumber', 'sortBy'],
    });
    expect(keep(rows, prevQuery({ pageNumber: 1, sortBy: 'y' }))).toBe(rows);
  });

  it('keeps an emptied page where the caller steps back in time (keepEmptiedPage)', () => {
    const keep = keepPreviousPage({ pageNumber: 2 }, 2, { keepEmptiedPage: true });
    const emptied = { items: [], count: 9 };
    expect(keep(emptied, prevQuery({ pageNumber: 1 }))).toBe(emptied);
  });

  it('judges a result with no items by its total, and never throws on it', () => {
    const keep = keepPreviousPage({ pageNumber: 2 }, 2);
    // an envelope of another shape: nothing to show and no total saying it is empty
    expect(keep({} as never, prevQuery({ pageNumber: 1 }))).toBeUndefined();
    expect(keep({ count: 3 } as never, prevQuery({ pageNumber: 1 }))).toBeUndefined();
    // no rows and a total of 0: the list really is empty
    const empty = { count: 0 };
    expect(keep(empty as never, prevQuery({ pageNumber: 1 }))).toBe(empty);
  });
});
