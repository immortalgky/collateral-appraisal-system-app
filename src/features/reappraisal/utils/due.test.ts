import { describe, expect, it } from 'vitest';
import { diffYMD, dueOf, formatDay, parseDay, urgencyOf } from './due';

describe('due', () => {
  it('parses a plain date as local midnight', () => {
    const d = parseDay('2026-04-02T00:00:00')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 3, 2, 0]);
    expect(parseDay(undefined)).toBeUndefined();
    expect(parseDay('not a date')).toBeUndefined();
    expect(formatDay('2026-04-02')).toBe('02/04/2026');
    expect(formatDay(undefined)).toBe('—');
  });

  it('dates the review five years on and counts the days left', () => {
    const r = dueOf('2021-11-20', new Date(2026, 9, 1))!;
    expect(r.due).toEqual(new Date(2026, 10, 20));
    expect(r.daysLeft).toBe(50);
    expect(dueOf('2021-08-15', new Date(2026, 9, 1))!.daysLeft).toBe(-47);
    // Same as DATEADD(YEAR, 5, '2020-02-29') in the view: 28 Feb, not 1 Mar.
    expect(dueOf('2020-02-29', new Date(2025, 1, 28))!.due).toEqual(new Date(2025, 1, 28));
  });

  it('grades urgency at overdue / 90 days / one year', () => {
    expect([-1, 0, 90, 91, 365, 366].map(urgencyOf)).toEqual([
      'overdue',
      'soon',
      'soon',
      'year',
      'year',
      'later',
    ]);
  });

  it('borrows real month lengths', () => {
    expect(diffYMD(new Date(2020, 0, 31), new Date(2020, 2, 1))).toEqual({ y: 0, m: 1, d: 1 });
    expect(diffYMD(new Date(2026, 9, 1), new Date(2031, 3, 2))).toEqual({ y: 4, m: 6, d: 1 });
  });
});
