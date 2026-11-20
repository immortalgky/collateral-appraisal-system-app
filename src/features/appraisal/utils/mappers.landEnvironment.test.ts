import { describe, expect, it } from 'vitest';
import { createLandAndBuildingFormDefault, createLandFormDefault } from '../schemas/form';
import {
  mapLandAndBuildingFormDataToApiPayload,
  mapLandAndBuildingPropertyResponseToForm,
  mapLandPropertyResponseToForm,
  mapProjectLandPropertyResponseToForm,
} from './mappers';
import { landToPayload, leaseLandBuildingToForm, leaseLandToForm } from './propertyFormRecipes';

const env = { environmentType: ['01', '99'], environmentTypeOther: 'ใกล้โรงงาน' };
const blank = { environmentType: [], environmentTypeOther: '' };

describe('land and land-and-building: the surroundings chips', () => {
  it('load from the response, and fall back to blank when it has none', () => {
    for (const map of [mapLandPropertyResponseToForm, mapLandAndBuildingPropertyResponseToForm]) {
      expect(map({ ...env } as never)).toMatchObject(env);
      expect(map({} as never)).toMatchObject(blank);
    }
    expect(createLandFormDefault).toMatchObject(blank);
    expect(createLandAndBuildingFormDefault).toMatchObject(blank);
  });

  it('go back to the API unchanged, on land, land and building, and the lease pages', () => {
    expect(
      landToPayload(mapLandPropertyResponseToForm({ ...env } as never) as never),
    ).toMatchObject(env);
    const lb = mapLandAndBuildingPropertyResponseToForm({ ...env } as never);
    expect(mapLandAndBuildingFormDataToApiPayload(lb as never)).toMatchObject(env);
    expect(leaseLandToForm({ ...env })).toMatchObject(env);
    expect(leaseLandBuildingToForm({ ...env })).toMatchObject(env);
  });
});

describe('block project land: the surroundings chips', () => {
  it('load from the ProjectLand response and fall back to blank', () => {
    expect(mapProjectLandPropertyResponseToForm({ ...env } as never)).toMatchObject(env);
    expect(mapProjectLandPropertyResponseToForm({} as never)).toMatchObject(blank);
  });
});

describe('land and land-and-building: the location remark', () => {
  it('loads from the response and falls back to blank, and goes back out in the payload', () => {
    for (const map of [mapLandPropertyResponseToForm, mapLandAndBuildingPropertyResponseToForm]) {
      expect(map({ landLocationRemark: 'ผิดที่' } as never)).toMatchObject({
        landLocationRemark: 'ผิดที่',
      });
      expect(map({} as never)).toMatchObject({ landLocationRemark: '' });
    }
    expect(createLandFormDefault).toMatchObject({ landLocationRemark: '' });
    expect(createLandAndBuildingFormDefault).toMatchObject({ landLocationRemark: '' });
    const lb = mapLandAndBuildingPropertyResponseToForm({ landLocationRemark: 'ผิดที่' } as never);
    expect(mapLandAndBuildingFormDataToApiPayload(lb as never)).toMatchObject({
      landLocationRemark: 'ผิดที่',
    });
    expect(leaseLandToForm({ landLocationRemark: 'ผิดที่' })).toMatchObject({
      landLocationRemark: 'ผิดที่',
    });
  });
});

describe('land: the check-by chips', () => {
  const maps = [
    mapLandPropertyResponseToForm,
    mapLandAndBuildingPropertyResponseToForm,
    mapProjectLandPropertyResponseToForm,
  ];

  it('load a list as it is, a record saved before as a one-item list, and nothing as an empty list', () => {
    for (const map of maps) {
      expect(map({ landCheckMethodType: ['01', '99'] } as never)).toMatchObject({
        landCheckMethodType: ['01', '99'],
      });
      expect(map({ landCheckMethodType: '02' } as never)).toMatchObject({
        landCheckMethodType: ['02'],
      });
      expect(map({ landCheckMethodType: null } as never)).toMatchObject({
        landCheckMethodType: [],
      });
      expect(map({ landCheckMethodType: '' } as never)).toMatchObject({ landCheckMethodType: [] });
    }
    expect(createLandFormDefault.landCheckMethodType).toEqual([]);
    expect(createLandAndBuildingFormDefault.landCheckMethodType).toEqual([]);
  });

  it('go back out as the list', () => {
    const form = mapLandPropertyResponseToForm({
      landCheckMethodType: ['01', '99'],
      landCheckMethodTypeOther: 'ภาพถ่ายดาวเทียม',
    } as never);
    expect(landToPayload(form as never)).toMatchObject({
      landCheckMethodType: ['01', '99'],
      landCheckMethodTypeOther: 'ภาพถ่ายดาวเทียม',
    });
    const lb = mapLandAndBuildingPropertyResponseToForm({ landCheckMethodType: '01' } as never);
    expect(mapLandAndBuildingFormDataToApiPayload(lb as never)).toMatchObject({
      landCheckMethodType: ['01'],
    });
  });
});

describe('land: the right restriction details', () => {
  it('load, fall back to blank and go back out, on land, land and building, project land and lease', () => {
    for (const map of [
      mapLandPropertyResponseToForm,
      mapLandAndBuildingPropertyResponseToForm,
      mapProjectLandPropertyResponseToForm,
    ]) {
      expect(map({ evictionRemark: 'แนวเสาไฟฟ้า' } as never)).toMatchObject({
        evictionRemark: 'แนวเสาไฟฟ้า',
      });
      expect(map({} as never)).toMatchObject({ evictionRemark: '' });
    }
    expect(createLandFormDefault.evictionRemark).toBe('');
    expect(createLandAndBuildingFormDefault.evictionRemark).toBe('');
    const form = mapLandPropertyResponseToForm({ evictionRemark: 'แนวเสาไฟฟ้า' } as never);
    expect(landToPayload(form as never)).toMatchObject({ evictionRemark: 'แนวเสาไฟฟ้า' });
    const lb = mapLandAndBuildingPropertyResponseToForm({ evictionRemark: 'แนวเสาไฟฟ้า' } as never);
    expect(mapLandAndBuildingFormDataToApiPayload(lb as never)).toMatchObject({
      evictionRemark: 'แนวเสาไฟฟ้า',
    });
    expect(leaseLandToForm({ evictionRemark: 'แนวเสาไฟฟ้า' })).toMatchObject({
      evictionRemark: 'แนวเสาไฟฟ้า',
    });
  });
});
