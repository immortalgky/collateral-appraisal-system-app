import { describe, expect, it } from 'vitest';
import { mapCondoPMAPropertyResponseToForm } from './mappers';

/**
 * The condo PMA draft posts getValues() as-is, without the resolver, so whatever this mapper puts in
 * the form is what reaches the API. The API binds every text field on the request as `string?`, and
 * System.Text.Json refuses a JSON number for a string: a single numeric field turns the whole draft
 * into a 400, and nothing on it is saved.
 */
describe('mapCondoPMAPropertyResponseToForm', () => {
  it('fills an empty floor with a string, not a number', () => {
    const form = mapCondoPMAPropertyResponseToForm({ floorNumber: null } as never);

    expect(form.floorNumber).toBe('');
  });

  it('gives every field the API binds as a string a string, even when the response is empty', () => {
    // Every text field the draft request declares as string? (SaveCondoPMAPropertyDraftRequest).
    const stringFields = [
      'titleNumber',
      'condoRegistrationNumber',
      'roomNumber',
      'floorNumber',
      'buildingNumber',
      'condoName',
      'subDistrict',
      'district',
      'province',
    ] as const;

    const form = mapCondoPMAPropertyResponseToForm({} as never) as Record<string, unknown>;

    for (const field of stringFields)
      expect([field, typeof form[field]]).toEqual([field, 'string']);
  });
});
