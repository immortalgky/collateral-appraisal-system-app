import { describe, expect, it } from 'vitest';
import { createBuildingFormDefault, createLandAndBuildingFormDefault } from '../schemas/form';
import {
  mapBuildingFormDataToApiPayload,
  mapBuildingPropertyResponseToForm,
  mapLandAndBuildingPropertyResponseToForm,
} from './mappers';

const extras = {
  constructionLicenseNumber: 'BL-123/2569',
  buildingWidth: 8,
  buildingLength: 12.5,
  spaceDivision: '3 bedrooms',
  maintenanceType: '99',
  maintenanceTypeOther: 'Repainted',
  doorType: ['01', '99'],
  doorTypeOther: 'Glass',
  windowType: ['02'],
  windowTypeOther: '',
  sanitaryType: ['01', '99'],
  sanitaryTypeOther: 'Bidet',
  buildingSystemType: ['03'],
  buildingSystemTypeOther: '',
};

describe('building detail fields: door, window, size, maintenance, services', () => {
  it('load from a building and a land+building response', () => {
    expect(mapBuildingPropertyResponseToForm({ ...extras } as never)).toMatchObject(extras);
    expect(mapLandAndBuildingPropertyResponseToForm({ ...extras } as never)).toMatchObject(extras);
  });

  it('fall back to blank when the response has none', () => {
    const blank = {
      constructionLicenseNumber: '',
      buildingWidth: null,
      buildingLength: null,
      spaceDivision: '',
      maintenanceType: '',
      doorType: [],
      windowType: [],
      sanitaryType: [],
      sanitaryTypeOther: '',
      buildingSystemType: [],
      buildingSystemTypeOther: '',
    };
    expect(mapBuildingPropertyResponseToForm({} as never)).toMatchObject(blank);
    expect(mapLandAndBuildingPropertyResponseToForm({} as never)).toMatchObject(blank);
    expect(createBuildingFormDefault).toMatchObject(blank);
    expect(createLandAndBuildingFormDefault).toMatchObject(blank);
  });

  it('reach the building payload', () => {
    const payload = mapBuildingFormDataToApiPayload({
      ...mapBuildingPropertyResponseToForm({ ...extras } as never),
    });
    expect(payload).toMatchObject(extras);
  });
});
