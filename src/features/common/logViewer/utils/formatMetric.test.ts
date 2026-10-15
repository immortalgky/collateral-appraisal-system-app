import { describe, it, expect } from 'vitest';
import { formatP95, uptimeBreakdown } from './formatMetric';

describe('formatP95', () => {
  it('renders under 1000ms as whole milliseconds', () => {
    expect(formatP95(180)).toBe('180 ms');
    expect(formatP95(999)).toBe('999 ms');
  });

  it('renders 1000ms and above as seconds with 1 decimal', () => {
    expect(formatP95(1000)).toBe('1.0 s');
    expect(formatP95(22400)).toBe('22.4 s');
  });

  it('renders null or a missing value (the API omits the key) as an em dash', () => {
    expect(formatP95(null)).toBe('—');
    expect(formatP95(undefined)).toBe('—');
  });
});

describe('uptimeBreakdown', () => {
  it('reports hours and minutes under a day', () => {
    const start = new Date('2026-09-26T10:00:00');
    const now = new Date('2026-09-26T13:30:00');
    expect(uptimeBreakdown(start.toISOString(), now)).toEqual({ days: 0, hours: 3, minutes: 30 });
  });

  it('reports whole days once it clears 24h', () => {
    const start = new Date('2026-09-24T10:00:00');
    const now = new Date('2026-09-26T13:00:00');
    expect(uptimeBreakdown(start.toISOString(), now)).toEqual({ days: 2, hours: 3, minutes: 0 });
  });

  it('floors minutes so they never round up to 60', () => {
    // 1h 59m 59s — (59/60) rounds to 60, but must floor to 59.
    const now = new Date('2026-09-26T12:00:00');
    const start = new Date(now.getTime() - (1 * 3600_000 + 59 * 60_000 + 59_000));
    expect(uptimeBreakdown(start.toISOString(), now)).toEqual({ days: 0, hours: 1, minutes: 59 });
  });
});
