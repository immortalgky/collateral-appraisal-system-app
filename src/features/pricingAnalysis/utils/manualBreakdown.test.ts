import { describe, expect, it } from 'vitest';
import { manualBreakdownRequest, qualifiesForManualBreakdown } from './manualBreakdown';

const m = (over = {}) => ({
  methodType: 'WQS_COST',
  role: 'LandAndBuilding' as const,
  useSystemCalc: false,
  landRatePerSqWa: 1000,
  appraisalValue: 600_000,
  buildingValue: 500_000,
  ...over,
});

describe('qualifiesForManualBreakdown (the rule the board shows by and Save re-checks)', () => {
  const ok = (approach: string, method = m(), ...area: [number | null | undefined] | []) =>
    qualifiesForManualBreakdown(approach, method, area.length ? area[0] : 100);

  it('accepts manual Cost Land and LandAndBuilding, and manual Market Land', () => {
    expect(ok('COSTAPPR')).toBe(true);
    expect(ok('COSTAPPR', m({ role: 'Land' }))).toBe(true);
    expect(ok('MARAPPR', m({ role: 'Land', methodType: 'WQS_MARKET' }))).toBe(true);
  });

  it('rejects a method that has since flipped to System, changed role or left the land methods', () => {
    expect(ok('COSTAPPR', m({ useSystemCalc: true }))).toBe(false);
    expect(ok('COSTAPPR', m({ useSystemCalc: undefined }))).toBe(false);
    expect(ok('COSTAPPR', m({ role: 'Building' }))).toBe(false);
    expect(ok('COSTAPPR', m({ role: null }))).toBe(false);
    expect(ok('COSTAPPR', m({ methodType: 'BC' }))).toBe(false);
    expect(ok('MARAPPR', m({ methodType: 'WQS_MARKET' }))).toBe(false);
  });

  it('lets a rate-clearing breakdown through even with no land, since the server needs none', () => {
    expect(qualifiesForManualBreakdown('COSTAPPR', m(), 0, { clearing: true })).toBe(true);
    expect(
      qualifiesForManualBreakdown('COSTAPPR', m({ useSystemCalc: true }), 0, { clearing: true }),
    ).toBe(false);
  });

  it('needs land to price by rate: a group land area above zero', () => {
    expect(ok('COSTAPPR', m(), 0)).toBe(false);
    expect(ok('COSTAPPR', m(), null)).toBe(false);
    expect(ok('COSTAPPR', m(), undefined)).toBe(false);
  });
});

describe('manualBreakdownRequest', () => {
  it('attaches buildingValue only for Cost LandAndBuilding, empty counting as 0', () => {
    expect(manualBreakdownRequest('COSTAPPR', m())).toEqual({
      landRatePerSqWa: 1000,
      indicatedValue: 600_000,
      buildingValue: 500_000,
    });
    expect(manualBreakdownRequest('COSTAPPR', m({ buildingValue: null })).buildingValue).toBe(0);
    expect(manualBreakdownRequest('COSTAPPR', m({ role: 'Land' }))).not.toHaveProperty(
      'buildingValue',
    );
    expect(manualBreakdownRequest('MARAPPR', m())).not.toHaveProperty('buildingValue');
  });
});
