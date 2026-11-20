import { describe, expect, it } from 'vitest';
import { createCondoFormDefault } from '../schemas/form';
import { mapCondoFormDataToApiPayload, mapCondoPropertyResponseToForm } from './mappers';

const road = {
  roadPassInFrontOfLand: 'ถนนสุขุมวิท',
  transportationAccessType: ['01', '99'],
  transportationAccessTypeOther: 'เรือโดยสาร',
};
const blank = {
  roadPassInFrontOfLand: '',
  transportationAccessType: [],
  transportationAccessTypeOther: '',
};

describe('condo: the road in front and the ways of getting there', () => {
  it('load from the response, and fall back to blank when it has none', () => {
    expect(mapCondoPropertyResponseToForm({ ...road } as never)).toMatchObject(road);
    expect(mapCondoPropertyResponseToForm({} as never)).toMatchObject(blank);
    expect(createCondoFormDefault).toMatchObject(blank);
  });

  it('go back to the API unchanged (the same names as the land form)', () => {
    const form = mapCondoPropertyResponseToForm({ ...road } as never);
    expect(mapCondoFormDataToApiPayload(form as never)).toMatchObject(road);
  });
});
