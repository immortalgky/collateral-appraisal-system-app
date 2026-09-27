import { describe, expect, it } from 'vitest';
import { mapLandAndBuildingPMAFormToPayload } from './mappers';

/**
 * The backend replaces the title list with what is sent: rows are matched by id, a row that is not
 * sent is deleted, and a matched row has every field overwritten except its title number, which it
 * never changes. The PMA form edits only the first title, so the loaded titles go back with all
 * their fields; the first keeps its id unless its title number changed, when it goes as a new row.
 */

const form = {
  sellingPrice: 1_000_000,
  forcedSalePrice: 700_000,
  buildingInsurancePrice: 0,
  titleNumber: 'T1',
  rawang: 'R',
  landNumber: '12-edited',
  surveyNumber: '34',
  bookNumber: 'B',
  pageNumber: 'P',
  areaRai: 1,
  areaNgan: 2,
  areaSquareWa: 3,
};

const firstTitle = {
  id: 'title-1',
  titleNumber: 'T1',
  titleType: 'NS3K',
  landParcelNumber: '12',
  mapSheetNumber: 'MS-9',
  governmentPrice: 250_000,
  remark: 'kept',
};
const secondTitle = { id: 'title-2', titleNumber: 'T2', titleType: 'DEED', remark: 'other' };

const map = (values: object, saved?: object[]) =>
  mapLandAndBuildingPMAFormToPayload(values as never, saved as never);

describe('mapLandAndBuildingPMAFormToPayload', () => {
  it('updates the loaded title in place, keeping the fields the form does not show', () => {
    const { titles } = map(form, [firstTitle]);

    expect(titles).toHaveLength(1);
    expect(titles[0]).toMatchObject({
      id: 'title-1',
      titleType: 'NS3K',
      mapSheetNumber: 'MS-9',
      governmentPrice: 250_000,
      remark: 'kept',
      landParcelNumber: '12-edited', // the form's edit wins
    });
  });

  it('sends a changed title number as a new row, still with the other fields', () => {
    // The backend never updates a title number in place, so an id here would drop the edit.
    const { titles } = map({ ...form, titleNumber: 'T1-new' }, [firstTitle]);

    expect(titles).toHaveLength(1);
    expect(titles[0]).toMatchObject({
      id: null,
      titleNumber: 'T1-new',
      titleType: 'NS3K',
      mapSheetNumber: 'MS-9',
      governmentPrice: 250_000,
      remark: 'kept',
    });
  });

  it('ignores padding around the title number', () => {
    expect(map({ ...form, titleNumber: ' T1 ' }, [firstTitle]).titles[0]).toMatchObject({
      id: 'title-1',
      titleNumber: 'T1',
    });
    expect(map({ ...form, titleNumber: ' T9 ' }, [firstTitle]).titles[0]).toMatchObject({
      id: null,
      titleNumber: 'T9',
    });
  });

  it('keeps the other titles when the first one is renumbered', () => {
    const { titles } = map({ ...form, titleNumber: 'T1-new' }, [firstTitle, secondTitle]);

    expect(titles.map(t => t.id)).toEqual([null, 'title-2']);
    expect(titles[0]).toMatchObject({ titleNumber: 'T1-new', landParcelNumber: '12-edited' });
  });

  it('keeps the titles the form does not show', () => {
    const { titles } = map(form, [firstTitle, secondTitle]);

    expect(titles.map(t => t.id)).toEqual(['title-1', 'title-2']);
    expect(titles[1]).toEqual(secondTitle);
  });

  it('adds a new title when none was loaded', () => {
    const { titles } = map(form);

    expect(titles).toHaveLength(1);
    expect(titles[0]).toMatchObject({ id: null, titleType: 'DEED', titleNumber: 'T1' });
  });

  it('drops only the first title when its key fields are cleared, as before', () => {
    const cleared = { ...form, titleNumber: '', rawang: '', landNumber: '', surveyNumber: '' };

    expect(map(cleared, [firstTitle]).titles).toEqual([]);
    expect(map(cleared, [firstTitle, secondTitle]).titles).toEqual([secondTitle]);
  });
});
