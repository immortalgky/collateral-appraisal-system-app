import { describe, expect, it } from 'vitest';
import { fillColumnWidths, storedWidthForShown } from './fillWidths';

const widths = { a: 200, b: 100, c: 100 };

describe('fillColumnWidths', () => {
  it('returns null when the columns already reach or pass the container', () => {
    expect(fillColumnWidths(['a', 'b', 'c'], widths, 400)).toBeNull();
    expect(fillColumnWidths(['a', 'b', 'c'], widths, 300)).toBeNull();
    expect(fillColumnWidths(['a', 'b', 'c'], widths, 0)).toBeNull();
  });

  it('grows every column by its share, so the user widths are only ever minimums', () => {
    const out = fillColumnWidths(['a', 'b', 'c'], widths, 800)!;
    // 400 extra, shared 2:1:1
    expect(out).toEqual({ a: 400, b: 200, c: 200 });
    for (const k of ['a', 'b', 'c'] as const) expect(out[k]).toBeGreaterThanOrEqual(widths[k]);
  });

  it('sums to the container exactly, whole pixels, with the remainder on the last column', () => {
    const out = fillColumnWidths(['a', 'b', 'c'], widths, 1001)!;
    expect(out.a + out.b + out.c).toBe(1001);
    for (const v of Object.values(out)) expect(Number.isInteger(v)).toBe(true);
  });

  it('leaves room for what the table spends outside these columns', () => {
    const out = fillColumnWidths(['a', 'b'], { a: 100, b: 100 }, 548, 48)!;
    expect(out.a + out.b).toBe(500);
  });

  it('has nothing to fill with no columns', () => {
    expect(fillColumnWidths([], {}, 800)).toBeNull();
  });
});

describe('storedWidthForShown', () => {
  const keys = ['a', 'b'];
  const stored = { a: 250, b: 250 };
  const C = 1000; // the table is filled: both show 500

  // what the table then renders for a column, given the stored widths
  const shownAfter = (widths: Record<string, number>, key: string) =>
    (fillColumnWidths(keys, widths, C) ?? widths)[key];

  it('stores less than what is shown while the table is filled, since the fill scales it up', () => {
    expect(shownAfter(stored, 'a')).toBe(500);
    const s = storedWidthForShown(keys, stored, 'a', 450, C);
    expect(s).toBeLessThan(450);
    // and the column then renders at the width the cursor asked for (the others rescale)
    expect(Math.abs(shownAfter({ ...stored, a: s }, 'a') - 450)).toBeLessThanOrEqual(1);
  });

  it('never renders a column wider than before when it is dragged narrower', () => {
    let previous = shownAfter(stored, 'a');
    for (const target of [490, 450, 400, 300, 200, 100]) {
      const s = storedWidthForShown(keys, stored, 'a', target, C);
      const shown = shownAfter({ ...stored, a: s }, 'a');
      expect(shown).toBeLessThanOrEqual(previous);
      expect(s).toBeLessThanOrEqual(shown);
      previous = shown;
    }
  });

  it('follows the cursor wider too, and stores what is shown once the table is no longer filled', () => {
    const wider = storedWidthForShown(keys, stored, 'a', 600, C);
    expect(Math.abs(shownAfter({ ...stored, a: wider }, 'a') - 600)).toBeLessThanOrEqual(1);
    // asked for more than the room the other column leaves (1000 - 250): not filled, shown = stored
    expect(storedWidthForShown(keys, stored, 'a', 800, C)).toBe(800);
  });

  it('is the identity before the container is measured, and for a lone column', () => {
    expect(storedWidthForShown(keys, stored, 'a', 450, 0)).toBe(450);
    expect(storedWidthForShown(['a'], { a: 250 }, 'a', 450, C)).toBe(450);
  });

  it('accounts for the fixed (row-number) column', () => {
    const s = storedWidthForShown(keys, stored, 'a', 450, 1048, 48);
    const filled = fillColumnWidths(keys, { ...stored, a: s }, 1048, 48)!;
    expect(Math.abs(filled.a - 450)).toBeLessThanOrEqual(1);
  });
});
