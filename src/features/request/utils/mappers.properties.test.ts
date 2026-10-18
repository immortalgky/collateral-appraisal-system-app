import { describe, expect, it } from 'vitest';
import type { GetRequestByIdResultType } from '../api';
import { mapRequestResponseToForm } from './mappers';

describe('mapRequestResponseToForm properties', () => {
  it('drops the building type of a row saved before CA-288 on a type without a building', () => {
    const response = {
      properties: [
        { propertyType: 'L', buildingType: '99', buildingTypeOther: 'x', sellingPrice: 1 },
        { propertyType: 'LB', buildingType: '01', buildingTypeOther: null, sellingPrice: 2 },
      ],
    } as unknown as GetRequestByIdResultType;
    expect(mapRequestResponseToForm(response).properties).toEqual([
      { propertyType: 'L', buildingType: null, buildingTypeOther: null, sellingPrice: 1 },
      { propertyType: 'LB', buildingType: '01', buildingTypeOther: null, sellingPrice: 2 },
    ]);
  });
});
