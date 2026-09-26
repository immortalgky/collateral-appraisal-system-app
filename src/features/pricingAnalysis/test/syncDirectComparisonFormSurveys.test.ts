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

function sync(
  qualitatives: Record<string, unknown>[],
  adjustments: Record<string, unknown>[],
  nextSurveys: MarketComparableDetailType[] = surveys,
) {
  const reset = vi.fn();
  syncDirectComparisonFormSurveys({
    comparativeSurveys: nextSurveys,
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

  it(`does not let one row inherit another row's remark or percentages`, () => {
    const adjustments = sync(
      [qualitative(null), qualitative('05')],
      [blankAdjustment(), filledAdjustment('belongs to row 1')],
    ).directComparisonAdjustmentFactors;
    // One adjustment row per qualitative row, no more: the submit mapper pairs them by position.
    expect(adjustments).toHaveLength(2);
    const [blank, filled] = adjustments;

    expect(blank.remark).toBeNull();
    expect(blank.surveys[0]).toMatchObject({ adjustPercent: 0, adjustAmount: 0 });
    expect(filled.remark).toBe('belongs to row 1');
    expect(filled.surveys[0]).toMatchObject({ adjustPercent: 7, adjustAmount: 70 });
  });

  it(`keeps each unpicked row's own qualitative levels`, () => {
    const { directComparisonQualitatives: rows } = sync(
      [qualitative(null, 'A'), qualitative(null, 'D')],
      [blankAdjustment(), blankAdjustment()],
    );

    expect(rows[0].qualitatives.map(q => q.qualitativeLevel)).toEqual(['A', 'A']);
    expect(rows[1].qualitatives.map(q => q.qualitativeLevel)).toEqual(['D', 'D']);
  });

  it(`carries each survey's values by marketId when the selection changes`, () => {
    // m1 is dropped, m2 moves to the first column and m3 is new. Matching columns by position
    // instead of marketId would hand m2's column m1's level and percentage. The two rows share a
    // factorCode, so pairing rows through it would also show up here, in the same test.
    const prev = [
      { levels: { m1: 'A', m2: 'C' }, pct: { m1: 7, m2: 3 } },
      { levels: { m1: 'B', m2: 'D' }, pct: { m1: 8, m2: 4 } },
    ];
    const qualitatives = prev.map(r => ({
      factorId: '',
      factorCode: '05',
      qualitatives: (['m1', 'm2'] as const).map(m => ({
        marketId: m,
        qualitativeLevel: r.levels[m],
      })),
    }));
    const adjustments = prev.map(r => ({
      factorId: '',
      factorCode: '05',
      remark: null,
      surveys: (['m1', 'm2'] as const).map(m => ({
        marketId: m,
        adjustPercent: r.pct[m],
        adjustAmount: r.pct[m] * 10,
      })),
    }));
    const next = [{ id: 'm2' }, { id: 'm3' }] as MarketComparableDetailType[];

    const result = sync(qualitatives, adjustments, next);
    const rows = result.directComparisonQualitatives as unknown as {
      qualitatives: { marketId: string; qualitativeLevel: string }[];
    }[];
    const adjusted = result.directComparisonAdjustmentFactors as unknown as {
      surveys: { marketId: string; adjustPercent: number; adjustAmount: number }[];
    }[];

    expect(rows.map(r => r.qualitatives)).toEqual([
      [
        { marketId: 'm2', qualitativeLevel: 'C' },
        { marketId: 'm3', qualitativeLevel: 'E' },
      ],
      [
        { marketId: 'm2', qualitativeLevel: 'D' },
        { marketId: 'm3', qualitativeLevel: 'E' },
      ],
    ]);
    expect(adjusted.map(r => r.surveys)).toEqual([
      [
        { marketId: 'm2', adjustPercent: 3, adjustAmount: 30 },
        { marketId: 'm3', adjustPercent: 0, adjustAmount: 0 },
      ],
      [
        { marketId: 'm2', adjustPercent: 4, adjustAmount: 40 },
        { marketId: 'm3', adjustPercent: 0, adjustAmount: 0 },
      ],
    ]);
  });
});
