import { describe, expect, it } from 'vitest';
import { createCondoFormDefault } from '../schemas/form';
import { mapCondoFormDataToApiPayload, mapCondoPropertyResponseToForm } from './mappers';

describe('condo: the unit location remark', () => {
  it('loads, falls back to blank, and goes back out', () => {
    const form = mapCondoPropertyResponseToForm({
      locationType: '2',
      locationRemark: 'ชั้นไม่ตรงโฉนด',
    } as never);
    expect(form).toMatchObject({ locationType: '2', locationRemark: 'ชั้นไม่ตรงโฉนด' });
    expect(mapCondoPropertyResponseToForm({} as never)).toMatchObject({ locationRemark: '' });
    expect(createCondoFormDefault).toMatchObject({ locationRemark: '' });
    expect(mapCondoFormDataToApiPayload(form as never)).toMatchObject({
      locationRemark: 'ชั้นไม่ตรงโฉนด',
    });
  });
});
