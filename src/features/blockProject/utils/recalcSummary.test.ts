import { describe, expect, it } from 'vitest';

import type { ProjectUnitPrice } from '../types';
import { summarizeRecalc } from './recalcSummary';

const unit = (over: Partial<ProjectUnitPrice> = {}): ProjectUnitPrice =>
  ({
    projectUnitId: 'u1',
    sequenceNumber: 1,
    totalAppraisalValue: 1_000_000,
    totalAppraisalValueRounded: 1_000_000,
    forceSellingPrice: 800_000,
    coverageAmount: 100_000,
    ...over,
  }) as ProjectUnitPrice;

describe('summarizeRecalc', () => {
  it('counts the units whose figures changed and the delta of both totals', () => {
    const before = [unit(), unit({ projectUnitId: 'u2' }), unit({ projectUnitId: 'u3' })];
    const after = [
      unit({ totalAppraisalValueRounded: 1_250_000, forceSellingPrice: 1_000_000 }),
      unit({ projectUnitId: 'u2' }),
      unit({ projectUnitId: 'u3', forceSellingPrice: 700_000 }),
    ];

    expect(summarizeRecalc(before, after)).toEqual({
      changed: 2,
      units: 3,
      valueBefore: 3_000_000,
      valueAfter: 3_250_000,
      forceBefore: 2_400_000,
      forceAfter: 2_500_000,
    });
  });

  it('matches rows by unit id, not position; a cent of float noise is no change', () => {
    const before = [unit(), unit({ projectUnitId: 'u2' })];
    const after = [unit({ projectUnitId: 'u2', forceSellingPrice: 800_000.004 }), unit()];

    expect(summarizeRecalc(before, after).changed).toBe(0);
  });

  it('a unit that had no row before counts as changed; unpriced units add nothing to the totals', () => {
    const before = [unit({ totalAppraisalValueRounded: undefined, forceSellingPrice: undefined })];
    const after = [
      unit({ totalAppraisalValueRounded: 500_000, forceSellingPrice: 400_000 }),
      unit({ projectUnitId: 'new' }),
    ];

    const s = summarizeRecalc(before, after);
    expect(s).toMatchObject({
      changed: 2,
      valueBefore: 0,
      valueAfter: 1_500_000,
      forceAfter: 1_200_000,
    });
  });

  it('an empty refresh reads as zero units, zero totals', () => {
    expect(summarizeRecalc([unit()], [])).toMatchObject({ changed: 0, units: 0, valueAfter: 0 });
  });
});
