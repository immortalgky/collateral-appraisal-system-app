import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createBuildingForm,
  createBuildingFormBase,
  createCondoForm,
  createLandAndBuildingForm,
  createLandFormBase,
  createLeaseAgreementBuildingForm,
  createLeaseAgreementCondoForm,
  createLeaseAgreementLandAndBuildingForm,
  createProjectLandForm,
} from './form';

/**
 * The property pages submit what zod returns, zod drops every key a schema does not declare, and
 * the update overwrites the whole record. So a value the record holds must be declared even when
 * the page has no input for it, or saving the page wipes it.
 */

/** The object under any superRefine wrappers. */
const shapeOf = (schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> => {
  let inner = schema;
  while (inner instanceof z.ZodEffects) inner = inner.innerType();
  return (inner as z.ZodObject<z.ZodRawShape>).shape;
};

const building = ['buildingInsurancePrice', 'buildingCostValue'];
const condo = ['totalBuildingArea'];

describe('property form schemas keep what the record holds', () => {
  it.each([
    ['building', createBuildingForm, building],
    ['condo', createCondoForm, condo],
    ['land and building', createLandAndBuildingForm, building],
    ['lease building', createLeaseAgreementBuildingForm, building],
    ['lease condo', createLeaseAgreementCondoForm, condo],
    ['lease land and building', createLeaseAgreementLandAndBuildingForm, building],
    ['project land', createProjectLandForm, ['encroachmentArea', 'landOffice']],
  ])('%s', (_name, schema, keys) => {
    expect(Object.keys(shapeOf(schema))).toEqual(expect.arrayContaining(keys));
  });

  it('a title row keeps its id, so the save updates the row instead of re-creating it', () => {
    const parsed = createLandFormBase.parse({
      titles: [{ id: 'title-1', titleNumber: '123', titleType: 'DEED' }],
    });
    expect(parsed.titles?.[0].id).toBe('title-1');
  });

  it('floor and depreciation rows keep their ids, periods included', () => {
    const parsed = createBuildingFormBase.parse({
      surfaces: [{ id: 'surface-1' }],
      depreciationDetails: [{ id: 'dep-1', depreciationPeriods: [{ id: 'period-1' }] }],
    });
    expect(parsed.surfaces?.[0].id).toBe('surface-1');
    expect(parsed.depreciationDetails?.[0].id).toBe('dep-1');
    expect(parsed.depreciationDetails?.[0].depreciationPeriods?.[0].id).toBe('period-1');
  });
});
