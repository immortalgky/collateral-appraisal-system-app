import { describe, expect, it } from 'vitest';
import { roundAwayFromZero, snap, truncateTowardZero } from './decimalRounding';

describe('roundAwayFromZero', () => {
  it('rounds halves away from zero, for either sign', () => {
    expect(roundAwayFromZero(2.5)).toBe(3);
    expect(roundAwayFromZero(-2.5)).toBe(-3);
    expect(roundAwayFromZero(1_500, 1_000)).toBe(2_000);
    expect(roundAwayFromZero(-1_500, 1_000)).toBe(-2_000);
    expect(roundAwayFromZero(1_499.999999, 1_000)).toBe(1_000);
    expect(roundAwayFromZero(0)).toBe(0);
  });

  it('rounds to a fractional step (2 decimals) without float noise', () => {
    expect(roundAwayFromZero(1_368_827.625, 0.01)).toBe(1_368_827.63);
    expect(roundAwayFromZero(3_086.375, 0.01)).toBe(3_086.38);
    expect(roundAwayFromZero(-3_086.375, 0.01)).toBe(-3_086.38);
    expect(roundAwayFromZero(2.5, 0.01)).toBe(2.5);
  });

  it('snaps the scaled product too (cases where abs x 100 lands just under the half)', () => {
    expect(roundAwayFromZero(4_252_575.015, 0.01)).toBe(4_252_575.02);
    expect(roundAwayFromZero(5_190_797.265, 0.01)).toBe(5_190_797.27);
    expect(roundAwayFromZero(4_274_675.145, 0.01)).toBe(4_274_675.15);
  });

  it('matches exact decimal rounding for random half-cent values (seeded)', () => {
    // mulberry32: a fixed seed keeps the test deterministic.
    let seed = 20261016;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // Up to 6e7 baht: beyond ~2^26 a double cannot hold a half cent, so there is nothing to recover.
    for (let i = 0; i < 5000; i++) {
      const cents = Math.floor(random() * 6e7 * 100);
      const tenthsOfCent = cents * 10 + 5; // the value, in integer tenths of a cent
      const expectedCents = Math.floor((tenthsOfCent + 5) / 10); // half rounds up (positive)
      const value = tenthsOfCent / 1000;
      expect(roundAwayFromZero(value, 0.01), `${value}`).toBe(expectedCents / 100);
      expect(roundAwayFromZero(-value, 0.01), `-${value}`).toBe(-expectedCents / 100);
    }
  });

  it('snap never returns -0', () => {
    expect(Object.is(snap(-0), 0)).toBe(true);
    expect(Object.is(snap(-0.0000001), 0)).toBe(true);
  });

  it('never returns -0', () => {
    expect(Object.is(roundAwayFromZero(-3000, 10000), 0)).toBe(true);
    expect(Object.is(roundAwayFromZero(-0.4), 0)).toBe(true);
  });
});

describe('truncateTowardZero', () => {
  it('drops the extra digits toward zero, for either sign', () => {
    expect(truncateTowardZero(1_369_326.129, 0.01)).toBe(1_369_326.12);
    expect(truncateTowardZero(-1.129, 0.01)).toBe(-1.12);
    expect(truncateTowardZero(1_999, 1_000)).toBe(1_000);
  });

  it('is not fooled by float noise (0.29 x 100 is 28.999999999999996)', () => {
    expect(truncateTowardZero(0.29, 0.01)).toBe(0.29);
  });

  it('never returns -0', () => {
    expect(Object.is(truncateTowardZero(-0.004, 0.01), 0)).toBe(true);
  });
});
