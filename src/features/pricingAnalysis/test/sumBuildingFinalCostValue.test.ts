import { describe, it, expect } from 'vitest';
import {
  buildingFinalCostValue,
  sumBuildingFinalCostValue,
} from '@/features/pricingAnalysis/domain/calculation';

/** A schedule row as the Building Cost table computes it: an area and its depreciated value. */
const row = (area: number, priceAfterDepreciation: number) => ({ area, priceAfterDepreciation });

/** A building carrying one schedule row with a stored after-depreciation figure. */
const building = (priceAfterDepreciation: number, finalCostValueOverride?: number | null) => ({
  ...(finalCostValueOverride === undefined ? {} : { finalCostValueOverride }),
  depreciationDetails: [{ priceAfterDepreciation }],
});

describe('sumBuildingFinalCostValue', () => {
  it('rounds each building to the nearest 1,000', () => {
    expect(sumBuildingFinalCostValue([building(1_234_567.89)])).toBe(1_235_000);
  });

  it('rounds PER BUILDING, not once on the group total', () => {
    // The whole point of the figure: two buildings at 1,400 each round to 1,000 apiece
    // (2,000), where rounding their 2,800 sum once would give 3,000. Summing raw and
    // rounding at the end is the bug this helper replaced.
    expect(sumBuildingFinalCostValue([building(1_400), building(1_400)])).toBe(2_000);
  });

  it('takes the keyed Final Cost Value over the schedule, unrounded', () => {
    // An override is the appraiser's own figure — it is stored as typed and must not be
    // put through the thousand-rounding that only applies to a derived schedule total.
    expect(sumBuildingFinalCostValue([building(9_999_999, 1_234_567.89)])).toBe(1_234_567.89);
  });

  it('treats an override of 0 as a decision, not as absent', () => {
    // Matches COALESCE on the SQL side: only NULL falls through to the schedule.
    expect(sumBuildingFinalCostValue([building(5_000_000, 0)])).toBe(0);
  });

  it('falls back to area x rate - depreciation when no figure is stored on the row', () => {
    const noStoredFigure = [
      {
        depreciationDetails: [
          {
            area: 100,
            pricePerSqMBeforeDepreciation: 20_000,
            depreciationPeriods: [{ priceDepreciation: 300_000 }, { priceDepreciation: 200_000 }],
          },
        ],
      },
    ];
    // 100 * 20,000 = 2,000,000 less 500,000 of depreciation = 1,500,000.
    expect(sumBuildingFinalCostValue(noStoredFigure)).toBe(1_500_000);
  });

  it('is the sum of the per-building rule, which callers can reach directly', () => {
    // Profit Rent's collapsible needs one building's figure, not the group's. Both come
    // from the same rule, so a per-building row and the group total cannot disagree.
    const buildings = [building(1_400), building(1_234_567.89, 900_000)];
    expect(buildings.map(buildingFinalCostValue)).toEqual([1_000, 900_000]);
    expect(sumBuildingFinalCostValue(buildings)).toBe(901_000);
  });

  it('is what the Building Cost grand-total row must show, not the raw schedule sum', () => {
    // The reported case: two identical buildings of 80 sq.m, 7,920,000 each after depreciation,
    // each with a keyed Final Cost Value — 8,000,000 and 6,000,000. The table footer summed the
    // schedule rows and printed 15,840,000 while the KPI card above it printed this figure under
    // the same label.
    const group = [
      { finalCostValueOverride: 8_000_000, depreciationDetails: [row(80, 7_920_000)] },
      { finalCostValueOverride: 6_000_000, depreciationDetails: [row(80, 7_920_000)] },
    ];
    expect(sumBuildingFinalCostValue(group)).toBe(14_000_000);

    // The footer's บาท/ตร.ม. cell restates the cell above it, so it divides the SAME total by the
    // same area the footer sums — reproduced here rather than hard-coding 160, so that changing
    // either side of the component's arithmetic breaks this. 14,000,000 / 160 = 87,500; the raw
    // schedule sum gave 99,000, which multiplied back to neither figure on the row.
    const footerArea = group
      .flatMap(b => b.depreciationDetails)
      .reduce((acc, r) => acc + r.area, 0);
    expect(footerArea).toBe(160);
    expect(Math.round(sumBuildingFinalCostValue(group) / footerArea)).toBe(87_500);
  });

  it('returns 0 for a group with no buildings at all', () => {
    expect(sumBuildingFinalCostValue([])).toBe(0);
    expect(sumBuildingFinalCostValue(undefined)).toBe(0);
    expect(sumBuildingFinalCostValue([{}])).toBe(0);
  });
});
