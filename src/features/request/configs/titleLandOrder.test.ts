import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import {
  AREA_ORDER,
  DOCUMENT_ORDER,
  inScreenOrder,
  POSITION_ORDER,
  TITLE_SCREEN_ORDER,
} from '@/features/appraisal/components/titleScreenOrder';
import { POSITION_FIELDS } from '../utils/titleList';
import { makeTitleLandFields, titleLandFields } from './fields';

/** The request's area parts under their DTO names, as the land page's rai / ngan / squareWa. */
const ALIAS: Record<string, string> = {
  areaRai: 'rai',
  areaNgan: 'ngan',
  areaSquareWa: 'squareWa',
};
const asScreenNames = (names: string[]) =>
  names.map(name => ALIAS[name] ?? name).filter(name => TITLE_SCREEN_ORDER.includes(name));

describe('the land title field order follows the land page screen (TitleFormView)', () => {
  it('is document numbers, then position, then area', () => {
    expect(TITLE_SCREEN_ORDER).toEqual([
      'titleType',
      'titleNumber',
      'bookNumber',
      'pageNumber',
      'rawang',
      'aerialMapName',
      'aerialMapNumber',
      'mapSheetNumber',
      'landParcelNumber',
      'surveyNumber',
      'rai',
      'ngan',
      'squareWa',
    ]);
    expect([...DOCUMENT_ORDER, ...POSITION_ORDER, ...AREA_ORDER]).toEqual(
      TITLE_SCREEN_ORDER.slice(1),
    );
  });

  it('is the order of the request form', () => {
    const t = ((key: string) => key) as unknown as TFunction<'request'>;
    expect(asScreenNames(makeTitleLandFields(t).map(field => field.name))).toEqual(
      TITLE_SCREEN_ORDER,
    );
  });

  it('is the order of the save schema, which sets the "still missing" list', () => {
    expect(asScreenNames(titleLandFields.map(field => field.name))).toEqual(TITLE_SCREEN_ORDER);
  });

  it('is the order of the position chips in the table', () => {
    expect([...POSITION_FIELDS]).toEqual([...POSITION_ORDER]);
  });

  it('keeps fields the screen does not list (owner, notes) in their order, after the rest', () => {
    const sorted = inScreenOrder([
      { name: 'notes' },
      { name: 'areaSquareWa' },
      { name: 'ownerName' },
      { name: 'surveyNumber' },
      { name: 'titleNumber' },
    ]);
    expect(sorted.map(field => field.name)).toEqual([
      'titleNumber',
      'surveyNumber',
      'areaSquareWa',
      'notes',
      'ownerName',
    ]);
  });
});
