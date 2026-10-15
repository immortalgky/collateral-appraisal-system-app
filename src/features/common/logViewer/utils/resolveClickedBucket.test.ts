import { describe, it, expect } from 'vitest';
import { resolveClickedBucket } from './resolveClickedBucket';

const buckets = [
  { start: '2026-09-27T15:17:00' },
  { start: '2026-09-27T15:20:00' },
  { start: '2026-09-27T15:23:00' },
];

describe('resolveClickedBucket', () => {
  it('finds the bucket whose start matches activeLabel — regardless of empty buckets before it', () => {
    // Mirrors the bug report: several zero-height buckets precede the clicked one, so any
    // per-series rendered-rectangle index would drift. Lookup by label is immune to that.
    expect(resolveClickedBucket(buckets, '2026-09-27T15:23:00')).toBe(buckets[2]);
  });

  it('returns null when activeLabel matches no bucket', () => {
    expect(resolveClickedBucket(buckets, '2026-09-27T16:00:00')).toBeNull();
  });

  it('returns null for a non-string activeLabel (chart clicked outside any bar)', () => {
    expect(resolveClickedBucket(buckets, undefined)).toBeNull();
    expect(resolveClickedBucket(buckets, 42)).toBeNull();
  });
});
