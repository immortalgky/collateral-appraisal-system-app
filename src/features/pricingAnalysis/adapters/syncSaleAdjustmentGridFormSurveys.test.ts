import { describe, expect, it, vi } from 'vitest';
import { syncSaleAdjustmentGridFormSurveys } from './syncSaleAdjustmentGridFormSurveys';
import type { MarketComparableDetailType } from '@features/pricingAnalysis/schemas';

/**
 * The adjustment rows are rebuilt from scratch on every survey change and carry their old values
 * across a `factorCode -> marketId` map. `handleAddRow` seeds a new row with `factorCode: null`, so
 * both sides of that map have to fold null the same way — put a fallback on only one of them and an
 * unpicked row loses its remark and every adjustment back to zero on the next sync, silently.
 */

const surveys = [{ id: 'm1' }, { id: 'm2' }] as MarketComparableDetailType[];

function syncOnce(form: Record<string, unknown>) {
  const reset = vi.fn();
  syncSaleAdjustmentGridFormSurveys({
    comparativeSurveys: surveys,
    reset: reset as never,
    getValues: (() => form) as never,
  });
  return reset.mock.calls[0][0] as {
    saleAdjustmentGridAdjustmentFactors: {
      remark: string | null;
      surveys: { adjustPercent: number; adjustAmount: number }[];
    }[];
  };
}

describe('syncSaleAdjustmentGridFormSurveys', () => {
  it('keeps a row that has no factor picked yet from losing its remark and adjustments', () => {
    const form = {
      saleAdjustmentGridQualitatives: [
        {
          factorId: '',
          factorCode: null,
          qualitatives: surveys.map(s => ({ marketId: s.id, qualitativeLevel: 'E' })),
        },
      ],
      saleAdjustmentGridCalculations: [],
      saleAdjustmentGridAdjustmentFactors: [
        {
          factorId: '',
          factorCode: null,
          remark: 'typed before picking a factor',
          surveys: [
            { marketId: 'm1', adjustPercent: 5, adjustAmount: 50 },
            { marketId: 'm2', adjustPercent: 0, adjustAmount: 0 },
          ],
        },
      ],
    };

    const row = syncOnce(form).saleAdjustmentGridAdjustmentFactors[0];

    expect(row.remark).toBe('typed before picking a factor');
    expect(row.surveys[0]).toMatchObject({ adjustPercent: 5, adjustAmount: 50 });
  });
});
