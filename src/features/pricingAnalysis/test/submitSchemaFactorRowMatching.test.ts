import { describe, expect, it } from 'vitest';
import { mapSaleAdjustmentGridFormToSubmitSchema } from '@/features/pricingAnalysis/domain/mapSaleAdjustmentGridFormToSubmitSchema';
import { mapDirectComparisonFormToSubmitSchema } from '@/features/pricingAnalysis/domain/mapDirectComparisonFormToSubmitSchema';

/**
 * Both submit mappers pair a qualitative row with its adjustment row. They used to do it through a
 * factorId map, and `factorId` is `''` whenever a factor has not resolved — handleAddRow leaves it
 * unset, and initialize falls back to `''` when the factor lookup misses. Two such rows collapsed
 * onto one entry and the survivor's percentages and remark were saved against both.
 *
 * Unlike the factorCode collisions, zod cannot catch this one: factorCode is filled in and valid
 * while factorId is empty, so the payload goes to the API.
 */

const surveys = [{ marketId: 'm1' }, { marketId: 'm2' }];

function rows(prefix: 'saleAdjustmentGrid' | 'directComparison') {
  return {
    [`${prefix}Qualitatives`]: [
      {
        factorId: '',
        factorCode: '01',
        qualitatives: surveys.map(s => ({ ...s, qualitativeLevel: 'A' })),
      },
      {
        factorId: '',
        factorCode: '02',
        qualitatives: surveys.map(s => ({ ...s, qualitativeLevel: 'B' })),
      },
    ],
    [`${prefix}AdjustmentFactors`]: [
      {
        factorId: '',
        factorCode: '01',
        remark: 'row 0',
        surveys: surveys.map(s => ({ ...s, adjustPercent: 1, adjustAmount: 10 })),
      },
      {
        factorId: '',
        factorCode: '02',
        remark: 'row 1',
        surveys: surveys.map(s => ({ ...s, adjustPercent: 2, adjustAmount: 20 })),
      },
    ],
  };
}

describe('submit mappers pair factor rows by position', () => {
  it('keeps each row"s adjustments when no factorId has resolved (sale adjustment grid)', () => {
    const { factorScores } = mapSaleAdjustmentGridFormToSubmitSchema({
      SaleAdjustmentGridForm: rows('saleAdjustmentGrid') as never,
    });

    const byRow = [0, 1].map(seq => factorScores.filter(f => f.displaySequence === seq));

    // Assert the rows arrived before asserting anything about them: [].every() is true, so a
    // change to how displaySequence is numbered would empty these groups and pass in silence.
    expect(byRow[0]).toHaveLength(surveys.length);
    expect(byRow[1]).toHaveLength(surveys.length);
    expect(byRow[0].every(f => f.remarks === 'row 0' && f.adjustmentPct === 1)).toBe(true);
    expect(byRow[1].every(f => f.remarks === 'row 1' && f.adjustmentPct === 2)).toBe(true);
  });

  it('keeps each row"s adjustments when no factorId has resolved (direct comparison)', () => {
    const { factorScores } = mapDirectComparisonFormToSubmitSchema({
      DirectComparisonForm: rows('directComparison') as never,
    });

    const byRow = [0, 1].map(seq => factorScores.filter(f => f.displaySequence === seq));

    // Assert the rows arrived before asserting anything about them: [].every() is true, so a
    // change to how displaySequence is numbered would empty these groups and pass in silence.
    expect(byRow[0]).toHaveLength(surveys.length);
    expect(byRow[1]).toHaveLength(surveys.length);
    expect(byRow[0].every(f => f.remarks === 'row 0' && f.adjustmentPct === 1)).toBe(true);
    expect(byRow[1].every(f => f.remarks === 'row 1' && f.adjustmentPct === 2)).toBe(true);
  });
});
