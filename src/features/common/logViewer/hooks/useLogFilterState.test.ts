import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseInitialRange } from './useLogFilterState';
import { DEFAULT_RANGE_HOURS } from '../utils/range';

describe('parseInitialRange', () => {
  // validateRange rejects ranges older than the retention window, measured from "now" — pin the
  // clock so the fixed dates below stay inside it whatever day the suite runs.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-03T00:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a valid custom from/to pair', () => {
    const params = new URLSearchParams({
      from: '2026-09-01T00:00:00',
      to: '2026-09-02T00:00:00',
    });
    const result = parseInitialRange(params);
    expect(result.kind).toBe('custom');
  });

  it('falls back to the default preset when from/to span more than 31 days', () => {
    const params = new URLSearchParams({
      from: '2026-01-01T00:00:00',
      to: '2026-09-01T00:00:00',
    });
    const result = parseInitialRange(params);
    expect(result).toEqual({ kind: 'preset', hours: DEFAULT_RANGE_HOURS, nonce: 0 });
  });

  it('falls back to the default preset when from/to is malformed', () => {
    const params = new URLSearchParams({ from: 'not-a-date', to: 'also-not-a-date' });
    const result = parseInitialRange(params);
    expect(result).toEqual({ kind: 'preset', hours: DEFAULT_RANGE_HOURS, nonce: 0 });
  });

  it('falls back to the default preset when from is after to', () => {
    const params = new URLSearchParams({
      from: '2026-09-02T00:00:00',
      to: '2026-09-01T00:00:00',
    });
    const result = parseInitialRange(params);
    expect(result).toEqual({ kind: 'preset', hours: DEFAULT_RANGE_HOURS, nonce: 0 });
  });

  it('reads a valid preset range hours value', () => {
    const params = new URLSearchParams({ range: '168' });
    expect(parseInitialRange(params)).toEqual({ kind: 'preset', hours: 168, nonce: 0 });
  });
});
