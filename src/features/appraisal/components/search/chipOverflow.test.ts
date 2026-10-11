import { describe, expect, it } from 'vitest';
import { lineCount, pickVisible } from './chipOverflow';

const base = { pinned: [] as number[], forced: -1, overflowWidth: 80, tailWidth: 150, gap: 8 };

describe('lineCount', () => {
  it('fills a line, then wraps', () => {
    expect(lineCount([100, 100, 100], 400, 8)).toBe(1); // 316
    expect(lineCount([100, 100, 100, 100], 400, 8)).toBe(2); // 424 > 400
    expect(lineCount([500], 400, 8)).toBe(1);
    expect(lineCount([], 400, 8)).toBe(1);
  });
});

describe('pickVisible, one line', () => {
  it('shows every added chip when they all fit with the tail', () => {
    // 100 + 100 + 100 + 150 + 3 gaps of 8 = 474
    expect(pickVisible({ ...base, added: [100, 100, 100], available: 474 })).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('hides from the end, reserving room for the overflow chip', () => {
    expect(pickVisible({ ...base, added: [100, 100, 100], available: 473 })).toEqual([
      true,
      true,
      false,
    ]);
    expect(pickVisible({ ...base, added: [100, 100, 100], available: 453 })).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('hides all of them when even the overflow chip and the tail need a second line', () => {
    // 80 + 150 + a gap = 238: on a row of 200 they wrap, and the first added chip would add to that
    expect(pickVisible({ ...base, added: [100, 100, 100], available: 200 })).toEqual([
      true,
      false,
      false,
    ]);
    expect(pickVisible({ ...base, added: [300, 100], available: 200 })).toEqual([false, false]);
  });

  it('stops at the first chip that does not fit rather than skipping to a narrower one', () => {
    expect(pickVisible({ ...base, added: [100, 300, 40], available: 400 })).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('keeps the forced chip and pushes an earlier one out instead', () => {
    expect(pickVisible({ ...base, added: [100, 100, 100], forced: 2, available: 454 })).toEqual([
      true,
      false,
      true,
    ]);
    expect(pickVisible({ ...base, added: [300, 300, 100], forced: 2, available: 320 })).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('hides nothing before there is a layout to measure against', () => {
    expect(pickVisible({ ...base, added: [100, 100], available: 0 })).toEqual([true, true]);
    expect(pickVisible({ ...base, added: [], available: 100 })).toEqual([]);
  });
});

describe('pickVisible, with pinned chips', () => {
  it('counts the pinned chips against the row, and never folds them', () => {
    // pinned 3 x 100 = 316 with gaps; the tail 150 makes it 482 on one line. Nothing is left for
    // an added chip beside an overflow chip (316 + 80 + 150 + gaps > 480), so it folds
    expect(pickVisible({ ...base, pinned: [100, 100, 100], added: [100], available: 480 })).toEqual(
      [false],
    );
    // a wide row has room for it
    expect(pickVisible({ ...base, pinned: [100, 100, 100], added: [100], available: 700 })).toEqual(
      [true],
    );
  });

  it('lets the pinned chips wrap, and keeps an added chip only while it adds no line', () => {
    // row 250: pinned [100,100,100] take two lines, the tail (40) shares the second. An added chip
    // of 40 still fits on that line...
    expect(
      pickVisible({ ...base, pinned: [100, 100, 100], added: [40], tailWidth: 40, available: 250 }),
    ).toEqual([true]);
    // ...but a 100 one would need a third
    expect(
      pickVisible({
        ...base,
        pinned: [100, 100, 100],
        added: [100, 100],
        tailWidth: 40,
        available: 250,
      }),
    ).toEqual([false, false]);
  });

  it('puts the forced chip at the end of the wrapped row, even when it makes a line more', () => {
    expect(
      pickVisible({
        ...base,
        pinned: [100, 100, 100],
        added: [100, 100],
        forced: 1,
        available: 250,
      }),
    ).toEqual([false, true]);
  });
});

describe('pickVisible, safety', () => {
  it('keeps room back for a chip to fit, but does not worsen the baseline the pinned chips set', () => {
    // pinned 300 + gap + tail 150 = 458 on a row of 460: one line. A chip of 1 more does not fit
    // beside them whatever the safety (the overflow chip would not either)
    const input = { ...base, pinned: [300], added: [100], available: 460 };
    expect(pickVisible(input)).toEqual([false]);
    // an added chip that fits to the pixel on the row fits without the safety...
    expect(pickVisible({ ...base, pinned: [100], added: [100], available: 366 })).toEqual([true]);
    // ...and not with 1px kept back, which folds it instead of risking a wrapped tail
    expect(
      pickVisible({ ...base, pinned: [100], added: [100], available: 366, safety: 1 }),
    ).toEqual([false]);
  });
});

describe('pickVisible, safety at the edge of the baseline', () => {
  it('does not let the margin raise the baseline, so the first added chip cannot add a line', () => {
    // pinned 100 + overflow 80 + tail 150 + 2 gaps of 8 = 346: with the overflow chip they take
    // exactly one line on a row of 346 — but two if 1px is kept back. That margin must not become
    // the baseline: the added chip of 40 would then be let in, and it really needs a second line.
    const input = { ...base, pinned: [100], added: [40, 200], available: 346, safety: 1 };
    expect(pickVisible(input)).toEqual([false, false]);
    // the same without a margin
    expect(pickVisible({ ...input, safety: 0 })).toEqual([false, false]);
  });

  it('still lets a forced chip take its slot beyond that baseline', () => {
    expect(
      pickVisible({
        ...base,
        pinned: [100],
        added: [40, 200],
        forced: 0,
        available: 346,
        safety: 1,
      }),
    ).toEqual([true, false]);
  });
});
