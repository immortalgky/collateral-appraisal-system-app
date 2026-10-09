import { describe, it, expect } from 'vitest';
import { isSameFilterOtherPage } from './keepPreviousPage';

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
});
