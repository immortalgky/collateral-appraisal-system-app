import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildFormSchema } from '@/shared/components/form';
import { extractConditionFields } from '@/shared/components/form/conditions';
import { buildingTypeField } from '../configs/fields';
import {
  isDevelopmentOnlyBuilding,
  requiredUnlessDevelopmentOnly,
} from './developmentOnlyBuilding';

describe('isDevelopmentOnlyBuilding', () => {
  it('is false with no rows', () => {
    expect(isDevelopmentOnlyBuilding(undefined)).toBe(false);
    expect(isDevelopmentOnlyBuilding(null)).toBe(false);
    expect(isDevelopmentOnlyBuilding([])).toBe(false);
  });

  it('is true when every row is non-building', () => {
    expect(isDevelopmentOnlyBuilding([{ isBuilding: false }, { isBuilding: false }])).toBe(true);
  });

  it('is false as soon as one row is a building, or the flag is unset', () => {
    expect(isDevelopmentOnlyBuilding([{ isBuilding: false }, { isBuilding: true }])).toBe(false);
    expect(isDevelopmentOnlyBuilding([{ isBuilding: false }, { isBuilding: null }])).toBe(false);
    expect(isDevelopmentOnlyBuilding([{}])).toBe(false);
  });
});

describe('requiredUnlessDevelopmentOnly', () => {
  it('reads depreciationDetails, and says so for the live watch', () => {
    expect(requiredUnlessDevelopmentOnly.deps).toEqual(['depreciationDetails']);
    expect(requiredUnlessDevelopmentOnly({ depreciationDetails: [{ isBuilding: false }] })).toBe(
      false,
    );
    expect(requiredUnlessDevelopmentOnly({ depreciationDetails: [] })).toBe(true);
    expect(requiredUnlessDevelopmentOnly({})).toBe(true);
  });
});

describe('numberOfFloors field config', () => {
  const field = buildingTypeField.find(f => f.name === 'numberOfFloors')!;
  // The real schemas declare depreciationDetails in their base, which is what keeps it in the data
  // the refinement reads (zod would strip an undeclared key).
  const schema = buildFormSchema(
    [field],
    z.object({
      depreciationDetails: z.array(z.object({ isBuilding: z.boolean().nullable() })).optional(),
    }),
  );
  const fails = (data: Record<string, unknown>) => !schema.safeParse(data).success;

  it('re-evaluates live from the depreciation rows', () => {
    expect(extractConditionFields(field.requiredWhen, '')).toEqual(['depreciationDetails']);
  });

  it('stays required with no rows or any building row', () => {
    expect(fails({ numberOfFloors: null })).toBe(true);
    expect(fails({ numberOfFloors: null, depreciationDetails: [] })).toBe(true);
    expect(
      fails({
        numberOfFloors: null,
        depreciationDetails: [{ isBuilding: false }, { isBuilding: true }],
      }),
    ).toBe(true);
  });

  it('is optional when every row is non-building, and still accepts a value', () => {
    expect(fails({ numberOfFloors: null, depreciationDetails: [{ isBuilding: false }] })).toBe(
      false,
    );
    expect(fails({ numberOfFloors: 2, depreciationDetails: [{ isBuilding: false }] })).toBe(false);
  });
});
