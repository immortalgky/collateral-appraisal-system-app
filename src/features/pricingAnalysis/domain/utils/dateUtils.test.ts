// utils/dateUtils.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDuration, formatDuration } from './dateUtils';

describe('calculateDuration', () => {
  // Basic case
  it('calculates full years and months', () => {
    const now = new Date('2026-07-25');
    const result = calculateDuration('2020-02-25 14:51:11.4028018', now);
    expect(result).toEqual({ years: 6, months: 5 });
  });

  // Incomplete month (day not yet reached)
  it("subtracts a month when day-of-month hasn't been reached", () => {
    const now = new Date('2026-03-10');
    const result = calculateDuration('2025-02-25 14:51:11.4028018', now);
    // March 10 hasn't reached the 25th yet → only 0 years, 0 months
    expect(result).toEqual({ years: 1, months: 0 });
  });

  // Same month/year
  it('returns 0 years 0 months for same month', () => {
    const now = new Date('2026-02-27');
    const result = calculateDuration('2026-02-25 14:51:11.4028018', now);
    expect(result).toEqual({ years: 0, months: 0 });
  });

  // Exact anniversary
  it('handles exact year anniversary', () => {
    const now = new Date('2027-02-25');
    const result = calculateDuration('2026-02-25 14:51:11.4028018', now);
    expect(result).toEqual({ years: 1, months: 0 });
  });

  // ! Edge: year boundary
  it('handles crossing year boundary', () => {
    const now = new Date('2027-01-26');
    const result = calculateDuration('2026-02-25 10:00:00', now);
    expect(result).toEqual({ years: 0, months: 11 });
  });

  // ! Invalid inputs
  it('throws on empty string', () => {
    expect(() => calculateDuration('')).toThrow('dateString is required');
  });

  it('throws on garbage input', () => {
    expect(() => calculateDuration('not-a-date')).toThrow('Invalid date string');
  });

  it('throws if start date is in the future', () => {
    const now = new Date('2020-01-01');
    expect(() => calculateDuration('2026-02-25 14:51:11', now)).toThrow(
      'Start date cannot be in the future',
    );
  });
});

describe('formatDuration', () => {
  it('pluralizes correctly', () => {
    expect(formatDuration({ years: 1, months: 1 })).toBe('1 year and 1 month');
    expect(formatDuration({ years: 6, months: 5 })).toBe('6 years and 5 months');
  });

  it('omits zero parts', () => {
    expect(formatDuration({ years: 3, months: 0 })).toBe('3 years');
    expect(formatDuration({ years: 0, months: 7 })).toBe('7 months');
  });

  it('handles less than a month', () => {
    expect(formatDuration({ years: 0, months: 0 })).toBe('Less than a month');
  });
});
