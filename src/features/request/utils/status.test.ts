import { describe, it, expect } from 'vitest';
import { isRequestSubmitted } from './status';

describe('isRequestSubmitted', () => {
  it('treats the intake statuses as not yet submitted', () => {
    expect(isRequestSubmitted('Draft')).toBe(false);
    expect(isRequestSubmitted('New')).toBe(false);
  });

  it('matches case-insensitively', () => {
    expect(isRequestSubmitted('draft')).toBe(false);
    expect(isRequestSubmitted('NEW')).toBe(false);
  });

  it('treats every post-submit status as submitted', () => {
    expect(isRequestSubmitted('Submitted')).toBe(true);
    expect(isRequestSubmitted('Assigned')).toBe(true);
    expect(isRequestSubmitted('InProgress')).toBe(true);
    expect(isRequestSubmitted('Completed')).toBe(true);
    expect(isRequestSubmitted('Cancelled')).toBe(true);
  });

  it('treats a request with requestedAt as submitted whatever the status says', () => {
    // Legacy rows demoted to 'New' by the original post-submit-save bug still carry requestedAt,
    // and the backend rejects delete/draft/submit on them. The UI must agree.
    expect(isRequestSubmitted('New', '2026-08-21T09:00:00+07:00')).toBe(true);
    expect(isRequestSubmitted('Draft', '2026-08-21T09:00:00+07:00')).toBe(true);
  });

  it('ignores an absent requestedAt and falls back to the status', () => {
    expect(isRequestSubmitted('New', null)).toBe(false);
    expect(isRequestSubmitted('New', undefined)).toBe(false);
    expect(isRequestSubmitted('New', '')).toBe(false);
  });

  it('fails closed on a missing or unknown status so destructive actions stay hidden', () => {
    expect(isRequestSubmitted(undefined)).toBe(true);
    expect(isRequestSubmitted('')).toBe(true);
    expect(isRequestSubmitted('SomeStatusAddedLater')).toBe(true);
  });
});
