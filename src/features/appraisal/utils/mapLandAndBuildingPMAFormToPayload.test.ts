import { describe, expect, it } from 'vitest';
import { mapLandAndBuildingPMAFormToPayload } from './mappers';

/**
 * The backend replaces the title list with what is sent: rows are matched by id, a row that is not
 * sent is deleted, and a matched row has every field overwritten. The PMA form edits only the first
 * title, so the loaded titles have to go back with their ids and all their fields.
 */

const form = {
  sellingPrice: 1_000_000,
  forcedSalePrice: 700_000,
  buildingInsurancePrice: 0,
  titleNumber: 'T1-edited',
  rawang: 'R',
  landNumber: '12',
  surveyNumber: '34',
  bookNumber: 'B',
  pageNumber: 'P',
  areaRai: 1,
  areaNgan: 2,
  areaSquareWa: 3,
} as never;

const firstTitle = {
  id: 'title-1',
  titleNumber: 'T1',
  titleType: 'NS3K',
  mapSheetNumber: 'MS-9',
  governmentPrice: 250_000,
  remark: 'kept',
};
const secondTitle = { id: 'title-2', titleNumber: 'T2', titleType: 'DEED', remark: 'other' };

describe('mapLandAndBuildingPMAFormToPayload', () => {
  it('sends the loaded title back by id, with the fields the form does not show', () => {
    const { titles } = mapLandAndBuildingPMAFormToPayload(form, [firstTitle] as never);

    expect(titles).toHaveLength(1);
    expect(titles[0]).toMatchObject({
      id: 'title-1',
      titleType: 'NS3K',
      mapSheetNumber: 'MS-9',
      governmentPrice: 250_000,
      remark: 'kept',
      // the form's edits win
      titleNumber: 'T1-edited',
      landParcelNumber: '12',
      rai: 1,
    });
  });

  it('keeps the titles the form does not show', () => {
    const { titles } = mapLandAndBuildingPMAFormToPayload(form, [firstTitle, secondTitle] as never);

    expect(titles.map(t => t.id)).toEqual(['title-1', 'title-2']);
    expect(titles[1]).toEqual(secondTitle);
  });

  it('adds a new title when none was loaded', () => {
    const { titles } = mapLandAndBuildingPMAFormToPayload(form);

    expect(titles).toHaveLength(1);
    expect(titles[0]).toMatchObject({ id: null, titleType: 'DEED', titleNumber: 'T1-edited' });
  });

  it('drops only the first title when its key fields are cleared, as before', () => {
    const cleared = {
      ...(form as object),
      titleNumber: '',
      rawang: '',
      landNumber: '',
      surveyNumber: '',
    } as never;

    expect(mapLandAndBuildingPMAFormToPayload(cleared, [firstTitle] as never).titles).toEqual([]);
    expect(
      mapLandAndBuildingPMAFormToPayload(cleared, [firstTitle, secondTitle] as never).titles,
    ).toEqual([secondTitle]);
  });
});
