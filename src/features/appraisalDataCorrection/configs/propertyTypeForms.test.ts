import { describe, expect, it } from 'vitest';
import { typeToDetailEndpoint } from '@/features/appraisal/utils/propertyTypeConfig';
import { getPropertyTypeForm } from './propertyTypeForms';

describe('getPropertyTypeForm', () => {
  it.each(Object.keys(typeToDetailEndpoint))(
    '%s has a form, and posts to its own detail route',
    code => {
      expect(getPropertyTypeForm(code)?.suffix).toBe(typeToDetailEndpoint[code]);
    },
  );

  it('resolves a type to the same object every time', () => {
    expect(getPropertyTypeForm('LSU')).toBe(getPropertyTypeForm('LSU'));
  });

  it('is undefined for a type it cannot edit', () => {
    expect(getPropertyTypeForm('XX')).toBeUndefined();
  });
});

describe('vehicle and vessel forms', () => {
  it('drop what the PUT does not accept, and map the ownership flag it renames', () => {
    const form = getPropertyTypeForm('VEH')!;
    const values = form.toForm({
      propertyId: 'p1',
      detailId: 'd1',
      verifiableOwner: true,
      vehicleName: 'Truck',
      width: null,
    });

    expect(values).not.toHaveProperty('propertyId');
    expect(values).not.toHaveProperty('verifiableOwner');
    expect(values).toMatchObject({ vehicleName: 'Truck', isOwnerVerified: true, width: null });
  });

  it('sends the flat detail: every member, only members, no reason', () => {
    const form = getPropertyTypeForm('VES')!;
    const payload = form.toPayload({
      vesselName: 'Boat',
      isOwnerVerified: false,
      reason: 'typo',
      stray: 1,
    }) as Record<string, unknown>;

    expect(payload).toMatchObject({ vesselName: 'Boat', isOwnerVerified: false, brand: null });
    expect(payload).not.toHaveProperty('reason');
    expect(payload).not.toHaveProperty('stray');
  });
});
