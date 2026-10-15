import { describe, expect, it } from 'vitest';
import { requestTitleDefault, type RequestTitleDtoType } from '../schemas/form';
import {
  allowedCollateralCodes,
  arrayMove,
  copyAddress,
  estateTotals,
  filterIndices,
  formatRaiNganWa,
  isEstateSortedByNumber,
  matchesTitleFilter,
  normaliseLandTitleNumbers,
  parcelsIn,
  splitLandTitleNumbers,
  summariseTitleNumber,
  orderByIds,
  tableRank,
  resolveLocality,
  districtOnlyInRecord,
  withPlaceNames,
  missingFieldPaths,
  movableIdentity,
  newTitle,
  NO_FILTER,
  positionEntries,
  positionToIndex,
  rankInGroup,
  groupSize,
  slotInGroup,
  addressWithLocality,
  localityOf,
  sameAddress,
  sortEstateByNumber,
  splitByGroup,
  titleFamily,
  totalSquareWa,
  isTitleComplete,
} from './titleList';

const make = (over: Partial<RequestTitleDtoType> = {}): RequestTitleDtoType => ({
  ...structuredClone(requestTitleDefault),
  ...over,
});

const address = {
  houseNumber: '99/1',
  subDistrict: '100101',
  district: '1001',
  province: '10',
};

/** A land title the schema accepts. */
const completeLand = (over: Partial<RequestTitleDtoType> = {}) =>
  make({
    collateralType: '01',
    titleType: 'DEED',
    titleNumber: '12345',
    areaSquareWa: 50,
    ownerName: 'Somchai',
    notes: 'detail',
    titleAddress: { ...requestTitleDefault.titleAddress, ...address },
    dopaAddress: { ...requestTitleDefault.dopaAddress, ...address },
    ...over,
  });

describe('titleFamily / splitByGroup', () => {
  it('maps each collateral code to the form it opens', () => {
    expect(titleFamily('01')).toBe('land');
    expect(titleFamily('29')).toBe('land');
    expect(titleFamily('02')).toBe('landBuilding');
    expect(titleFamily('05')).toBe('building');
    expect(titleFamily('08')).toBe('condo');
    expect(titleFamily('10')).toBe('vehicle');
    expect(titleFamily('11')).toBe('machine');
    expect(titleFamily('12')).toBe('vessel');
    expect(titleFamily('')).toBe('none');
    expect(titleFamily(undefined)).toBe('none');
    expect(titleFamily('99')).toBe('none');
  });

  it('splits indices into estate (untyped included) and movable, keeping array order', () => {
    const titles = ['01', '10', '', '12', '08', '11'].map(collateralType => ({ collateralType }));
    expect(splitByGroup(titles)).toEqual({ estate: [0, 2, 4], movable: [1, 3, 5] });
  });
});

describe('newTitle', () => {
  it('starts land, land-with-building and condo as a deed, the rest untyped', () => {
    expect(newTitle('01').titleType).toBe('DEED');
    expect(newTitle('02').titleType).toBe('DEED');
    expect(newTitle('08').titleType).toBe('DEED');
    expect(newTitle('05').titleType).toBe('');
    expect(newTitle('10').titleType).toBe('');
    expect(newTitle('').titleType).toBe('');
  });

  it('copies the default, so editing one title cannot reach the default or another title', () => {
    const a = newTitle('01');
    const b = newTitle('01');
    a.titleAddress!.subDistrict = 'x';
    expect(b.titleAddress).not.toBe(a.titleAddress);
    expect(b.titleAddress!.subDistrict).toBe('');
    expect(requestTitleDefault.titleAddress!.subDistrict).toBe('');
  });
});

describe('allowedCollateralCodes', () => {
  it('allows everything until the request has properties', () => {
    expect(allowedCollateralCodes(undefined)).toBeNull();
    expect(allowedCollateralCodes([])).toBeNull();
  });

  it('unions what each property type allows', () => {
    const codes = allowedCollateralCodes([{ propertyType: 'U' }, { propertyType: 'VEH' }])!;
    expect(codes.has('08')).toBe(true);
    expect(codes.has('10')).toBe(true);
    expect(codes.has('01')).toBe(false);
    expect(codes.has('11')).toBe(false);
  });

  it('an unknown property type puts no limit on the list', () => {
    expect(allowedCollateralCodes([{ propertyType: 'L' }, { propertyType: 'ZZ' }])).toBeNull();
  });
});

describe('missingFieldPaths / isTitleComplete', () => {
  it('is empty for a title the schema accepts', () => {
    expect(missingFieldPaths(completeLand())).toEqual([]);
    expect(isTitleComplete(completeLand())).toBe(true);
  });

  it('lists the paths Save would reject, address fields included', () => {
    const missing = missingFieldPaths(make({ collateralType: '01' }));
    expect(missing).toEqual(
      expect.arrayContaining([
        'titleType',
        'titleNumber',
        'areaSquareWa',
        'ownerName',
        'notes',
        'titleAddress.subDistrict',
        'dopaAddress.subDistrict',
      ]),
    );
    expect(isTitleComplete(make({ collateralType: '01' }))).toBe(false);
  });

  it('follows the collateral type: a vehicle needs a chassis number, a land title does not', () => {
    expect(missingFieldPaths(make({ collateralType: '10' }))).toContain('vin');
    expect(missingFieldPaths(make({ collateralType: '01' }))).not.toContain('vin');
  });

  it('reports each path once', () => {
    const missing = missingFieldPaths(make({ collateralType: '08' }));
    expect(new Set(missing).size).toBe(missing.length);
  });

  it('is empty for no title', () => {
    expect(missingFieldPaths(undefined)).toEqual([]);
    expect(isTitleComplete(undefined)).toBe(false);
  });
});

describe('area', () => {
  it('totals from rai / ngan / wa and treats blanks as zero', () => {
    expect(totalSquareWa({ areaRai: 1, areaNgan: 2, areaSquareWa: 30.5 })).toBe(630.5);
    expect(totalSquareWa({ areaRai: null, areaNgan: null, areaSquareWa: null })).toBe(0);
  });

  it('formats square wa back as rai-ngan-wa', () => {
    expect(formatRaiNganWa(0)).toBe('0-0-0');
    expect(formatRaiNganWa(150)).toBe('0-1-50');
    expect(formatRaiNganWa(630.5)).toBe('1-2-30.5');
    expect(formatRaiNganWa(400)).toBe('1-0-0');
  });

  it('totals land and land-with-building only, over the indices asked for', () => {
    const titles = [
      completeLand({ areaSquareWa: 50 }),
      make({ collateralType: '08', areaSquareWa: 999 }),
      make({ collateralType: '02', areaRai: 1 }),
      make({ collateralType: '10' }),
    ];
    expect(estateTotals(titles, [0, 1, 2])).toEqual({ parcels: 2, totalWa: 450 });
    expect(estateTotals(titles, [0])).toEqual({ parcels: 1, totalWa: 50 });
  });
});

describe('positionEntries / movableIdentity', () => {
  it('keeps only the position fields that have a value, in the land page screen order', () => {
    const entries = positionEntries(
      make({ landParcelNumber: '88', rawang: '5136 IV', surveyNumber: ' ', mapSheetNumber: '3' }),
    );
    expect(entries).toEqual([
      ['rawang', '5136 IV'],
      ['mapSheetNumber', '3'],
      ['landParcelNumber', '88'],
    ]);
  });

  it('names a movable by its plate, registration or hull', () => {
    expect(movableIdentity(make({ collateralType: '10', licensePlateNumber: 'กข 1234' }))).toBe(
      'กข 1234',
    );
    expect(movableIdentity(make({ collateralType: '10', vehicleRegistrationNumber: 'BK-1' }))).toBe(
      'BK-1',
    );
    expect(
      movableIdentity(
        make({ collateralType: '11', registrationStatus: true, registrationNumber: 'ร.1-45' }),
      ),
    ).toBe('ร.1-45');
    expect(
      movableIdentity(
        make({ collateralType: '11', registrationStatus: false, registrationNumber: 'ร.1-45' }),
      ),
    ).toBe('');
    expect(movableIdentity(make({ collateralType: '12', hin: 'HIN9' }))).toBe('HIN9');
    expect(movableIdentity(make({ collateralType: '01' }))).toBe('');
  });
});

describe('filtering', () => {
  const titles = [
    completeLand({
      titleNumber: '12345',
      ownerName: 'นายสมชาย ใจดี',
      titleAddress: { ...requestTitleDefault.titleAddress, districtName: 'ห้วยขวาง' },
    }),
    make({ collateralType: '08', condoName: 'ศุภาลัย', ownerName: 'นางสาวมาลี' }),
    make({ collateralType: '10', licensePlateNumber: 'กข 1234', vin: 'MR053' }),
    completeLand({ titleNumber: '777', ownerName: 'Somchai' }),
  ];
  const completeness = titles.map(isTitleComplete);
  const all = [0, 1, 2, 3];
  const run = (query: string, chip: Parameters<typeof matchesTitleFilter>[1]['chip'] = 'all') =>
    filterIndices(titles, all, { query, chip }, completeness);

  it('returns everything when nothing is set', () => {
    expect(filterIndices(titles, all, NO_FILTER, completeness)).toEqual(all);
  });

  it('searches title number, owner, place, condo name and movable identifiers', () => {
    expect(run('12345')).toEqual([0]);
    expect(run('สมชาย')).toEqual([0]);
    expect(run('ห้วยขวาง')).toEqual([0]);
    expect(run('ศุภาลัย')).toEqual([1]);
    expect(run('กข 1234')).toEqual([2]);
    expect(run('MR053')).toEqual([2]);
  });

  it('ignores case and needs every word', () => {
    expect(run('SOMCHAI')).toEqual([3]);
    expect(run('somchai 777')).toEqual([3]);
    expect(run('somchai 12345')).toEqual([]);
  });

  it('narrows by status and by family', () => {
    expect(completeness).toEqual([false, false, false, true]);
    expect(run('', 'incomplete')).toEqual([0, 1, 2]);
    expect(run('', 'condo')).toEqual([1]);
    expect(run('', 'vehicle')).toEqual([2]);
    expect(run('', 'land')).toEqual([0, 3]);
    expect(run('777', 'condo')).toEqual([]);
  });

  it('only filters within the indices it is given (one table at a time)', () => {
    expect(filterIndices(titles, [1, 2], { query: 'somchai', chip: 'all' }, completeness)).toEqual(
      [],
    );
    // title 3 matches "somchai" too, but is not one of the indices asked for
    expect(filterIndices(titles, [0, 1], { query: 'somchai', chip: 'all' }, completeness)).toEqual(
      [],
    );
    expect(filterIndices(titles, [0, 3], { query: 'somchai', chip: 'all' }, completeness)).toEqual([
      3,
    ]);
  });
});

describe('ordering', () => {
  const t = (collateralType: string, titleNumber: string | null) =>
    ({ collateralType, titleNumber }) as RequestTitleDtoType;

  it('sorts numerically and with Thai prefixes, blanks last', () => {
    const titles = [t('01', '10'), t('01', null), t('01', '2'), t('01', 'ก-3'), t('01', '1')];
    expect(sortEstateByNumber(titles).map(x => x.titleNumber)).toEqual([
      '1',
      '2',
      '10',
      'ก-3',
      null,
    ]);
  });

  it('leaves every movable exactly where it was and only refills the estate slots', () => {
    const titles = [t('01', '30'), t('10', 'x'), t('01', '10'), t('12', 'y'), t('02', '20')];
    const sorted = sortEstateByNumber(titles);
    expect(sorted.map(x => x.titleNumber)).toEqual(['10', 'x', '20', 'y', '30']);
    expect(sorted[1]).toBe(titles[1]);
    expect(sorted[3]).toBe(titles[3]);
  });

  it('does not mutate its input and is stable for equal numbers', () => {
    const a = t('01', '5');
    const b = t('01', '5');
    const titles = [a, b];
    sortEstateByNumber(titles);
    expect(titles).toEqual([a, b]);
    const sorted = sortEstateByNumber(titles);
    expect(sorted[0]).toBe(a);
    expect(sorted[1]).toBe(b);
  });

  it('knows when the estate is already in order', () => {
    expect(isEstateSortedByNumber([t('01', '1'), t('10', 'z'), t('01', '2')])).toBe(true);
    expect(isEstateSortedByNumber([t('01', '2'), t('01', '1')])).toBe(false);
    expect(isEstateSortedByNumber([])).toBe(true);
  });

  it('turns a typed position into a clamped index', () => {
    expect(positionToIndex(1, 80)).toBe(0);
    expect(positionToIndex(80, 80)).toBe(79);
    expect(positionToIndex(500, 80)).toBe(79);
    expect(positionToIndex(0, 80)).toBe(0);
    expect(positionToIndex(-4, 80)).toBe(0);
    expect(positionToIndex(Number.NaN, 80)).toBe(0);
    expect(positionToIndex(3.9, 80)).toBe(2);
    expect(positionToIndex(5, 0)).toBe(0);
  });
});

describe('reordering one table inside the single titles array', () => {
  // E = estate, M = movable; the two groups are interleaved on purpose.
  const titles = ['E1', 'M1', 'E2', 'E3', 'M2', 'E4'].map(name => ({
    name,
    collateralType: name.startsWith('M') ? '10' : '01',
  }));
  const names = (list: typeof titles) => list.map(x => x.name);
  const group = (list: typeof titles, kind: 'E' | 'M') =>
    names(list).filter(n => n.startsWith(kind));

  it('moving a row to another row of its own table gives that table the dragged order', () => {
    // drag E4 (index 5) onto E1 (index 0): the table now reads E4, E1, E2, E3
    expect(group(arrayMove(titles, 5, 0), 'E')).toEqual(['E4', 'E1', 'E2', 'E3']);
    // drag E1 (index 0) onto E3 (index 3): E2, E3, E1, E4
    expect(group(arrayMove(titles, 0, 3), 'E')).toEqual(['E2', 'E3', 'E1', 'E4']);
  });

  it('keeps the other table in its own order', () => {
    expect(group(arrayMove(titles, 5, 0), 'M')).toEqual(['M1', 'M2']);
    expect(group(arrayMove(titles, 0, 3), 'M')).toEqual(['M1', 'M2']);
    expect(group(arrayMove(titles, 3, 2), 'M')).toEqual(['M1', 'M2']);
  });

  it('holds for every pair of rows in one table', () => {
    const { estate } = splitByGroup(titles);
    for (const from of estate) {
      for (const to of estate) {
        const moved = arrayMove(titles, from, to);
        const expected = arrayMove(
          estate.map(i => titles[i]),
          estate.indexOf(from),
          estate.indexOf(to),
        );
        expect(group(moved, 'E')).toEqual(names(expected));
        expect(group(moved, 'M')).toEqual(['M1', 'M2']);
      }
    }
  });

  it('moving to the same place changes nothing', () => {
    expect(arrayMove(titles, 2, 2)).toEqual(titles);
  });
});

describe('addresses', () => {
  it('treats null, undefined, blank and padding as the same value', () => {
    expect(sameAddress({ houseNumber: null, moo: '' }, { moo: '  ', soi: undefined })).toBe(true);
    expect(sameAddress({ subDistrict: '1001' }, { subDistrict: '1002' })).toBe(false);
    expect(sameAddress(undefined, undefined)).toBe(true);
  });

  it('copies the twelve fields with blanks as empty strings, and nothing else', () => {
    const copy = copyAddress({
      houseNumber: '9',
      subDistrict: '100101',
      subDistrictName: 'บางกะปิ',
      postcode: null,
      // @ts-expect-error not an address field
      extra: 'dropped',
    });
    expect(Object.keys(copy)).toHaveLength(12);
    expect(copy.houseNumber).toBe('9');
    expect(copy.postcode).toBe('');
    expect(copy).not.toHaveProperty('extra');
    expect(
      sameAddress(copy, { houseNumber: '9', subDistrict: '100101', subDistrictName: 'บางกะปิ' }),
    ).toBe(true);
  });
});

describe('orderByIds', () => {
  it('puts the ids in the desired order', () => {
    expect(orderByIds(['a', 'b', 'c', 'd'], ['d', 'b', 'a', 'c'])).toEqual(['d', 'b', 'a', 'c']);
  });

  it('skips ids that are gone, and keeps an id the order does not know beside what precedes it', () => {
    // x sits after a, y after c: each stays next to its predecessor, not at the end
    expect(orderByIds(['a', 'x', 'c', 'y', 'b'], ['d', 'c', 'b', 'a'])).toEqual([
      'c',
      'y',
      'b',
      'a',
      'x',
    ]);
  });

  it('keeps a duplicate beside the title it was copied from', () => {
    expect(orderByIds(['a', 'b', 'b2', 'c'], ['c', 'b', 'a'])).toEqual(['c', 'b', 'b2', 'a']);
  });

  it('leaves titles added at the very end at the end, in their order', () => {
    expect(orderByIds(['a', 'b', 'c', 'n1', 'n2'], ['c', 'a', 'b'])).toEqual([
      'c',
      'a',
      'b',
      'n1',
      'n2',
    ]);
  });

  it('counts a repeated id once, and leaves an empty wish alone', () => {
    expect(orderByIds(['a', 'b', 'c'], ['c', 'c', 'a'])).toEqual(['c', 'a', 'b']);
    expect(orderByIds(['a', 'b'], [])).toEqual(['a', 'b']);
  });
});

describe('tableRank', () => {
  // E1 M1 E2 E3 M2 E4
  const titles = ['01', '10', '01', '01', '10', '01'].map(collateralType => ({ collateralType }));

  it('numbers each table from 1, in array order', () => {
    expect([0, 2, 3, 5].map(i => tableRank(titles, i))).toEqual([
      { group: 'estate', rank: 1 },
      { group: 'estate', rank: 2 },
      { group: 'estate', rank: 3 },
      { group: 'estate', rank: 4 },
    ]);
    expect([1, 4].map(i => tableRank(titles, i))).toEqual([
      { group: 'movable', rank: 1 },
      { group: 'movable', rank: 2 },
    ]);
  });

  it('counts an untyped title with the estate', () => {
    expect(tableRank([{ collateralType: '' }, { collateralType: '01' }], 1)).toEqual({
      group: 'estate',
      rank: 2,
    });
  });
});

describe('resolveLocality', () => {
  const row = (code: string, sub: string, dist: string, prov: string) => ({
    subDistrictCode: code,
    subDistrictName: sub,
    districtCode: code.slice(0, 4),
    districtName: dist,
    provinceCode: code.slice(0, 2),
    provinceName: prov,
    postcode: '10200',
  });
  const dopa = [
    row('100101', 'พระบรมมหาราชวัง', 'พระนคร', 'กรุงเทพมหานคร'),
    row('100102', 'วังบูรพาภิรมย์', 'พระนคร', 'กรุงเทพมหานคร'),
    row('500101', 'ศรีภูมิ', 'เมืองเชียงใหม่', 'เชียงใหม่'),
  ];
  const title = (over = {}) => ({
    houseNumber: '1',
    moo: '2',
    subDistrict: '100101',
    subDistrictName: 'พระบรมมหาราชวัง',
    districtName: 'พระนคร',
    provinceName: 'กรุงเทพมหานคร',
    ...over,
  });

  it('finds the row by names, whatever the code', () => {
    expect(
      resolveLocality(
        title({
          subDistrict: '500101',
          subDistrictName: 'ศรีภูมิ',
          districtName: 'เมืองเชียงใหม่',
          provinceName: 'เชียงใหม่',
        }),
        dopa,
      )?.subDistrictCode,
    ).toBe('500101');
  });

  it('never maps a code to a different place: the same code with other names finds nothing', () => {
    expect(
      resolveLocality(
        {
          subDistrict: '500101',
          subDistrictName: 'อื่น',
          districtName: 'อื่น',
          provinceName: 'อื่น',
        },
        dopa,
      ),
    ).toBeUndefined();
  });

  it('cannot place an address that has a code but no names', () => {
    expect(resolveLocality({ subDistrict: '500101' }, dopa)).toBeUndefined();
    expect(
      resolveLocality({ subDistrict: '500101', subDistrictName: 'ศรีภูมิ' }, dopa),
    ).toBeUndefined();
  });

  it('finds the place by name when the deed code is not a DOPA code', () => {
    const found = resolveLocality(title({ subDistrict: '990001' }), dopa);
    expect(found?.subDistrictCode).toBe('100101');
  });

  it('ignores the administrative prefix and padding in names', () => {
    const found = resolveLocality(
      title({
        subDistrict: '',
        subDistrictName: ' แขวงพระบรมมหาราชวัง',
        districtName: 'เขตพระนคร',
      }),
      dopa,
    );
    expect(found?.subDistrictCode).toBe('100101');
  });

  it('accepts rows with the same names when they share one sub-district code (one row per postcode)', () => {
    const perPostcode = [
      { ...row('100101', 'บางนา', 'บางนา', 'กรุงเทพมหานคร'), postcode: '10260' },
      { ...row('100101', 'บางนา', 'บางนา', 'กรุงเทพมหานคร'), postcode: '10261' },
    ];
    const address = {
      subDistrict: '999999', // another master's code
      subDistrictName: 'บางนา',
      districtName: 'บางนา',
      provinceName: 'กรุงเทพมหานคร',
    };
    expect(resolveLocality(address, perPostcode)?.subDistrictCode).toBe('100101');
    expect(resolveLocality({ ...address, postcode: '10261' }, perPostcode)?.postcode).toBe('10261');
  });

  describe('when no row agrees on the district (it was redrawn)', () => {
    // Title master: หนองบอน, พระโขนง. DOPA has the sub-district under ประเวศ now.
    const moved = {
      subDistrict: '100907',
      subDistrictName: 'หนองบอน',
      districtName: 'พระโขนง',
      provinceName: 'กรุงเทพมหานคร',
    };
    const dopaRows = [
      row('103202', 'หนองบอน', 'ประเวศ', 'กรุงเทพมหานคร'),
      row('500101', 'หนองบอน', 'เมืองเชียงใหม่', 'เชียงใหม่'),
      row('100101', 'พระบรมมหาราชวัง', 'พระนคร', 'กรุงเทพมหานคร'),
    ];

    it('takes the one row with that sub-district in that province, and tells which district it has', () => {
      const found = resolveLocality(moved, dopaRows);
      expect(found?.subDistrictCode).toBe('103202');
      expect(districtOnlyInRecord(moved, found)).toBe('ประเวศ');
    });

    it('is not a district difference when the match was exact', () => {
      const exact = { ...moved, districtName: 'ประเวศ' };
      expect(districtOnlyInRecord(exact, resolveLocality(exact, dopaRows))).toBeNull();
      expect(districtOnlyInRecord(moved, undefined)).toBeNull();
    });

    it('prefers an exact match over the fallback', () => {
      const withBoth = [...dopaRows, row('100907', 'หนองบอน', 'พระโขนง', 'กรุงเทพมหานคร')];
      expect(resolveLocality(moved, withBoth)?.subDistrictCode).toBe('100907');
    });

    it('takes nothing when the province has the sub-district under several districts', () => {
      const ambiguous = [...dopaRows, row('103299', 'หนองบอน', 'บางนา', 'กรุงเทพมหานคร')];
      expect(resolveLocality(moved, ambiguous)).toBeUndefined();
    });

    it('never matches the sub-district name alone, across provinces', () => {
      const elsewhere = [row('500101', 'หนองบอน', 'เมืองเชียงใหม่', 'เชียงใหม่')];
      expect(resolveLocality(moved, elsewhere)).toBeUndefined();
    });

    it('accepts rows of one place that differ only by postcode', () => {
      const perPostcode = [
        { ...row('103202', 'หนองบอน', 'ประเวศ', 'กรุงเทพมหานคร'), postcode: '10250' },
        { ...row('103202', 'หนองบอน', 'ประเวศ', 'กรุงเทพมหานคร'), postcode: '10260' },
      ];
      expect(resolveLocality({ ...moved, postcode: '10260' }, perPostcode)?.postcode).toBe('10260');
    });
  });

  it('does not guess between two rows with the same names', () => {
    const twins = [
      row('100101', 'บางนา', 'บางนา', 'กรุงเทพมหานคร'),
      row('100999', 'บางนา', 'บางนา', 'กรุงเทพมหานคร'),
    ];
    const ambiguous = {
      subDistrict: '',
      subDistrictName: 'บางนา',
      districtName: 'บางนา',
      provinceName: 'กรุงเทพมหานคร',
    };
    expect(resolveLocality(ambiguous, twins)).toBeUndefined();
    expect(resolveLocality({ ...ambiguous, subDistrict: '100999' }, twins)?.subDistrictCode).toBe(
      '100999',
    );
  });

  it('finds nothing for a code and names DOPA lacks', () => {
    expect(
      resolveLocality(
        { subDistrict: '990101', subDistrictName: 'x', districtName: 'y', provinceName: 'z' },
        dopa,
      ),
    ).toBeUndefined();
    expect(resolveLocality({}, dopa)).toBeUndefined();
  });
});

describe("move to a place within the title's own table", () => {
  // E1 M1 E2 E3 M2 E4
  const titles = ['01', '10', '01', '01', '10', '01'].map(collateralType => ({ collateralType }));

  it('ranks a title among its own table, and counts the table', () => {
    expect(rankInGroup(titles, 3)).toBe(3);
    expect(rankInGroup(titles, 4)).toBe(2);
    expect(groupSize(titles, 0)).toBe(4);
    expect(groupSize(titles, 1)).toBe(2);
  });

  it('maps a place in the table to the slot that place holds now', () => {
    expect(slotInGroup(titles, 5, 1)).toBe(0); // E4 to the first estate place: where E1 is
    expect(slotInGroup(titles, 0, 4)).toBe(5); // E1 to the last estate place: where E4 is
    expect(slotInGroup(titles, 1, 2)).toBe(4); // M1 to the last movable place
  });

  it('clamps to the table, never into the other one', () => {
    expect(slotInGroup(titles, 0, 99)).toBe(5);
    expect(slotInGroup(titles, 4, 99)).toBe(4);
    expect(slotInGroup(titles, 4, 0)).toBe(1);
  });

  it('yields the order the user typed for that table', () => {
    const named = ['E1', 'M1', 'E2', 'E3', 'M2', 'E4'].map(name => ({
      name,
      collateralType: name.startsWith('M') ? '10' : '01',
    }));
    const moved = arrayMove(named, 3, slotInGroup(named, 3, 1)); // E3 to place 1 of 4
    expect(moved.filter(x => x.name.startsWith('E')).map(x => x.name)).toEqual([
      'E3',
      'E1',
      'E2',
      'E4',
    ]);
    expect(moved.filter(x => x.name.startsWith('M')).map(x => x.name)).toEqual(['M1', 'M2']);
  });
});

describe("DOPA address from the title document's", () => {
  const title = {
    houseNumber: '9',
    projectName: 'P',
    moo: '2',
    soi: 'S',
    road: 'R',
    subDistrict: '990101',
    subDistrictName: 'deed-only',
    district: '9901',
    province: '99',
    postcode: '99999',
  };
  const row = {
    subDistrictCode: '100101',
    subDistrictName: 'บางกะปิ',
    districtCode: '1001',
    districtName: 'ห้วยขวาง',
    provinceCode: '10',
    provinceName: 'กรุงเทพ',
    postcode: '10310',
  };

  it('takes the typed fields from the title and the locality from the DOPA row', () => {
    expect(addressWithLocality(title, row)).toEqual({
      houseNumber: '9',
      projectName: 'P',
      moo: '2',
      soi: 'S',
      road: 'R',
      subDistrict: '100101',
      subDistrictName: 'บางกะปิ',
      district: '1001',
      districtName: 'ห้วยขวาง',
      province: '10',
      provinceName: 'กรุงเทพ',
      postcode: '10310',
    });
  });

  it('leaves the whole locality empty, and never the title code, when DOPA has no row', () => {
    const copy = addressWithLocality(title, undefined);
    expect(copy.road).toBe('R');
    expect(copy.subDistrict).toBe('');
    expect(copy.postcode).toBe('');
    expect(JSON.stringify(copy)).not.toContain('990101');
    expect(JSON.stringify(copy)).not.toContain('99999');
  });

  it('writes the locality fields as the location selector does', () => {
    expect(Object.keys(localityOf(row))).toEqual([
      'subDistrict',
      'subDistrictName',
      'district',
      'districtName',
      'province',
      'provinceName',
      'postcode',
    ]);
    expect(localityOf(undefined).subDistrict).toBe('');
  });
});

describe('withPlaceNames', () => {
  const found = {
    subDistrictCode: '100101',
    subDistrictName: 'พระบรมมหาราชวัง',
    districtCode: '1001',
    districtName: 'พระนคร',
    provinceCode: '10',
    provinceName: 'กรุงเทพมหานคร',
    postcode: '10200',
  };

  it('lets a search by district or province find a title that only holds the code', () => {
    const title = make({ titleAddress: { ...make().titleAddress, subDistrict: '100101' } });
    expect(matchesTitleFilter(title, { query: 'พระนคร', chip: 'all' }, true)).toBe(false);
    const named = withPlaceNames(title, code => (code === '100101' ? found : undefined));
    expect(matchesTitleFilter(named, { query: 'พระนคร', chip: 'all' }, true)).toBe(true);
  });

  it('leaves a title with its own names, or an unknown code, as it is', () => {
    const own = make({
      titleAddress: {
        ...make().titleAddress,
        subDistrict: '100101',
        subDistrictName: 'a',
        districtName: 'b',
        provinceName: 'c',
      },
    });
    expect(withPlaceNames(own, () => found)).toBe(own);
    const unknown = make({ titleAddress: { ...make().titleAddress, subDistrict: '1' } });
    expect(withPlaceNames(unknown, () => undefined)).toBe(unknown);
  });
});

describe('the order of the "still missing" list follows the editor, top to bottom', () => {
  const blank = (over: Partial<RequestTitleDtoType>) => make({ ...over });

  it('reads deed, area, owner, notes, then the title address, then DOPA', () => {
    const missing = missingFieldPaths(
      blank({ collateralType: '01', titleType: 'DEED', notes: '' }),
    );
    const at = (path: string) => missing.indexOf(path);
    for (const path of [
      'titleNumber',
      'areaSquareWa',
      'ownerName',
      'notes',
      'titleAddress.subDistrict',
      'dopaAddress.subDistrict',
    ])
      expect(at(path), path).toBeGreaterThanOrEqual(0);
    const order = [
      'titleNumber',
      'areaSquareWa',
      'ownerName',
      'notes',
      'titleAddress.subDistrict',
      'dopaAddress.subDistrict',
    ].map(at);
    expect(order).toEqual([...order].sort((x, y) => x - y));
    // every address field comes after every non-address field
    const firstAddress = missing.findIndex(path => path.includes('Address.'));
    expect(missing.slice(0, firstAddress).some(path => path.includes('Address.'))).toBe(false);
    expect(missing.slice(firstAddress).some(path => !path.includes('Address.'))).toBe(false);
  });

  it("reads each address in the address form's own field order: house number first, then the locality", () => {
    const tooLong = 'x'.repeat(11); // the house number holds 10 characters
    const missing = missingFieldPaths(
      blank({
        collateralType: '01',
        titleType: 'DEED',
        titleAddress: {
          ...requestTitleDefault.titleAddress,
          houseNumber: tooLong,
          subDistrict: '',
        },
        dopaAddress: { ...requestTitleDefault.dopaAddress, houseNumber: tooLong, subDistrict: '' },
      }),
    );
    expect(missing.filter(path => path.includes('Address.'))).toEqual([
      'titleAddress.houseNumber',
      'titleAddress.subDistrict',
      'dopaAddress.houseNumber',
      'dopaAddress.subDistrict',
    ]);
  });

  it('puts a condominium unit fields before its owner and notes', () => {
    const missing = missingFieldPaths(blank({ collateralType: '08', titleType: 'DEED' }));
    const at = (path: string) => missing.indexOf(path);
    expect(at('titleNumber')).toBeLessThan(at('roomNumber'));
    expect(at('roomNumber')).toBeLessThan(at('condoName'));
    expect(at('usableArea')).toBeLessThan(at('ownerName'));
    expect(at('ownerName')).toBeLessThan(at('notes'));
    expect(at('notes')).toBeLessThan(at('titleAddress.subDistrict'));
  });
});

describe('the title number length the save schema accepts', () => {
  const complete = (over: Partial<RequestTitleDtoType>) =>
    make({
      titleType: 'DEED',
      notes: 'n',
      ownerName: 'o',
      condoName: 'c',
      roomNumber: '1',
      floorNumber: '1',
      buildingNumber: 'B',
      condoRegistrationNumber: '7',
      usableArea: 35,
      areaSquareWa: 10,
      titleAddress: {
        ...requestTitleDefault.titleAddress,
        houseNumber: '1',
        subDistrict: '1',
        district: '1',
        province: '1',
      },
      dopaAddress: {
        ...requestTitleDefault.dopaAddress,
        houseNumber: '1',
        subDistrict: '1',
        district: '1',
        province: '1',
      },
      ...over,
    });
  const text = (n: number) => 'x'.repeat(n);

  it('holds a land title number to 200 characters, the appraisal column', () => {
    for (const code of ['01', '02']) {
      expect(
        missingFieldPaths(complete({ collateralType: code, titleNumber: text(200) })),
      ).not.toContain('titleNumber');
      expect(
        missingFieldPaths(complete({ collateralType: code, titleNumber: text(201) })),
      ).toContain('titleNumber');
    }
  });

  it("takes a condominium's list up to 500 characters", () => {
    expect(
      missingFieldPaths(complete({ collateralType: '08', titleNumber: text(500) })),
    ).not.toContain('titleNumber');
    expect(
      missingFieldPaths(complete({ collateralType: '28', titleNumber: text(250) })),
    ).not.toContain('titleNumber');
    expect(missingFieldPaths(complete({ collateralType: '08', titleNumber: text(501) }))).toContain(
      'titleNumber',
    );
  });
});

describe("a condominium's land title numbers", () => {
  it('splits on commas, semicolons, spaces and new lines, and keeps order', () => {
    expect(splitLandTitleNumbers('1234,1235;1236\n1237\t1238  1239')).toEqual([
      '1234',
      '1235',
      '1236',
      '1237',
      '1238',
      '1239',
    ]);
    expect(splitLandTitleNumbers(null)).toEqual([]);
    expect(splitLandTitleNumbers(' , ; ')).toEqual([]);
  });

  it('takes the numbers and ranges out of the text and ignores the rest', () => {
    expect(splitLandTitleNumbers('โฉนด 1234, 1235')).toEqual(['1234', '1235']);
    expect(splitLandTitleNumbers('เลขที่ 12/3 และ 45')).toEqual(['12', '3', '45']);
    expect(splitLandTitleNumbers('ก, ข')).toEqual([]);
  });

  it('reads Thai numerals as the digits they are', () => {
    expect(splitLandTitleNumbers('๑๒๓๔๕, ๑๒๓๔๖')).toEqual(['12345', '12346']);
    expect(normaliseLandTitleNumbers('๑๒๓๔ - ๑๒๓๖, 5')).toBe('1234-1236,5');
    expect(summariseTitleNumber('๑๒๓๔๕, ๑๒๓๔๖')).toEqual({ first: '12345', rest: 1, count: 2 });
    // mixed with Arabic digits, and the repeat across scripts is dropped
    expect(normaliseLandTitleNumbers('๑๒ 12 ๓')).toBe('12,3');
  });

  it('does not leave a stray hyphen from a chain of ranges', () => {
    expect(splitLandTitleNumbers('10 - 12 - 14')).toEqual(['10-12', '14']);
    expect(normaliseLandTitleNumbers('10 - 12 - 14')).toBe('10-12,14');
    expect(splitLandTitleNumbers('5 - , 7 -')).toEqual(['5', '7']);
  });

  it('keeps a range as one entry, however it is spaced', () => {
    expect(splitLandTitleNumbers('1236-1250, 1300 - 1310 ,1320–1330')).toEqual([
      '1236-1250',
      '1300-1310',
      '1320-1330',
    ]);
  });

  it('drops exact repeats and keeps the first place', () => {
    expect(normaliseLandTitleNumbers('5, 3, 5; 4 3')).toBe('5,3,4');
    expect(normaliseLandTitleNumbers('1236-1250, 1236')).toBe('1236-1250,1236');
  });

  it('is idempotent, and gives an empty string for nothing', () => {
    const once = normaliseLandTitleNumbers('1,  2\n 1;3');
    expect(normaliseLandTitleNumbers(once)).toBe(once);
    expect(normaliseLandTitleNumbers(undefined)).toBe('');
  });

  it('counts a range as b-a+1 when b is not below a, anything else as one', () => {
    expect(parcelsIn('1236-1250')).toBe(15);
    expect(parcelsIn('7-7')).toBe(1);
    expect(parcelsIn('1250-1236')).toBe(1);
    expect(parcelsIn('12/1')).toBe(1);
    expect(parcelsIn('ฉ-12')).toBe(1);
  });

  it('summarises as the first entry, how many entries follow, and the parcels in all', () => {
    expect(summariseTitleNumber('1234, 1235, 1236-1240')).toEqual({
      first: '1234',
      rest: 2,
      count: 7,
    });
    expect(summariseTitleNumber('9')).toEqual({ first: '9', rest: 0, count: 1 });
    expect(summariseTitleNumber('')).toEqual({ first: '', rest: 0, count: 0 });
  });

  it('sorts a condominium by the first of its land titles', () => {
    const condo = (n: string) => make({ collateralType: '08', titleNumber: n });
    const sorted = sortEstateByNumber([condo('20, 3'), condo('4, 100'), condo('3, 9')]);
    expect(sorted.map(title => title.titleNumber)).toEqual(
      ['20, 3', '4, 100', '3, 9'].sort((a, b) => Number(a.split(',')[0]) - Number(b.split(',')[0])),
    );
  });
});
