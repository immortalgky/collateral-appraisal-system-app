import { describe, it, expect } from 'vitest';
import { roundSumToThousand, toStoredUnits } from '@/features/pricingAnalysis/domain/calculation';

/**
 * The FE's copy of how a decimal column stores a posted figure: the decimal text JSON.stringify
 * sends, rounded half away from zero (SQL Server, MidpointRounding.AwayFromZero).
 */
describe('toStoredUnits', () => {
  it('rounds a tie away from zero, at any number of places', () => {
    expect(toStoredUnits(205277.625, 2)).toBe(20527763);
    expect(toStoredUnits(-205277.625, 2)).toBe(-20527763);
    expect(toStoredUnits(3 * 1.1, 4)).toBe(33000);
  });

  it('rounds the posted text, not the float', () => {
    // "1.005" is stored 1.01 although the float is 1.00499…; "205277.62499999997" is stored .62.
    expect(toStoredUnits(1.005, 2)).toBe(101);
    expect(toStoredUnits(205277.62499999997, 2)).toBe(20527762);
  });

  it('never yields -0, and reads commas and blanks the way toNumber does', () => {
    expect(Object.is(toStoredUnits(-1.4551915228366852e-10, 2), 0)).toBe(true);
    expect(Object.is(toStoredUnits(-0.004, 2), 0)).toBe(true);
    expect(toStoredUnits('1,234.565', 2)).toBe(123457);
    expect(toStoredUnits(null, 2)).toBe(0);
  });
});

describe('roundSumToThousand', () => {
  it('sums each figure as stored, then rounds the total half away from zero', () => {
    expect(roundSumToThousand([250_499.995, 0.004])).toEqual({ sum: 250_500, rounded: 251_000 });
    expect(roundSumToThousand([250_499.994])).toEqual({ sum: 250_499.99, rounded: 250_000 });
  });
});
