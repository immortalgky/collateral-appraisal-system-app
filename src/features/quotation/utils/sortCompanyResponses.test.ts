import { describe, it, expect } from 'vitest';
import { sortCompanyResponses, type CompanyResponseSortKey } from './sortCompanyResponses';

type Row = CompanyResponseSortKey & { id: string };

const row = (
  id: string,
  status: string,
  totalNetAmount: number | null | undefined,
  companyName = id,
): Row => ({ id, status, totalNetAmount, companyName });

const ids = (rows: Row[]) => rows.map(r => r.id);

describe('sortCompanyResponses', () => {
  it('puts Submitted ("Quoted") ahead of every other status', () => {
    const rows = [
      row('declined', 'Declined', 1000),
      row('quoted', 'Submitted', 5000),
      row('pending', 'Pending', null),
    ];
    expect(ids(sortCompanyResponses(rows, r => r))).toEqual(['quoted', 'declined', 'pending']);
  });

  it('orders the full status ladder: Submitted, UnderReview, Tentative, Negotiating, Accepted, Declined, Rejected, Withdrawn', () => {
    const rows = [
      row('withdrawn', 'Withdrawn', 1),
      row('rejected', 'Rejected', 1),
      row('declined', 'Declined', 1),
      row('accepted', 'Accepted', 1),
      row('negotiating', 'Negotiating', 1),
      row('tentative', 'Tentative', 1),
      row('underReview', 'UnderReview', 1),
      row('submitted', 'Submitted', 1),
    ];
    expect(ids(sortCompanyResponses(rows, r => r))).toEqual([
      'submitted',
      'underReview',
      'tentative',
      'negotiating',
      'accepted',
      'declined',
      'rejected',
      'withdrawn',
    ]);
  });

  it('sorts by total net amount ascending within the same status', () => {
    const rows = [
      row('high', 'Submitted', 3000),
      row('low', 'Submitted', 1000),
      row('mid', 'Submitted', 2000),
    ];
    expect(ids(sortCompanyResponses(rows, r => r))).toEqual(['low', 'mid', 'high']);
  });

  it('buckets Draft, PendingCheckerReview, and the synthetic Pending together at the bottom', () => {
    const rows = [
      row('submitted', 'Submitted', 1000, 'A Submitted Co'),
      row('draft', 'Draft', null, 'B Draft Co'),
      row('pendingChecker', 'PendingCheckerReview', null, 'C Checker Co'),
      row('pending', 'Pending', null, 'D Pending Co'),
    ];
    const sorted = sortCompanyResponses(rows, r => r);
    // All three bottom-bucket rows tie on rank, so they fall through to the name tiebreak —
    // the point of this test is that none of them outrank the Submitted row above them.
    expect(ids(sorted)).toEqual(['submitted', 'draft', 'pendingChecker', 'pending']);
  });

  it('ignores amount within the no-bid bucket and falls straight to the name tiebreak', () => {
    // A Draft row with a stray non-null amount must not outrank Pending/PendingCheckerReview by price.
    const rows = [
      row('zebraDraft', 'Draft', 999999, 'Zebra Co'),
      row('alphaPending', 'Pending', null, 'Alpha Co'),
    ];
    expect(ids(sortCompanyResponses(rows, r => r))).toEqual(['alphaPending', 'zebraDraft']);
  });

  it('treats a missing/null amount as the worst case within a real status group', () => {
    const rows = [row('hasAmount', 'Declined', 500), row('noAmount', 'Declined', null)];
    expect(ids(sortCompanyResponses(rows, r => r))).toEqual(['hasAmount', 'noAmount']);
  });

  it('breaks a full tie (same status, same amount) by raw company name, ascending', () => {
    const rows = [
      row('c', 'Submitted', 1000, 'Charlie Appraisals'),
      row('a', 'Submitted', 1000, 'Alpha Appraisals'),
      row('b', 'Submitted', 1000, 'Bravo Appraisals'),
    ];
    expect(ids(sortCompanyResponses(rows, r => r))).toEqual(['a', 'b', 'c']);
  });

  it('falls back to the bottom bucket for an unrecognized status instead of throwing', () => {
    const rows = [row('known', 'Submitted', 1000), row('unknown', 'SomeFutureStatus', 1)];
    expect(ids(sortCompanyResponses(rows, r => r))).toEqual(['known', 'unknown']);
  });

  it('does not mutate the input array', () => {
    const rows = [row('b', 'Declined', 1), row('a', 'Submitted', 1)];
    const original = [...rows];
    sortCompanyResponses(rows, r => r);
    expect(rows).toEqual(original);
  });

  it('reproduces the screenshot scenario: two Quoted companies ranked by net amount, Declined last', () => {
    const rows = [
      row('thai', 'Submitted', 2289.8, 'Thai Appraisal Co., Ltd.'),
      row('siam', 'Submitted', 2354.0, 'Siam Valuation Group'),
      row('northern', 'Declined', 0, 'Northern Valuation Partners'),
    ];
    expect(ids(sortCompanyResponses(rows, r => r))).toEqual(['thai', 'siam', 'northern']);
  });
});
