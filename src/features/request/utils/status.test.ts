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

  it('fails closed on a missing or unknown status so destructive actions stay hidden', () => {
    expect(isRequestSubmitted(undefined)).toBe(true);
    expect(isRequestSubmitted('')).toBe(true);
    expect(isRequestSubmitted('SomeStatusAddedLater')).toBe(true);
  });
});
