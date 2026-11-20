import { describe, expect, it } from 'vitest';
import { createLandAndBuildingFormDefault, createLandFormDefault } from '../schemas/form';
import { mapLandAndBuildingPropertyResponseToForm, mapLandPropertyResponseToForm } from './mappers';

describe('development suitability on land and land+building', () => {
  it('loads from the response, with the old land shape left alone', () => {
    const response = { developmentSuitabilityType: '02', landShapeType: '01' } as never;
    for (const map of [mapLandPropertyResponseToForm, mapLandAndBuildingPropertyResponseToForm])
      expect(map(response)).toMatchObject({
        developmentSuitabilityType: '02',
        landShapeType: '01',
      });
  });

  it('is blank when the response has none', () => {
    for (const map of [mapLandPropertyResponseToForm, mapLandAndBuildingPropertyResponseToForm])
      expect(map({} as never)).toMatchObject({ developmentSuitabilityType: '' });
    expect(createLandFormDefault).toMatchObject({ developmentSuitabilityType: '' });
    expect(createLandAndBuildingFormDefault).toMatchObject({ developmentSuitabilityType: '' });
  });
});
