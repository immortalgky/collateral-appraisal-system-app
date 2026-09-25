import { describe, expect, it, vi } from 'vitest';
import { syncDirectComparisonFormSurveys } from '@/features/pricingAnalysis/adapters/syncDirectComparisonFormSurveys';
import type { MarketComparableDetailType } from '@features/pricingAnalysis/schemas';

/**
 * The Direct Comparison twin of syncSaleAdjustmentGridFormSurveys, with the same contract: changing
 * the survey selection rebuilds the adjustment rows and carries the old remarks and percentages
 * across, matched by position. Its `handleAddRow` leaves `factorCode` unset on both sides, so every
 * row the user adds shares one value until a factor is picked.
 */

const surveys = [{ id: 'm1' }, { id: 'm2' }] as MarketComparableDetailType[];

type AdjustmentRow = {
  remark: string | null;
  surveys: { adjustPercent: number; adjustAmount: number }[];
};

function filledAdjustment(remark: string): Record<string, unknown> {
  return {
    factorId: '',
    remark,
    surveys: [
      { marketId: 'm1', adjustPercent: 7, adjustAmount: 70 },
      { marketId: 'm2', adjustPercent: 0, adjustAmount: 0 },
    ],
  };
}

function blankAdjustment(): Record<string, unknown> {
  return {
    factorId: '',
    remark: null,
    surveys: surveys.map(s => ({ marketId: s.id, adjustPercent: 0, adjustAmount: 0 })),
  };
}

function qualitative(factorCode: string | null, level = 'E'): Record<string, unknown> {
  return {
    factorId: '',
    factorCode,
    qualitatives: surveys.map(s => ({ marketId: s.id, qualitativeLevel: level })),
  };
}

function sync(qualitatives: Record<string, unknown>[], adjustments: Record<string, unknown>[]) {
  const reset = vi.fn();
  syncDirectComparisonFormSurveys({
    comparativeSurveys: surveys,
    reset: reset as never,
    getValues: (() => ({
      directComparisonQualitatives: qualitatives,
      directComparisonCalculations: [],
      directComparisonAdjustmentFactors: adjustments,
    })) as never,
  });
  return reset.mock.calls[0][0] as {
    directComparisonAdjustmentFactors: AdjustmentRow[];
    directComparisonQualitatives: { qualitatives: { qualitativeLevel: string }[] }[];
  };
}

describe('syncDirectComparisonFormSurveys', () => {
  it('keeps a row whose factor has not been picked yet', () => {
    const [row] = sync(
      [qualitative(null)],
      [filledAdjustment('typed before picking')],
    ).directComparisonAdjustmentFactors;

    expect(row.remark).toBe('typed before picking');
    expect(row.surveys[0]).toMatchObject({ adjustPercent: 7, adjustAmount: 70 });
  });

  it('does not let one row inherit another row"s remark or percentages', () => {
    const [blank, filled] = sync(
      [qualitative(null), qualitative('05')],
      [blankAdjustment(), filledAdjustment('belongs to row 1')],
    ).directComparisonAdjustmentFactors;

    expect(blank.remark).toBeNull();
    expect(blank.surveys[0]).toMatchObject({ adjustPercent: 0, adjustAmount: 0 });
    expect(filled.remark).toBe('belongs to row 1');
    expect(filled.surveys[0]).toMatchObject({ adjustPercent: 7, adjustAmount: 70 });
  });

  it('keeps each unpicked row"s own qualitative levels', () => {
    const { directComparisonQualitatives: rows } = sync(
      [qualitative(null, 'A'), qualitative(null, 'D')],
      [blankAdjustment(), blankAdjustment()],
    );

    expect(rows[0].qualitatives.map(q => q.qualitativeLevel)).toEqual(['A', 'A']);
    expect(rows[1].qualitatives.map(q => q.qualitativeLevel)).toEqual(['D', 'D']);
  });
});
