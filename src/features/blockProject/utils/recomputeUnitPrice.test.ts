import { describe, expect, it } from 'vitest';
import type { ProjectUnitPrice } from '../types';
import {
  applyLocationMethod,
  buildDisplayedUnitPrices,
  condoLocationContribution,
  differsFromStored,
  lbLocationContribution,
  locationContribution,
  type ModelPricing,
} from './recomputeUnitPrice';

const unit = (over: Partial<ProjectUnitPrice> = {}): ProjectUnitPrice => ({
  projectUnitId: 'u1',
  sequenceNumber: 1,
  projectModelId: 'm1',
  usableArea: 30.5,
  isSold: false,
  isCorner: false,
  isEdge: false,
  isOther: false,
  isPoolView: false,
  isSouth: false,
  isNearGarden: false,
  // A patched / imported row: its stored values differ from what the model would give.
  standardPrice: 99_000,
  totalAppraisalValue: 3_000_000,
  totalAppraisalValueRounded: 3_000_000,
  forceSellingPrice: 2_400_000,
  coverageAmount: 458_000, // per-unit TOTAL, as the API stores it
  ...over,
});

const models = new Map<string, ModelPricing>([
  ['m1', { standardPrice: 85_000, coverageAmount: 15_000 }],
]);

describe('buildDisplayedUnitPrices', () => {
  it('always recomputes from the model, with coverage as a rounded per-unit total', () => {
    const [row] = buildDisplayedUnitPrices([unit()], { forceSalePercentage: 80 }, 'U', models);
    expect(row.standardPrice).toBe(85_000);
    // 85,000 x 30.5 = 2,592,500
    expect(row.totalAppraisalValueRounded).toBe(2_592_500);
    // 15,000 x 30.5 = 457,500 -> nearest 1,000 = 458,000 (mirrors Project.cs)
    expect(row.coverageAmount).toBe(458_000);
    expect(row.forceSellingPrice).toBe(2_074_000);
  });

  it('a 0% forced-sale rate gives a forced sale price of 0, not "none"', () => {
    const [row] = buildDisplayedUnitPrices([unit()], { forceSalePercentage: 0 }, 'U', models);
    expect(row.forceSellingPrice).toBe(0);
  });

  it('has no forced sale price without a percentage (the caller passes the effective one)', () => {
    const [row] = buildDisplayedUnitPrices([unit()], {}, 'U', models);
    expect(row.forceSellingPrice).toBeUndefined();
  });

  it('a unit worth 0 has a forced sale of 0 even when no percentage is known', () => {
    // No models at all (no saved assumption): every unit prices at 0, and so does its forced sale.
    const [row] = buildDisplayedUnitPrices([unit()], {}, 'U', new Map());
    expect(row.totalAppraisalValueRounded).toBe(0);
    expect(row.forceSellingPrice).toBe(0);
  });

  it('mirrors the backend for a unit whose model is not in the lookup: price 0, no coverage', () => {
    const [row] = buildDisplayedUnitPrices([unit({ projectModelId: 'gone' })], {}, 'U', models);
    expect(row.standardPrice).toBe(0);
    expect(row.totalAppraisalValueRounded).toBe(0);
    expect(row.coverageAmount).toBeUndefined();
  });

  it('Condo: no rate or no area gives 0 coverage (Project.cs: (rate * area) ?? 0)', () => {
    const noRate = new Map<string, ModelPricing>([
      ['m1', { standardPrice: 85_000, coverageAmount: null }],
    ]);
    expect(buildDisplayedUnitPrices([unit()], {}, 'U', noRate)[0].coverageAmount).toBe(0);
    const noArea = unit({ usableArea: undefined });
    expect(buildDisplayedUnitPrices([noArea], {}, 'U', models)[0].coverageAmount).toBe(0);
  });

  it('LB: no rate gives no coverage, no area counts as 0', () => {
    const lb = (over: Partial<ProjectUnitPrice> = {}) => unit({ landArea: 50, ...over });
    const noRate = new Map<string, ModelPricing>([
      ['m1', { standardPrice: 4_850_000, coverageAmount: null }],
    ]);
    expect(buildDisplayedUnitPrices([lb()], {}, 'LB', noRate)[0].coverageAmount).toBeUndefined();
    const withRate = new Map<string, ModelPricing>([
      ['m1', { standardPrice: 4_850_000, coverageAmount: 9_000 }],
    ]);
    expect(
      buildDisplayedUnitPrices([lb({ usableArea: undefined })], {}, 'LB', withRate)[0]
        .coverageAmount,
    ).toBe(0);
    // 9,000 x 160 = 1,440,000
    expect(
      buildDisplayedUnitPrices([lb({ usableArea: 160 })], {}, 'LB', withRate)[0].coverageAmount,
    ).toBe(1_440_000);
  });

  it('LB land +/- mirrors Project.cs: (land - standard land) x rate, no fallback to the stored amount', () => {
    const lookup = new Map<string, ModelPricing>([
      ['m1', { standardPrice: 4_850_000, coverageAmount: 9_000, standardLandArea: 50 }],
    ]);
    const lb = unit({ landArea: 52, landIncreaseDecreaseAmount: 123 });
    const [row] = buildDisplayedUnitPrices([lb], { landIncreaseDecreaseRate: 1_000 }, 'LB', lookup);
    expect(row.landAreaDifference).toBe(2);
    expect(row.landIncreaseDecreaseAmount).toBe(2_000);

    // No rate: 0, not the stored 123. No land area counts as 0.
    const [noRate] = buildDisplayedUnitPrices([lb], {}, 'LB', lookup);
    expect(noRate.landIncreaseDecreaseAmount).toBe(0);
    const [noLand] = buildDisplayedUnitPrices(
      [unit({ landArea: undefined })],
      { landIncreaseDecreaseRate: 1_000 },
      'LB',
      lookup,
    );
    expect(noLand.landAreaDifference).toBe(-50);
  });

  it('Condo floor increment mirrors C# integer division, with no floor > 0 guard', () => {
    const rule = { floorIncrementEveryXFloor: 5, floorIncrementAmount: 10_000 };
    const at = (floor: number | undefined) =>
      buildDisplayedUnitPrices([unit({ floor })], rule, 'U', models)[0].priceIncrementPerFloor;
    expect(at(1)).toBe(0);
    expect(at(5)).toBe(0); // trunc(4 / 5)
    expect(at(6)).toBe(10_000); // trunc(5 / 5)
    // trunc(-1 / 5) = 0 toward zero: a real +0, not -0 (which would render as "-0.00")
    expect(Object.is(at(0), 0)).toBe(true);
    expect(at(-9)).toBe(-20_000); // trunc(-10 / 5) = -2
    expect(at(undefined)).toBe(0);
  });

  it('rounds like C# decimal maths despite float noise (50,250 x 20.15 -> 1,012,538)', () => {
    const lookup = new Map<string, ModelPricing>([['m1', { standardPrice: 50_250 }]]);
    const [row] = buildDisplayedUnitPrices([unit({ usableArea: 20.15 })], {}, 'U', lookup);
    expect(row.totalAppraisalValueRounded).toBe(1_012_538);
  });

  it('LB land 50.05 vs 50.00 at 100,000/sq.wa on a 3,000,000 model -> 3,010,000', () => {
    const lookup = new Map<string, ModelPricing>([
      ['m1', { standardPrice: 3_000_000, standardLandArea: 50 }],
    ]);
    const [row] = buildDisplayedUnitPrices(
      [unit({ landArea: 50.05 })],
      { landIncreaseDecreaseRate: 100_000 },
      'LB',
      lookup,
    );
    expect(row.landIncreaseDecreaseAmount).toBe(5_000);
    expect(row.totalAppraisalValueRounded).toBe(3_010_000);
  });

  it('forced sale: 1,500,000 x 70.1% -> 1,052,000', () => {
    const lookup = new Map<string, ModelPricing>([['m1', { standardPrice: 1_500_000 }]]);
    const [row] = buildDisplayedUnitPrices(
      [unit({ usableArea: 1 })],
      { forceSalePercentage: 70.1 },
      'U',
      lookup,
    );
    expect(row.totalAppraisalValueRounded).toBe(1_500_000);
    expect(row.forceSellingPrice).toBe(1_052_000);
  });

  it('LB: a blank land rate gives a +0 land adjustment, never -0 (land 48 vs standard 50)', () => {
    const lookup = new Map<string, ModelPricing>([
      ['m1', { standardPrice: 3_000_000, standardLandArea: 50 }],
    ]);
    const [row] = buildDisplayedUnitPrices([unit({ landArea: 48 })], {}, 'LB', lookup);
    expect(row.landAreaDifference).toBe(-2);
    expect(Object.is(row.landIncreaseDecreaseAmount, 0)).toBe(true);
  });

  describe('L (appraised as land only): no model to read', () => {
    const land = (over: Partial<ProjectUnitPrice> = {}) =>
      unit({ projectModelId: undefined, usableArea: undefined, landArea: 100, ...over });
    const rate = { landIncreaseDecreaseRate: 12_000, forceSalePercentage: 80 };

    it('prices a unit as land area x the land rate, with no standard price and no fire cover', () => {
      const [row] = buildDisplayedUnitPrices([land()], rate, 'L', new Map());
      expect(row.standardPrice).toBe(0);
      expect(row.landAreaDifference).toBe(100);
      expect(row.landIncreaseDecreaseAmount).toBe(1_200_000);
      expect(row.totalAppraisalValue).toBe(1_200_000);
      expect(row.totalAppraisalValueRounded).toBe(1_200_000);
      expect(row.forceSellingPrice).toBe(960_000);
      expect(row.coverageAmount).toBeUndefined();
    });

    it('adds the location amount per Sq.Wa of land, or flat as a lump sum', () => {
      const flagged = land({ isCorner: true });
      const perSqWa = { ...rate, locationMethod: 'AdjustPriceSqm', cornerAdjustment: 5_000 };
      const [row] = buildDisplayedUnitPrices([flagged], perSqWa, 'L', new Map());
      expect(row.adjustPriceLocation).toBe(5_000);
      expect(row.totalAppraisalValueRounded).toBe(1_700_000); // 1,200,000 + 5,000 x 100
      expect(row.forceSellingPrice).toBe(1_360_000);

      const [flat] = buildDisplayedUnitPrices(
        [flagged],
        { ...perSqWa, locationMethod: 'Lumpsum' },
        'L',
        new Map(),
      );
      expect(flat.totalAppraisalValueRounded).toBe(1_210_000); // 1,200,000 + 5,000 -> nearest 10,000
    });

    it('the percentage method adds nothing: there is no standard price to take it of', () => {
      const [row] = buildDisplayedUnitPrices(
        [land({ isCorner: true })],
        { ...rate, locationMethod: 'AdjustPricePercentage', cornerAdjustment: 5 },
        'L',
        new Map(),
      );
      expect(row.totalAppraisalValueRounded).toBe(1_200_000);
    });

    it('a blank rate or no land area prices at 0 (never NaN or -0)', () => {
      const [blank] = buildDisplayedUnitPrices([land()], {}, 'L', new Map());
      expect(blank.totalAppraisalValueRounded).toBe(0);
      expect(Object.is(blank.landIncreaseDecreaseAmount, 0)).toBe(true);
      expect(blank.forceSellingPrice).toBe(0);
      const noLandUnit = land({ landArea: undefined });
      const [noLand] = buildDisplayedUnitPrices([noLandUnit], rate, 'L', new Map());
      expect(noLand.totalAppraisalValueRounded).toBe(0);
    });
  });

  it('leaves sold units in the list', () => {
    const rows = buildDisplayedUnitPrices([unit({ isSold: true })], {}, 'U', models);
    expect(rows).toHaveLength(1);
    expect(rows[0].isSold).toBe(true);
  });
});

describe('location contribution (the hint beside the raw flag total)', () => {
  it('per sq.m.: raw x area (200 x 47.5 = 9,500)', () => {
    expect(applyLocationMethod(200, 'AdjustPriceSqm', 0, 47.5)).toBe(9_500);
  });

  it('percentage: standard total x raw / 100 (3,000,000 x 2% = 60,000)', () => {
    expect(applyLocationMethod(2, 'AdjustPricePercentage', 3_000_000, 47.5)).toBe(60_000);
  });

  it('lump sum: the raw amount as it is, not multiplied by area', () => {
    expect(applyLocationMethod(200, 'Lumpsum', 3_000_000, 47.5)).toBe(200);
  });

  it('condoLocationContribution takes the unit its standard total (rate x area) and area', () => {
    const row = unit({ usableArea: 47.5, standardPrice: 60_000, adjustPriceLocation: 200 });
    expect(condoLocationContribution(row, 'AdjustPriceSqm')).toBe(9_500);
    expect(condoLocationContribution(row, 'Lumpsum')).toBe(200);
    // standard total 60,000 x 47.5 = 2,850,000; 2% of it
    expect(
      condoLocationContribution({ ...row, adjustPriceLocation: 2 }, 'AdjustPricePercentage'),
    ).toBe(57_000);
    expect(
      condoLocationContribution({ ...row, adjustPriceLocation: undefined }, 'AdjustPriceSqm'),
    ).toBe(0);
  });

  it('lbLocationContribution multiplies by land area and takes the percentage of the standard price as it is', () => {
    const row = unit({
      landArea: 50,
      usableArea: 120,
      standardPrice: 4_850_000,
      adjustPriceLocation: 200,
    });
    expect(lbLocationContribution(row, 'AdjustPriceSqm')).toBe(10_000); // 200 x 50 Sq.Wa
    expect(lbLocationContribution(row, 'Lumpsum')).toBe(200);
    expect(
      lbLocationContribution({ ...row, adjustPriceLocation: 2 }, 'AdjustPricePercentage'),
    ).toBe(
      97_000, // 2% of 4,850,000: not x usable area
    );
    // L: no model, no standard price, so a percentage adds nothing.
    expect(
      lbLocationContribution(
        { ...row, standardPrice: undefined, adjustPriceLocation: 2 },
        'AdjustPricePercentage',
      ),
    ).toBe(0);
  });

  it('locationContribution follows the type: usable area for condo, land area for LB and L', () => {
    const row = unit({
      landArea: 50,
      usableArea: 47.5,
      standardPrice: 60_000,
      adjustPriceLocation: 200,
    });
    expect(locationContribution(row, 'AdjustPriceSqm', 'U')).toBe(9_500);
    expect(locationContribution(row, 'AdjustPriceSqm', 'LB')).toBe(10_000);
    expect(locationContribution(row, 'AdjustPriceSqm', 'L')).toBe(10_000);
  });

  it('LB agrees with the recompute: the same contribution lands in the appraisal value', () => {
    const lookup = new Map<string, ModelPricing>([
      ['m1', { standardPrice: 4_850_000, standardLandArea: 50 }],
    ]);
    const [priced] = buildDisplayedUnitPrices(
      [unit({ landArea: 52, isCorner: true })],
      { locationMethod: 'AdjustPriceSqm', cornerAdjustment: 200, landIncreaseDecreaseRate: 1_000 },
      'LB',
      lookup,
    );
    // 4,850,000 + (52 - 50) x 1,000 + 200 x 52
    expect(priced.totalAppraisalValue).toBe(
      4_850_000 + 2_000 + lbLocationContribution(priced, 'AdjustPriceSqm'),
    );
    expect(lbLocationContribution(priced, 'AdjustPriceSqm')).toBe(10_400);
  });

  it('agrees with the recompute: the same contribution lands in the appraisal value', () => {
    const [priced] = buildDisplayedUnitPrices(
      [unit({ usableArea: 47.5, isCorner: true })],
      { locationMethod: 'AdjustPriceSqm', cornerAdjustment: 200 },
      'U',
      models,
    );
    // 85,000 x 47.5 = 4,037,500 + 9,500
    expect(priced.adjustPriceLocation).toBe(200);
    expect(priced.totalAppraisalValue).toBe(
      4_037_500 + condoLocationContribution(priced, 'AdjustPriceSqm'),
    );
  });
});

describe('differsFromStored', () => {
  it('Condo: 45,250.50 x 30.25 = 1,368,827.625 stored as 1,368,827.63 is the same figure', () => {
    const lookup = new Map<string, ModelPricing>([['m1', { standardPrice: 45_250.5 }]]);
    const displayed = buildDisplayedUnitPrices([unit({ usableArea: 30.25 })], {}, 'U', lookup);
    expect(displayed[0].totalAppraisalValue).toBe(1_368_827.625);

    const stored = displayed.map(r => ({ ...r, totalAppraisalValue: 1_368_827.63 }));
    expect(differsFromStored(displayed, stored)).toBe(false);
    const staleByACent = displayed.map(r => ({ ...r, totalAppraisalValue: 1_368_827.64 }));
    expect(differsFromStored(displayed, staleByACent)).toBe(true);
  });

  it('accepts either way the database may have dealt with a third decimal (round or truncate)', () => {
    const lookup = new Map<string, ModelPricing>([['m1', { standardPrice: 1_369_326.125 }]]);
    const displayed = buildDisplayedUnitPrices([unit({ usableArea: 1 })], {}, 'U', lookup);
    expect(displayed[0].totalAppraisalValue).toBe(1_369_326.125);
    // The model price carries the same third decimal, so it is stored at two decimals as well.
    const storedAs = (value: number) =>
      displayed.map(r => ({ ...r, standardPrice: value, totalAppraisalValue: value }));

    expect(differsFromStored(displayed, storedAs(1_369_326.12))).toBe(false); // truncated
    expect(differsFromStored(displayed, storedAs(1_369_326.13))).toBe(false); // rounded
    expect(differsFromStored(displayed, storedAs(1_369_326.11))).toBe(true); // neither
  });

  it('LB: 2.5 sq.wa x 1,234.55 = 3,086.375 stored as 3,086.38 is the same figure', () => {
    const lookup = new Map<string, ModelPricing>([['m1', { standardPrice: 3_000_000 }]]);
    const displayed = buildDisplayedUnitPrices(
      [unit({ landArea: 2.5 })],
      { landIncreaseDecreaseRate: 1_234.55 },
      'LB',
      lookup,
    );
    expect(displayed[0].landIncreaseDecreaseAmount).toBe(3_086.375);

    // The total carries the same half-cent (3,003,086.375), so it is stored at two decimals too.
    const stored = displayed.map(r => ({
      ...r,
      landIncreaseDecreaseAmount: 3_086.38,
      totalAppraisalValue: 3_003_086.38,
    }));
    expect(differsFromStored(displayed, stored)).toBe(false);
  });

  it('counts null against a value as a difference, and every calculated field', () => {
    const lookup = new Map<string, ModelPricing>([['m1', { standardPrice: 85_000 }]]);
    const displayed = buildDisplayedUnitPrices([unit()], { forceSalePercentage: 80 }, 'U', lookup);
    expect(differsFromStored(displayed, displayed)).toBe(false);
    expect(differsFromStored(displayed, [{ ...displayed[0], forceSellingPrice: undefined }])).toBe(
      true,
    );
    expect(differsFromStored(displayed, [{ ...displayed[0], standardPrice: 99_000 }])).toBe(true);
  });
});
