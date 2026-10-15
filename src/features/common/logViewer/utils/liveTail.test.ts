import { describe, it, expect } from 'vitest';
import { maxId, mergeLiveBuffer, nextDrainStep } from './liveTail';

describe('maxId', () => {
  it('returns null for an empty batch', () => {
    expect(maxId([])).toBeNull();
  });

  it('returns the max id regardless of array order', () => {
    expect(maxId([{ id: 12 }, { id: 30 }, { id: 7 }])).toBe(30);
  });

  it('returns the single id when the batch has exactly one row', () => {
    expect(maxId([{ id: 42 }])).toBe(42);
  });
});

describe('nextDrainStep', () => {
  it('seeds the cursor from an empty batch (quiet window, nothing found yet)', () => {
    expect(nextDrainStep([], false, null, 0, 5)).toEqual({ cursor: null, shouldContinue: false });
  });

  it('seeds the cursor from the first batch found', () => {
    expect(nextDrainStep([{ id: 5 }, { id: 9 }], false, null, 0, 5)).toEqual({
      cursor: 9,
      shouldContinue: false,
    });
  });

  it('keeps the current cursor when a drain call returns nothing new', () => {
    expect(nextDrainStep([], true, 100, 1, 5)).toEqual({ cursor: 100, shouldContinue: true });
  });

  it('advances the cursor and continues while hasMore is true and under the call cap', () => {
    expect(nextDrainStep([{ id: 101 }, { id: 105 }], true, 100, 1, 5)).toEqual({
      cursor: 105,
      shouldContinue: true,
    });
  });

  it('stops once hasMore is false, even under the call cap', () => {
    expect(nextDrainStep([{ id: 110 }], false, 105, 2, 5)).toEqual({
      cursor: 110,
      shouldContinue: false,
    });
  });

  it('stops once the call cap is reached, even if hasMore is still true', () => {
    expect(nextDrainStep([{ id: 110 }], true, 105, 5, 5)).toEqual({
      cursor: 110,
      shouldContinue: false,
    });
  });
});

describe('mergeLiveBuffer', () => {
  it('prepends fresh items in front of the existing buffer', () => {
    const prev = [{ id: 5 }, { id: 4 }];
    const fresh = [{ id: 7 }, { id: 6 }];
    expect(mergeLiveBuffer(prev, fresh, 500)).toEqual([{ id: 7 }, { id: 6 }, { id: 5 }, { id: 4 }]);
  });

  it('dedupes ids already in the buffer', () => {
    const prev = [{ id: 5 }, { id: 4 }];
    const fresh = [{ id: 6 }, { id: 5 }];
    expect(mergeLiveBuffer(prev, fresh, 500)).toEqual([{ id: 6 }, { id: 5 }, { id: 4 }]);
  });

  it('returns the same array reference when there is nothing new to add', () => {
    const prev = [{ id: 5 }];
    expect(mergeLiveBuffer(prev, [{ id: 5 }], 500)).toBe(prev);
    expect(mergeLiveBuffer(prev, [], 500)).toBe(prev);
  });

  it('caps the merged buffer at the given size, keeping the highest ids first', () => {
    const prev = Array.from({ length: 498 }, (_, i) => ({ id: i }));
    const fresh = [{ id: 1000 }, { id: 1001 }, { id: 1002 }];
    const result = mergeLiveBuffer(prev, fresh, 500);
    expect(result).toHaveLength(500);
    expect(result[0]).toEqual({ id: 1002 });
  });

  it('keeps the newest ids when a multi-batch drain tick collects oldest-batch-first and exceeds the cap', () => {
    // Simulates a burst: 3 sequential drain calls within one tick, each returning 200 rows, with
    // later calls carrying HIGHER (newer) ids — collected in fetch order (oldest batch first),
    // exactly how useLiveTail's drain loop pushes them. Total (600) exceeds the 500 cap.
    const batch = (start: number, end: number) =>
      Array.from({ length: end - start + 1 }, (_, i) => ({ id: start + i }));
    const fresh = [...batch(1, 200), ...batch(201, 400), ...batch(401, 600)];
    const result = mergeLiveBuffer([], fresh, 500);
    expect(result).toHaveLength(500);
    // The newest 500 of ids 1..600 are 101..600 — not the oldest 500 (1..500), which the bug
    // would have produced by capping the array before sorting it.
    expect(result[0].id).toBe(600);
    expect(result.at(-1)!.id).toBe(101);
  });
});
