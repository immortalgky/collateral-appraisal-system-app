import { describe, expect, it } from 'vitest';
import { isMidnightTime } from './dateUtils';

describe('isMidnightTime', () => {
  it('is true when the time-of-day is exactly 00:00, on any date', () => {
    expect(isMidnightTime(new Date(2026, 8, 25, 0, 0))).toBe(true);
    expect(isMidnightTime(new Date(2027, 0, 1, 0, 0).toISOString())).toBe(true);
  });

  it('is false for any other time of day', () => {
    expect(isMidnightTime(new Date(2026, 8, 25, 0, 1))).toBe(false);
    expect(isMidnightTime(new Date(2026, 8, 25, 12, 0))).toBe(false);
    expect(isMidnightTime(new Date(2026, 8, 25, 23, 59))).toBe(false);
  });

  it('is false for blank or unparseable input', () => {
    expect(isMidnightTime(null)).toBe(false);
    expect(isMidnightTime(undefined)).toBe(false);
    expect(isMidnightTime('')).toBe(false);
    expect(isMidnightTime('not-a-date')).toBe(false);
  });
});
