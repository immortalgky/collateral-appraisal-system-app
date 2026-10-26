import { describe, expect, it } from 'vitest';
import { isNonParticipatingStatus } from './quotation';

describe('isNonParticipatingStatus', () => {
  it.each([
    ['Draft', false],
    ['PendingCheckerReview', false],
    ['Submitted', false],
    ['UnderReview', false],
    ['Tentative', false],
    ['Negotiating', false],
    ['Accepted', false],
    ['Rejected', false],
    ['Withdrawn', false],
    ['Declined', true],
    ['Expired', true],
  ])('%s -> %s', (status, expected) => {
    expect(isNonParticipatingStatus(status)).toBe(expected);
  });
});
