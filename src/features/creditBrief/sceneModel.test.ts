import { describe, expect, it } from 'vitest';
import type { BriefAsset } from './api/appraisalBrief';
import {
  areaWords,
  landAreaOf,
  landPropertiesOf,
  numberFormat,
  parseFloor,
  projectArea,
} from './sceneModel';

const titles = (...areas: [number, number, number][]) =>
  areas.map(([areaRai, areaNgan, areaSquareWa]) => ({
    areaRai,
    areaNgan,
    areaSquareWa,
  })) as BriefAsset['landTitles'];

describe('landAreaOf', () => {
  it('counts a property for its titles, or for its own area when it has none', () => {
    const a = { areaRai: 1, areaNgan: 0, areaSquareWa: 0 } as BriefAsset;
    const b = { areaRai: null, areaNgan: null, areaSquareWa: null, landTitles: titles([2, 0, 0]) };
    expect(landAreaOf([a, b as BriefAsset])).toEqual({ rai: 3, ngan: 0, wa: 0 });
  });

  it('follows the report: the titles of a property, not its own fields, when they record an area', () => {
    const a = {
      areaRai: 9,
      areaNgan: 0,
      areaSquareWa: 0,
      landTitles: titles([1, 0, 0], [1, 0, 0]),
    } as BriefAsset;
    expect(landAreaOf([a])).toEqual({ rai: 2, ngan: 0, wa: 0 });
  });

  it('uses the titles whenever they exist: a title with no area adds nothing, own fields do not fill in', () => {
    const a = {
      areaRai: 5,
      areaNgan: 0,
      areaSquareWa: 0,
      landTitles: titles([0, 0, 0]),
    } as BriefAsset;
    expect(landAreaOf([a])).toBeNull();
    const withNull = {
      areaRai: 5,
      landTitles: [{ areaRai: null, areaNgan: null, areaSquareWa: null }, ...titles([1, 0, 0])!],
    } as BriefAsset;
    expect(landAreaOf([withNull])).toEqual({ rai: 1, ngan: 0, wa: 0 });
  });

  it('keeps two decimals of square wa, as the report prints them', () => {
    const a = { areaRai: 0, areaNgan: 0, areaSquareWa: 41.25 } as BriefAsset;
    expect(landAreaOf([a])).toEqual({ rai: 0, ngan: 0, wa: 41.25 });
    expect(landAreaOf([{ ...a, areaSquareWa: 99.997 }])).toEqual({ rai: 0, ngan: 1, wa: 0 });
  });

  it('treats a recorded 0 as not recorded, so the titles stand in', () => {
    const a = {
      areaRai: 0,
      areaNgan: 0,
      areaSquareWa: 0,
      landTitles: titles([0, 1, 50], [0, 2, 50]),
    } as BriefAsset;
    expect(landAreaOf([a])).toEqual({ rai: 1, ngan: 0, wa: 0 });
    expect(landAreaOf([{ areaRai: 0, areaNgan: 0, areaSquareWa: 0 } as BriefAsset])).toBeNull();
  });
});

describe('projectArea', () => {
  it('reads the project land parts', () => {
    expect(projectArea({ landAreaRai: 4, landAreaNgan: 3, landAreaSquareWa: 99 } as never)).toEqual(
      { rai: 4, ngan: 3, wa: 99 },
    );
  });

  it('reads a project land of zero as not recorded', () => {
    expect(
      projectArea({ landAreaRai: 0, landAreaNgan: 0, landAreaSquareWa: 0 } as never),
    ).toBeNull();
  });
});

describe('totalArea fractions', () => {
  it('carries a fraction of a rai or a ngan down, as the report does', () => {
    const a = (areaRai: number, areaNgan: number, areaSquareWa: number) =>
      landAreaOf([{ areaRai, areaNgan, areaSquareWa } as BriefAsset]);
    expect(a(1, 2.5, 0)).toEqual({ rai: 1, ngan: 2, wa: 50 });
    expect(a(1.5, 0, 0)).toEqual({ rai: 1, ngan: 2, wa: 0 });
    expect(a(0, 2.5, 60)).toEqual({ rai: 0, ngan: 3, wa: 10 });
    expect(a(0, 0.125, 0)).toEqual({ rai: 0, ngan: 0, wa: 12.5 });
  });
});

describe('areaWords', () => {
  const t = ((key: string, o?: { area?: string }) =>
    o?.area ? `${key}|${o.area}` : key.split('.').pop()) as never;

  it('groups thousands and keeps two decimals of wa, as the hero does', () => {
    const area = { rai: 1234, ngan: 3, wa: 41.25 };
    expect(areaWords(t, area, numberFormat('en'))).toBe(
      'activityTracking.brief.collateral.totalArea|1,234 rai 3 ngan 41.25 wa',
    );
    expect(numberFormat('th')(1234.5, 2)).toBe('1,234.5');
    // The same as formatting by hand, and one formatter per locale and precision.
    expect(numberFormat('en')(1234.567, 2)).toBe(
      (1234.567).toLocaleString('en-US', { maximumFractionDigits: 2 }),
    );
    // The cached formatter is keyed by precision and locale: the same language at two precisions differs.
    expect(numberFormat('en')(1.555, 0)).toBe('2');
    expect(numberFormat('en')(1.555, 2)).toBe('1.56');
    expect(numberFormat('en')(1.555, 0)).toBe('2');
  });
});

describe('parseFloor', () => {
  it.each([
    ['5', 5],
    [' 12 ', 12],
    ['5 -', 5],
    ['- 5', 5],
    ['12th', 12],
    ['ชั้น 5', 5],
    ['ชั้นที่ 12', 12],
    ['F5', 5],
    ['Fl.5', 5],
    ['Floor 5', 5],
    ['fl 7', 7],
    ['๕', 5],
    ['ชั้น ๑๒', 12],
    ['๕ -', 5],
  ])('reads %j as floor %s', (raw, floor) => {
    expect(parseFloor(raw)).toBe(floor);
  });

  it.each([
    '5-6',
    '5 - 6',
    '5~6',
    '5/6',
    '5,6',
    '5 และ 6',
    '5.5',
    '-',
    '',
    '0',
    'G',
    'B1',
    'P2',
    'LG',
    'ชั้นใต้ดิน 2',
    'ใต้ดิน 1',
    '-1',
    'ชั้น -1',
    'ชั้น B1',
    '−1',
    '–1',
    '—1',
    '‐1',
    '‑1',
    '‒1',
    '－1',
    '﹣1',
    '-๑',
    '๕-๖',
  ])('does not read %j as one floor', raw => {
    expect(parseFloor(raw)).toBeNull();
  });
});

describe('landPropertiesOf', () => {
  it('keeps land and land-and-building properties, and drops a condo unit and a machine', () => {
    const a = (propertyType: string) => ({ propertyType }) as BriefAsset;
    expect(
      landPropertiesOf([a('L'), a('LB'), a('U'), a('MAC'), a('B')]).map(x => x.propertyType),
    ).toEqual(['L', 'LB']);
  });
});
