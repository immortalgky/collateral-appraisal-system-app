import { describe, expect, it } from 'vitest';
import {
  buildingInsuranceFigures,
  derivedBuildingCostValue,
  derivedBuildingInsurance,
  enteredBuildingCostValue,
  enteredBuildingInsurance,
  withStoredBuildingValues,
} from './buildingStoredValues';

const rows = [
  { isBuilding: true, priceAfterDepreciation: 250_400 },
  { isBuilding: true, priceAfterDepreciation: 100_000 },
  { isBuilding: false, priceAfterDepreciation: 999_999 },
];

describe('derivedBuildingInsurance', () => {
  it('rounds the IsBuilding rows to the nearest 1,000 and ignores the rest', () => {
    expect(derivedBuildingInsurance(rows)).toBe(350_000);
  });

  it('rounds a sum that is exactly a half-thousand up, as the server does', () => {
    // 283,499.99999999994 in float addition; 283,500.00 in the server's decimal sum.
    const halfway = [55_506.25, 223_214.21, 4_779.54].map(price => ({
      isBuilding: true,
      priceAfterDepreciation: price,
    }));
    expect(derivedBuildingInsurance(halfway)).toBe(284_000);
  });

  it('takes each row at the 2 decimals the server stores before summing', () => {
    // Live form rows can carry more decimals (area × rate × pct); the server stores 141,750.00 each.
    const unrounded = [141_749.996, 141_749.996].map(price => ({
      isBuilding: true,
      priceAfterDepreciation: price,
    }));
    expect(derivedBuildingInsurance(unrounded)).toBe(284_000);
  });

  it('rounds a negative midpoint away from zero, as the server does', () => {
    expect(derivedBuildingInsurance([{ isBuilding: true, priceAfterDepreciation: -283_500 }])).toBe(
      -284_000,
    );
  });

  it('reads formatted amounts', () => {
    expect(
      derivedBuildingInsurance([{ isBuilding: true, priceAfterDepreciation: '141,750.00' }]),
    ).toBe(142_000);
  });

  it('shows the subtotal it rounded, each row at 2 dp', () => {
    const unrounded = [141_749.996, 141_749.996].map(price => ({
      isBuilding: true,
      priceAfterDepreciation: price,
    }));
    expect(buildingInsuranceFigures(unrounded)).toEqual({ subtotal: 283_500, insurance: 284_000 });
  });

  it('is null without building rows', () => {
    expect(derivedBuildingInsurance([{ isBuilding: false, priceAfterDepreciation: 1 }])).toBeNull();
    expect(derivedBuildingInsurance(undefined)).toBeNull();
  });
});

describe('enteredBuildingInsurance', () => {
  it('loads a stored figure equal to the derived one as not entered, so it follows the table', () => {
    expect(enteredBuildingInsurance(350_000, rows)).toBeNull();
  });

  it('keeps a figure the appraiser typed', () => {
    expect(enteredBuildingInsurance(400_000, rows)).toBe(400_000);
  });

  it('keeps a stored figure when there are no building rows to derive one from', () => {
    expect(enteredBuildingInsurance(400_000, [])).toBe(400_000);
  });

  it('nothing stored is not entered', () => {
    expect(enteredBuildingInsurance(null, rows)).toBeNull();
    expect(enteredBuildingInsurance(undefined, undefined)).toBeNull();
  });
});

describe('derived / entered Building Cost Value', () => {
  it('rounds every row (not only building rows) by the server rule', () => {
    // 250,400 + 100,000 + 999,999 = 1,350,399 → 1,350,000
    expect(derivedBuildingCostValue(rows)).toBe(1_350_000);
    expect(derivedBuildingCostValue([])).toBeNull();
  });

  it('loads a stored figure equal to the derived one as not entered, and keeps a typed one', () => {
    expect(enteredBuildingCostValue(1_350_000, rows)).toBeNull();
    expect(enteredBuildingCostValue(1_500_000, rows)).toBe(1_500_000);
    expect(enteredBuildingCostValue(null, rows)).toBeNull();
  });
});

describe('withStoredBuildingValues', () => {
  it('shows untyped figures as the ones the server will store', () => {
    expect(
      withStoredBuildingValues({
        buildingCostValue: null,
        buildingInsurancePrice: null,
        depreciationDetails: rows,
      }),
    ).toMatchObject({ buildingCostValue: 1_350_000, buildingInsurancePrice: 350_000 });
  });

  it('leaves typed figures and non-building forms alone', () => {
    const typed = {
      buildingCostValue: 2_000_000,
      buildingInsurancePrice: 400_000,
      depreciationDetails: rows,
    };
    expect(withStoredBuildingValues(typed)).toEqual(typed);
    const condo = { buildingInsurancePrice: null, usableArea: 30 };
    expect(withStoredBuildingValues(condo)).toBe(condo);
  });
});
