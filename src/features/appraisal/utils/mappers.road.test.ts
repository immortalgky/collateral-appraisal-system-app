import { describe, expect, it } from 'vitest';
import {
  mapCondoPropertyResponseToForm,
  mapLandAndBuildingPropertyResponseToForm,
  mapLandPropertyResponseToForm,
} from './mappers';

const road = { carriagewayWidth: 6.5, rightOfWayWidth: 12.25, numberOfLanes: 2 };
const maps = [
  mapLandPropertyResponseToForm,
  mapLandAndBuildingPropertyResponseToForm,
  mapCondoPropertyResponseToForm,
];

describe('road fields: carriageway width, right-of-way width, number of lanes', () => {
  it('load from the response', () => {
    for (const map of maps) expect(map({ ...road } as never)).toMatchObject(road);
  });

  it('ignore the old names and fall back to blank', () => {
    for (const map of maps) {
      const form = map({ accessRoadWidth: 8, rightOfWay: 3 } as never);
      expect(form).toMatchObject({
        carriagewayWidth: null,
        rightOfWayWidth: null,
        numberOfLanes: null,
      });
      expect(form).not.toHaveProperty('accessRoadWidth');
      expect(form).not.toHaveProperty('rightOfWay');
    }
  });
});
