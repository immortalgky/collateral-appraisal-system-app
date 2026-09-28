import { describe, it, expect } from 'vitest';
import { bucketWindow, formatBucketWindow, formatTimeRange } from './formatBucketWindow';

describe('formatTimeRange', () => {
  it('always includes seconds regardless of span — used by the active-range chip', () => {
    const from = new Date('2026-09-27T15:51:17');
    const to = new Date('2026-09-27T16:21:17');
    expect(formatTimeRange(from, to, true)).toBe('27/9 15:51:17 – 16:21:17');
  });

  it('shows the end date too when the range crosses midnight', () => {
    const from = new Date('2026-09-26T23:50:00');
    const to = new Date('2026-09-27T00:20:00');
    expect(formatTimeRange(from, to, true)).toBe('26/9 23:50:00 – 27/9 00:20:00');
  });

  it('drops seconds when asked to', () => {
    const from = new Date('2026-09-27T15:51:17');
    const to = new Date('2026-09-27T16:21:17');
    expect(formatTimeRange(from, to, false)).toBe('27/9 15:51 – 16:21');
  });
});

describe('bucketWindow', () => {
  it('spans exactly [start, start + bucketSeconds) with no range given', () => {
    const { from, to } = bucketWindow('2026-09-27T08:27:45', 188);
    expect(from.toISOString()).toBe(new Date('2026-09-27T08:27:45').toISOString());
    expect(to.toISOString()).toBe(new Date('2026-09-27T08:30:53').toISOString());
  });

  it('clamps `to` to rangeTo for a truncated last bucket — the zoom must match the tooltip', () => {
    const { from, to } = bucketWindow('2026-09-27T08:27:45', 188, '2026-09-27T08:29:00');
    expect(from.toISOString()).toBe(new Date('2026-09-27T08:27:45').toISOString());
    expect(to.toISOString()).toBe(new Date('2026-09-27T08:29:00').toISOString());
  });

  it('leaves `to` alone when rangeTo is later than the natural bucket end', () => {
    const { to } = bucketWindow('2026-09-27T08:27:45', 188, '2026-09-27T23:59:00');
    expect(to.toISOString()).toBe(new Date('2026-09-27T08:30:53').toISOString());
  });
});

describe('formatBucketWindow', () => {
  it('shows seconds and the date once when bucketSeconds is under 10 minutes', () => {
    // 08:27:45 + 188s = 08:30:53, matching the team lead's report.
    expect(formatBucketWindow('2026-09-27T08:27:45', 188)).toBe('27/9 08:27:45 – 08:30:53');
  });

  it('drops seconds at or above 10 minutes', () => {
    expect(formatBucketWindow('2026-09-27T08:00:00', 900)).toBe('27/9 08:00 – 08:15');
  });

  it('clamps the end to rangeTo for a truncated last bucket', () => {
    expect(formatBucketWindow('2026-09-27T08:27:45', 188, '2026-09-27T08:29:00')).toBe(
      '27/9 08:27:45 – 08:29:00',
    );
  });

  it('ignores a rangeTo that is later than the natural bucket end', () => {
    expect(formatBucketWindow('2026-09-27T08:27:45', 188, '2026-09-27T23:59:00')).toBe(
      '27/9 08:27:45 – 08:30:53',
    );
  });

  it('shows the end date too when the window crosses midnight', () => {
    // 300s is under the 10-minute cutoff, so seconds are shown here too.
    expect(formatBucketWindow('2026-09-27T23:58:00', 300)).toBe('27/9 23:58:00 – 28/9 00:03:00');
  });

  it('falls back to a single timestamp when rangeTo clamps the window to zero width', () => {
    expect(formatBucketWindow('2026-09-27T08:27:45', 188, '2026-09-27T08:27:45')).toBe(
      '27/9 08:27:45',
    );
  });
});
