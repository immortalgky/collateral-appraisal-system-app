import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import en from '@/i18n/locales/en/request.json';
import th from '@/i18n/locales/th/request.json';
import zh from '@/i18n/locales/zh/request.json';
import {
  makeTitleCondoFields,
  makeTitleLandFields,
  titleCondoFields,
  titleLandFields,
} from './fields';

const t = ((key: string) => key) as unknown as TFunction<'request'>;

describe('the title detail (notes) field of a request title', () => {
  it.each([
    ['land', makeTitleLandFields(t)],
    ['condominium', makeTitleCondoFields(t)],
  ])('is shown, labelled as additional, and not required on %s', (_family, fields) => {
    const notes = fields.find(field => field.name === 'notes');
    expect(notes?.label).toBe('fields.titleDetail');
    expect(notes).not.toHaveProperty('requiredWhen');
    expect(notes).not.toHaveProperty('required');
  });

  it.each([
    ['land', makeTitleLandFields(t)],
    ['condominium', makeTitleCondoFields(t)],
    ['land (schema config)', titleLandFields],
    ['condominium (schema config)', titleCondoFields],
  ])('holds up to 4000 characters on %s, as the LOS contract does', (_family, fields) => {
    const notes = fields.find(field => field.name === 'notes');
    expect(notes).toMatchObject({ maxLength: 4000 });
  });

  it('says "additional" in every language', () => {
    expect(en.fields.titleDetail).toBe('Title Detail (Additional)');
    expect(th.fields.titleDetail).toBe('รายละเอียดโฉนด (เพิ่มเติม)');
    expect(zh.fields.titleDetail).toBe('产权详情（补充）');
  });
});
