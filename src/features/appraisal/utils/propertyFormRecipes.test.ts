import { describe, expect, it } from 'vitest';
import {
  condoToPayload,
  landToPayload,
  leaseBuildingToPayload,
  leaseCondoToPayload,
  PROPERTY_FORM_RECIPES,
} from './propertyFormRecipes';

describe('payloads', () => {
  it('sends a land page the values as they are, lease and rental included', () => {
    const values = { ownerName: 'A', isRentedOut: false, leaseAgreement: null, rentalInfo: null };
    expect(landToPayload(values)).toEqual(values);
  });

  it('keeps the lease and rental blocks on top of the mapped building payload', () => {
    const payload = leaseBuildingToPayload({
      surfaces: [],
      depreciationDetails: [],
      isUnderConstruction: false,
      leaseAgreement: { lessor: 'X' },
      rentalInfo: { numberOfYears: 3 },
    });
    expect(payload).toMatchObject({
      leaseAgreement: { lessor: 'X' },
      rentalInfo: { numberOfYears: 3 },
      constructionInspection: null,
    });
  });

  it('never sends the derived insurance price from a condo, but the lease condo page does', () => {
    const values = { propertyName: 'U', buildingInsurancePrice: 100, isUnderConstruction: false };
    const lease = { ...values, leaseAgreement: null, rentalInfo: null };
    expect(condoToPayload(values)).not.toHaveProperty('buildingInsurancePrice');
    expect(leaseCondoToPayload(lease)).toMatchObject({ buildingInsurancePrice: 100 });
  });
});

describe('PROPERTY_FORM_RECIPES', () => {
  it('has a recipe for every property type that has a page', () => {
    expect(Object.keys(PROPERTY_FORM_RECIPES).sort()).toEqual(
      ['B', 'L', 'LB', 'LS', 'LSB', 'LSL', 'LSU', 'MAC', 'U'].sort(),
    );
  });

  it('gives each a schema, a record mapper and a payload mapper', () => {
    for (const recipe of Object.values(PROPERTY_FORM_RECIPES)) {
      expect(recipe.schema).toBeDefined();
      expect(typeof recipe.toForm).toBe('function');
      expect(typeof recipe.toPayload).toBe('function');
    }
  });
});
