import { describe, it, expect } from 'vitest';
import {
  clampToNow,
  popZoomEntry,
  pushZoomEntry,
  resolveAroundRange,
  resolveRange,
  validateRange,
  validOrAroundNow,
  type RangeState,
} from './range';

describe('pushZoomEntry / popZoomEntry', () => {
  it('pushes without mutating the original array', () => {
    const stack: RangeState[] = [];
    const next = pushZoomEntry(stack, { kind: 'preset', hours: 24, nonce: 1 });
    expect(stack).toEqual([]);
    expect(next).toHaveLength(1);
  });

  it('pops the most recently pushed entry, LIFO', () => {
    const a: RangeState = { kind: 'preset', hours: 24, nonce: 1 };
    const b: RangeState = {
      kind: 'custom',
      from: new Date('2026-01-01T00:00:00'),
      to: new Date('2026-01-02T00:00:00'),
    };
    const stack = pushZoomEntry(pushZoomEntry([], a), b);
    const { entry, rest } = popZoomEntry(stack);
    expect(entry).toBe(b);
    expect(rest).toEqual([a]);
  });

  it('returns null and the same (empty) array when the stack is empty', () => {
    const { entry, rest } = popZoomEntry([]);
    expect(entry).toBeNull();
    expect(rest).toEqual([]);
  });

  it('a popped preset re-resolves against a fresh now, not a frozen timestamp from push time', () => {
    // This is the point of storing RangeState rather than resolved from/to: zooming back out to
    // "24h" should mean "the last 24h as of right now", not the window it happened to mean
    // several clicks ago.
    const preset: RangeState = { kind: 'preset', hours: 24, nonce: 1 };
    const { entry } = popZoomEntry(pushZoomEntry([], preset));
    const nowA = new Date('2026-09-28T10:00:00');
    const nowB = new Date('2026-09-28T12:00:00');
    expect(resolveRange(entry!, nowA).to).toEqual(nowA);
    expect(resolveRange(entry!, nowB).to).toEqual(nowB);
  });
});

describe('validateRange', () => {
  const now = new Date('2026-09-28T12:00:00');

  it('accepts a span right at the 31-day max', () => {
    const from = new Date(now.getTime() - 31 * 24 * 3600_000);
    expect(validateRange(from, now, now)).toBeNull();
  });

  it('rejects a span wider than 31 days', () => {
    const from = new Date(now.getTime() - 32 * 24 * 3600_000);
    expect(validateRange(from, now, now)).toBe('errors.spanTooWide');
  });
});

describe('clampToNow', () => {
  it('clamps to to now when it would be in the future', () => {
    const now = new Date('2026-09-28T12:00:00');
    const range = { from: new Date('2026-09-28T11:00:00'), to: new Date('2026-09-28T12:30:00') };
    expect(clampToNow(range, now)).toEqual({ from: range.from, to: now });
  });

  it('leaves the range alone when to is already at or before now', () => {
    const now = new Date('2026-09-28T12:00:00');
    const range = { from: new Date('2026-09-28T11:00:00'), to: new Date('2026-09-28T11:30:00') };
    expect(clampToNow(range, now)).toEqual(range);
  });
});

describe('resolveAroundRange', () => {
  it('clamps to to now instead of producing a future to, e.g. an incident a few minutes ago', () => {
    const now = new Date('2026-09-28T12:00:00');
    const at = new Date('2026-09-28T11:58:00'); // 2 minutes ago
    const result = resolveAroundRange(at, 5, now); // ±5min would put `to` at 12:03, after now
    expect(result.to).toEqual(now);
    expect(result.from).toEqual(new Date('2026-09-28T11:53:00'));
  });

  it('leaves to alone when it does not reach into the future', () => {
    const now = new Date('2026-09-28T12:00:00');
    const at = new Date('2026-09-28T10:00:00');
    const result = resolveAroundRange(at, 5, now);
    expect(result.to).toEqual(new Date('2026-09-28T10:05:00'));
  });
});

describe('validOrAroundNow', () => {
  const now = new Date('2026-09-28T12:00:00');

  it('leaves an already-valid range alone', () => {
    const range = { from: new Date('2026-09-28T11:00:00'), to: new Date('2026-09-28T11:30:00') };
    expect(validOrAroundNow(range, 2, now)).toEqual(range);
  });

  it('falls back to a window ending at now when both ends are after now (clock skew)', () => {
    // clampToNow alone only clamps `to` — a `from` that's ALSO after `now` (clock skew between
    // the browser and the server) needs the fuller validateRange check to be caught at all.
    const bothAfterNow = {
      from: new Date('2026-09-28T12:05:00'),
      to: new Date('2026-09-28T12:10:00'),
    };
    const result = validOrAroundNow(bothAfterNow, 2, now);
    expect(result).toEqual({
      from: new Date('2026-09-28T11:58:00'),
      to: new Date('2026-09-28T12:02:00'),
    });
  });

  it('falls back to a window ending at now for a NaN range', () => {
    const invalid = { from: new Date('not-a-date'), to: now };
    const result = validOrAroundNow(invalid, 2, now);
    expect(result.from.getTime()).not.toBeNaN();
    expect(result.to.getTime()).not.toBeNaN();
  });
});
