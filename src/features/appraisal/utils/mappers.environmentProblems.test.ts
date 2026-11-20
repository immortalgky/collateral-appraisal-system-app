import { describe, expect, it } from 'vitest';
import {
  createCondoFormDefault,
  createLandAndBuildingFormDefault,
  createLandFormDefault,
} from '../schemas/form';
import {
  mapCondoPropertyResponseToForm,
  mapLandAndBuildingPropertyResponseToForm,
  mapLandPropertyResponseToForm,
} from './mappers';

const problems = {
  hasFloodProblem: true,
  floodProblemRemark: 'Floods after heavy rain',
  hasPollutionProblem: true,
  pollutionType: ['01', '99'],
  pollutionTypeOther: 'Dust',
  pollutionProblemRemark: 'Smoke from the factory next door',
  hasOtherEnvironmentProblem: true,
  otherEnvironmentProblemRemark: 'Noise from the railway',
};

const blank = {
  hasFloodProblem: false,
  floodProblemRemark: '',
  hasPollutionProblem: false,
  pollutionType: [],
  pollutionTypeOther: '',
  pollutionProblemRemark: '',
  hasOtherEnvironmentProblem: false,
  otherEnvironmentProblemRemark: '',
};

describe('flood and pollution problems on land, land+building and condo', () => {
  it('load from the response', () => {
    for (const map of [
      mapLandPropertyResponseToForm,
      mapLandAndBuildingPropertyResponseToForm,
      mapCondoPropertyResponseToForm,
    ]) {
      expect(map({ ...problems } as never)).toMatchObject(problems);
    }
  });

  it('fall back to "no problem" when the response has none', () => {
    for (const map of [
      mapLandPropertyResponseToForm,
      mapLandAndBuildingPropertyResponseToForm,
      mapCondoPropertyResponseToForm,
    ]) {
      expect(map({} as never)).toMatchObject(blank);
    }
    for (const defaults of [
      createLandFormDefault,
      createLandAndBuildingFormDefault,
      createCondoFormDefault,
    ]) {
      expect(defaults).toMatchObject(blank);
    }
  });
});
