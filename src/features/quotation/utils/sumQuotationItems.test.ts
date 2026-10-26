import { describe, expect, it } from 'vitest';
import { sumQuotationItems } from './sumQuotationItems';

describe('sumQuotationItems', () => {
  it('sums fee, discount (quoted plus negotiated) and man-days, treating a missing figure as 0', () => {
    expect(
      sumQuotationItems([
        { feeAmount: 1000, discount: 100, negotiatedDiscount: 50, estimatedDays: 3 },
        { feeAmount: 500, discount: null, negotiatedDiscount: undefined, estimatedDays: null },
        {},
      ]),
    ).toEqual({ totalFeeAmount: 1500, totalDiscount: 150, totalEstimateManday: 3 });
  });

  it('sums an empty list to zero (whether to show it is the caller’s call)', () => {
    expect(sumQuotationItems([])).toEqual({
      totalFeeAmount: 0,
      totalDiscount: 0,
      totalEstimateManday: 0,
    });
  });
});
