import { describe, expect, it } from 'vitest';
import {
  mapBuildingPropertyResponseToForm,
  mapCondoPropertyResponseToForm,
  mapLandAndBuildingFormDataToApiPayload,
  mapLandAndBuildingPropertyResponseToForm,
  mapLandPropertyResponseToForm,
} from './mappers';

const maps = [
  mapLandPropertyResponseToForm,
  mapBuildingPropertyResponseToForm,
  mapCondoPropertyResponseToForm,
  mapLandAndBuildingPropertyResponseToForm,
];

const saved = {
  obligationType: ['02', '03'],
  mortgageDetails: 'Bank A, 1st mortgage',
  obligationDetails: 'Lease 30 years',
};

describe('obligation fields', () => {
  it('load from the response in every property form', () => {
    for (const map of maps) expect(map({ ...saved } as never)).toMatchObject(saved);
  });

  it('fall back to an empty list and blank texts, and the old single code is gone', () => {
    for (const map of maps) {
      const form = map({ hasObligation: '02' } as never);
      expect(form).toMatchObject({
        obligationType: [],
        mortgageDetails: '',
        obligationDetails: '',
      });
      expect(form).not.toHaveProperty('hasObligation');
    }
  });

  it('round-trip: what the form holds is what the save payload carries', () => {
    const form = mapLandAndBuildingPropertyResponseToForm({ ...saved } as never);
    expect(mapLandAndBuildingFormDataToApiPayload(form)).toMatchObject(saved);
  });
});
