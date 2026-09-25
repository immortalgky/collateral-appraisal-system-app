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
 *
 * Every cell gets a value no other cell has, and the whole payload is compared at once, so a
 * mapper that pairs the wrong row, the wrong market, or drops a field fails here — including by
 * emitting fewer entries, which a per-group `.every()` would have waved through.
 */

const markets = ['m1', 'm2'];

/** row -> market -> [qualitative level, adjust %]. Amounts are % × 10. */
const cells: Record<number, Record<string, [string, number]>> = {
  0: { m1: ['A', 1], m2: ['C', 3] },
  1: { m1: ['B', 2], m2: ['D', 4] },
};

function form(prefix: 'saleAdjustmentGrid' | 'directComparison') {
  return {
    [`${prefix}Qualitatives`]: [0, 1].map(row => ({
      factorId: '',
      factorCode: `0${row + 1}`,
      qualitatives: markets.map(m => ({ marketId: m, qualitativeLevel: cells[row][m][0] })),
    })),
    [`${prefix}AdjustmentFactors`]: [0, 1].map(row => ({
      factorId: '',
      factorCode: `0${row + 1}`,
      remark: `row ${row}`,
      surveys: markets.map(m => ({
        marketId: m,
        adjustPercent: cells[row][m][1],
        adjustAmount: cells[row][m][1] * 10,
      })),
    })),
  };
}

const expected = [0, 1].flatMap(row =>
  markets.map(m => ({
    row,
    market: m,
    level: cells[row][m][0],
    pct: cells[row][m][1],
    amt: cells[row][m][1] * 10,
    remark: `row ${row}`,
  })),
);

type FactorScore = {
  displaySequence: number;
  marketComparableId: string | null;
  comparisonResult: string | null;
  adjustmentPct: number | null;
  adjustmentAmt: number | null;
  remarks: string | null;
};

function project(factorScores: FactorScore[]) {
  return factorScores
    .map(f => ({
      row: f.displaySequence,
      market: f.marketComparableId,
      level: f.comparisonResult,
      pct: f.adjustmentPct,
      amt: f.adjustmentAmt,
      remark: f.remarks,
    }))
    .sort((a, b) => a.row - b.row || String(a.market).localeCompare(String(b.market)));
}

describe('submit mappers pair factor rows by position', () => {
  it(`saves each row's own adjustments when no factorId has resolved (sale adjustment grid)`, () => {
    const { factorScores } = mapSaleAdjustmentGridFormToSubmitSchema({
      SaleAdjustmentGridForm: form('saleAdjustmentGrid') as never,
    });

    expect(project(factorScores as FactorScore[])).toEqual(expected);
  });

  it(`saves each row's own adjustments when no factorId has resolved (direct comparison)`, () => {
    const { factorScores } = mapDirectComparisonFormToSubmitSchema({
      DirectComparisonForm: form('directComparison') as never,
    });

    expect(project(factorScores as FactorScore[])).toEqual(expected);
  });
});
