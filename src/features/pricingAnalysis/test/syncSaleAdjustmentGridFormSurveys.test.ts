import { describe, expect, it, vi } from 'vitest';
import { syncSaleAdjustmentGridFormSurveys } from '@/features/pricingAnalysis/adapters/syncSaleAdjustmentGridFormSurveys';
import type { MarketComparableDetailType } from '@features/pricingAnalysis/schemas';

/**
 * Changing the survey selection rebuilds the adjustment rows from scratch and carries the old
 * remarks and percentages across. Rows are matched by position; the pair has to survive the window
 * where `factorCode` is not filled in yet, which is most of the life of a row the user just added:
 * `handleAddRow` seeds the qualitative side `null` and the adjustment side `''`, and picking a
 * factor writes the qualitative side only.
 */

const surveys = [{ id: 'm1' }, { id: 'm2' }] as MarketComparableDetailType[];

type AdjustmentRow = {
  remark: string | null;
  surveys: { adjustPercent: number; adjustAmount: number }[];
};

/** A row the user has typed into: one remark and a percentage on the first survey. */
function filledAdjustment(factorCode: string | null, remark: string): Record<string, unknown> {
  return {
    factorId: '',
    factorCode,
    remark,
    surveys: [
      { marketId: 'm1', adjustPercent: 7, adjustAmount: 70 },
      { marketId: 'm2', adjustPercent: 0, adjustAmount: 0 },
    ],
  };
}

function blankAdjustment(factorCode: string | null): Record<string, unknown> {
  return {
    factorId: '',
    factorCode,
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
  syncSaleAdjustmentGridFormSurveys({
    comparativeSurveys: nextSurveys,
    reset: reset as never,
    getValues: (() => ({
      saleAdjustmentGridQualitatives: qualitatives,
      saleAdjustmentGridCalculations: [],
      saleAdjustmentGridAdjustmentFactors: adjustments,
    })) as never,
  });
  return reset.mock.calls[0][0] as {
    saleAdjustmentGridAdjustmentFactors: AdjustmentRow[];
    saleAdjustmentGridQualitatives: { qualitatives: { qualitativeLevel: string }[] }[];
  };
}

function adjustmentsOf(...args: Parameters<typeof sync>) {
  return sync(...args).saleAdjustmentGridAdjustmentFactors;
}

describe('syncSaleAdjustmentGridFormSurveys', () => {
  it('keeps a row whose factor has not been picked yet', () => {
    // Straight out of handleAddRow: null on the qualitative side, '' on the adjustment side.
    const [row] = adjustmentsOf(
      [qualitative(null)],
      [filledAdjustment('', 'typed before picking')],
    );

    expect(row.remark).toBe('typed before picking');
    expect(row.surveys[0]).toMatchObject({ adjustPercent: 7, adjustAmount: 70 });
  });

  it('keeps a row whose factor was picked after the last sync', () => {
    // Picking a factor writes saleAdjustmentGridQualitatives.N.factorCode and nothing on the
    // adjustment row, so the two disagree until the next rebuild.
    const [row] = adjustmentsOf([qualitative('05')], [filledAdjustment('', 'typed after picking')]);

    expect(row.remark).toBe('typed after picking');
    expect(row.surveys[0]).toMatchObject({ adjustPercent: 7, adjustAmount: 70 });
  });

  it(`does not let one row inherit another row's remark or percentages`, () => {
    // Two rows that share a factorCode of '' — the shape any two freshly added rows have.
    const adjustments = adjustmentsOf(
      [qualitative(null), qualitative('05')],
      [blankAdjustment(''), filledAdjustment('', 'belongs to row 1')],
    );
    // One adjustment row per qualitative row, no more: the submit mapper pairs them by position.
    expect(adjustments).toHaveLength(2);
    const [blank, filled] = adjustments;

    expect(blank.remark).toBeNull();
    expect(blank.surveys[0]).toMatchObject({ adjustPercent: 0, adjustAmount: 0 });
    expect(filled.remark).toBe('belongs to row 1');
    expect(filled.surveys[0]).toMatchObject({ adjustPercent: 7, adjustAmount: 70 });
  });

  it(`keeps each unpicked row's own qualitative levels`, () => {
    const { saleAdjustmentGridQualitatives: rows } = sync(
      [qualitative(null, 'A'), qualitative(null, 'D')],
      [blankAdjustment(''), blankAdjustment('')],
    );

    expect(rows[0].qualitatives.map(q => q.qualitativeLevel)).toEqual(['A', 'A']);
    expect(rows[1].qualitatives.map(q => q.qualitativeLevel)).toEqual(['D', 'D']);
  });

  it(`carries each survey's values by marketId when the selection changes`, () => {
    // m1 is dropped, m2 moves to the first column and m3 is new. Matching by column position
    // instead of marketId would hand m2's column m1's level and percentage.
    const prevQualitative = {
      factorId: '',
      factorCode: '05',
      qualitatives: [
        { marketId: 'm1', qualitativeLevel: 'A' },
        { marketId: 'm2', qualitativeLevel: 'C' },
      ],
    };
    const prevAdjustment = {
      factorId: '',
      remark: null,
      surveys: [
        { marketId: 'm1', adjustPercent: 7, adjustAmount: 70 },
        { marketId: 'm2', adjustPercent: 3, adjustAmount: 30 },
      ],
    };
    const next = [{ id: 'm2' }, { id: 'm3' }] as MarketComparableDetailType[];

    const result = sync([prevQualitative], [prevAdjustment], next);
    const levels = result.saleAdjustmentGridQualitatives[0].qualitatives.map(
      q => q.qualitativeLevel,
    );
    const [adjustment] = result.saleAdjustmentGridAdjustmentFactors;

    expect(levels).toEqual(['C', 'E']);
    expect(adjustment.surveys).toMatchObject([
      { adjustPercent: 3, adjustAmount: 30 },
      { adjustPercent: 0, adjustAmount: 0 },
    ]);
  });
});
