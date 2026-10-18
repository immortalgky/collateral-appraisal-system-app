import { toSquareWa } from '@/shared/utils/landArea';
import {
  POSITION_ORDER,
  TITLE_SCREEN_ORDER,
} from '@/features/appraisal/components/titleScreenOrder';
import { MACHINE_CODE, VEHICLE_CODE, VESSEL_CODE, mapCollateral } from '../data/mapCollateral';
import { RequestTitleDto, requestTitleDefault, type RequestTitleDtoType } from '../schemas/form';

/**
 * Pure helpers behind the request page's title list: which table a title belongs to, what it still
 * lacks, the search / filter, the order, and the totals. No React, so each rule is tested on its own.
 */

// --- Families ------------------------------------------------------------------------------

/** CollateralType codes by the form each one opens (the 33-code parameter set). */
export const LAND_ONLY_CODES = ['01', '13', '14', '17', '19', '21', '26', '27', '29'];
export const LAND_AND_BUILDING_CODES = ['02', '03', '04', '09', '23', '24', '25', '30', '31', '32'];
export const BUILDING_ONLY_CODES = ['05', '06', '07', '15', '16', '18', '20', '22'];
export const CONDO_FORM_CODES = ['08', '28', '33'];

export type TitleFamily =
  | 'land'
  | 'landBuilding'
  | 'building'
  | 'condo'
  | 'vehicle'
  | 'machine'
  | 'vessel'
  | 'none';

export const titleFamily = (code: string | null | undefined): TitleFamily => {
  if (!code) return 'none';
  if (LAND_ONLY_CODES.includes(code)) return 'land';
  if (LAND_AND_BUILDING_CODES.includes(code)) return 'landBuilding';
  if (BUILDING_ONLY_CODES.includes(code)) return 'building';
  if (CONDO_FORM_CODES.includes(code)) return 'condo';
  if (code === VEHICLE_CODE) return 'vehicle';
  if (code === MACHINE_CODE) return 'machine';
  if (code === VESSEL_CODE) return 'vessel';
  return 'none';
};

export const isMovableFamily = (family: TitleFamily) =>
  family === 'vehicle' || family === 'machine' || family === 'vessel';

/** Land and land-with-building carry a deed, an area in rai-ngan-wa and the position fields. */
export const isLandFamily = (family: TitleFamily) => family === 'land' || family === 'landBuilding';

type TitleLike = Partial<Pick<RequestTitleDtoType, 'collateralType'>>;

export const isMovableTitle = (title: TitleLike) =>
  isMovableFamily(titleFamily(title.collateralType));

/** Indices into the `titles` array, split into the two tables. Untyped titles sit with the estate. */
export function splitByGroup(titles: readonly TitleLike[]) {
  const estate: number[] = [];
  const movable: number[] = [];
  titles.forEach((title, index) => (isMovableTitle(title) ? movable : estate).push(index));
  return { estate, movable };
}

/** A title newly added with this code starts as a โฉนด wherever a deed applies, like the land page. */
export const defaultTitleType = (code: string) => {
  const family = titleFamily(code);
  return isLandFamily(family) || family === 'condo' ? 'DEED' : '';
};

/**
 * What an empty title of this type looks like. Deep-copied: the default holds the two address
 * objects, and a shared one would let editing a title reach every other one added from it.
 */
export const newTitle = (code: string): RequestTitleDtoType => ({
  ...structuredClone(requestTitleDefault),
  collateralType: code,
  titleType: defaultTitleType(code),
});

/**
 * One code per family, the way a clerk thinks of a title: land, land with building, building,
 * condo, a lease, then the movables. Every other code is reachable from the type dropdown.
 */
export const ADD_CODES = ['01', '02', '05', '08', '29', '10', '11', '12'] as const;

/** The codes of {@link ADD_CODES} the request's property types allow (all of them when `allowed` is null). */
export const addableCodes = (allowed: ReadonlySet<string> | null) =>
  ADD_CODES.filter(code => !allowed || allowed.has(code));

/**
 * Collateral codes the request's property types allow, or null when everything is allowed. The
 * same rule the collateral-type dropdown applies (`dynamic-array` filter over `mapCollateral`).
 */
export function allowedCollateralCodes(
  properties: readonly { propertyType?: string | null }[] | undefined,
): Set<string> | null {
  if (!properties?.length) return null;
  const allowed = new Set<string>();
  for (const property of properties) {
    const mapped = mapCollateral[property?.propertyType ?? ''] ?? mapCollateral['*'];
    if (!mapped) return null;
    mapped.forEach(code => allowed.add(code));
  }
  return allowed;
}

// --- What a title lacks --------------------------------------------------------------------

/**
 * What the editor shows, top to bottom, for each kind of title: the type, the deed (in the land
 * page's screen order), the owner and notes, the kind's own block, and last the two addresses (the
 * title's, then DOPA's). A movable lists its own block in the order of its field config, after the
 * type, and the addresses trail. The "still missing" list is read in this order.
 */
const LAND_FORM_ORDER = [
  'collateralType',
  'titleType',
  ...TITLE_SCREEN_ORDER.slice(1).map(name =>
    name === 'rai'
      ? 'areaRai'
      : name === 'ngan'
        ? 'areaNgan'
        : name === 'squareWa'
          ? 'areaSquareWa'
          : name,
  ),
  'ownerName',
  'notes',
  'buildingType',
  'usableArea',
  'numberOfBuilding',
];
const FORM_ORDER: Record<TitleFamily, readonly string[]> = {
  land: LAND_FORM_ORDER,
  landBuilding: LAND_FORM_ORDER,
  building: ['collateralType', 'buildingType', 'usableArea', 'ownerName', 'numberOfBuilding'],
  condo: [
    'collateralType',
    'titleType',
    'titleNumber',
    'roomNumber',
    'floorNumber',
    'buildingNumber',
    'condoRegistrationNumber',
    'condoName',
    'usableArea',
    'ownerName',
    'notes',
  ],
  vehicle: [
    'collateralType',
    'vehicleType',
    'vehicleRegistrationNumber',
    'vin',
    'licensePlateNumber',
    'vehicleLocation',
  ],
  machine: [
    'collateralType',
    'machineType',
    'numberOfMachine',
    'installationStatus',
    'invoiceNumber',
    'registrationStatus',
    'registrationNumber',
  ],
  vessel: ['collateralType', 'vesselType', 'hin', 'vesselRegistrationNumber', 'vesselLocation'],
  none: ['collateralType'],
};

/**
 * Where a missing field sits in the editor: its place in the kind's order, then the title address
 * and then DOPA's, each in the address form's own field order.
 */
const formRank = (order: readonly string[], path: string) => {
  const section = path.startsWith('titleAddress.') ? 1 : path.startsWith('dopaAddress.') ? 2 : 0;
  const index =
    section === 0
      ? order.indexOf(path)
      : (ADDRESS_KEYS as readonly string[]).indexOf(path.split('.')[1] ?? '');
  return section * 1000 + (index === -1 ? 999 : index);
};

/**
 * The dotted form paths a title is still missing, in the order the editor shows its fields (see
 * `FORM_ORDER`). It reads the same schema that gates Save, so the list can never disagree with
 * `isTitleComplete`.
 */
export function missingFieldPaths(title: RequestTitleDtoType | undefined): string[] {
  if (!title) return [];
  const result = RequestTitleDto.safeParse(title);
  if (result.success) return [];
  const seen = new Set<string>();
  for (const issue of result.error.issues) seen.add(issue.path.join('.'));
  const order = FORM_ORDER[titleFamily(title.collateralType)];
  // Array.sort is stable: a field the order does not list keeps the order the schema reported
  return [...seen].sort((a, b) => formRank(order, a) - formRank(order, b));
}

export const isTitleComplete = (title: RequestTitleDtoType | undefined) =>
  !!title && RequestTitleDto.safeParse(title).success;

// --- Display values ------------------------------------------------------------------------

/** Where a title sits on the paper, in the order of the land page's form view. */
export const POSITION_FIELDS = POSITION_ORDER;

const has = (value: unknown) => value != null && String(value).trim() !== '';

/** The position fields this title has a value for, so a row shows chips for what it has. */
export const positionEntries = (title: RequestTitleDtoType) =>
  POSITION_FIELDS.filter(name => has(title[name])).map(
    name => [name, String(title[name])] as const,
  );

/** Always from rai / ngan / wa, never a stored total. */
export const totalSquareWa = (title: {
  areaRai?: unknown;
  areaNgan?: unknown;
  areaSquareWa?: unknown;
}) => toSquareWa(title.areaRai, title.areaNgan, title.areaSquareWa);

const trimZeros = (n: number) => String(Number(n.toFixed(2)));

/** 1-2-50 style rai-ngan-wa from a total in square wa. */
export function formatRaiNganWa(totalWa: number) {
  const rai = Math.floor(totalWa / 400);
  const ngan = Math.floor((totalWa % 400) / 100);
  return `${rai}-${ngan}-${trimZeros(totalWa % 100)}`;
}

/** Parcels and area over the land titles at `indices`; condo and building rows have no land. */
export function estateTotals(titles: readonly RequestTitleDtoType[], indices: readonly number[]) {
  let parcels = 0;
  let totalWa = 0;
  for (const index of indices) {
    const title = titles[index];
    if (!title || !isLandFamily(titleFamily(title.collateralType))) continue;
    parcels++;
    totalWa += totalSquareWa(title);
  }
  return { parcels, totalWa };
}

/** What identifies a movable: its plate, registration or hull number. */
export function movableIdentity(title: RequestTitleDtoType): string {
  switch (titleFamily(title.collateralType)) {
    case 'vehicle':
      return title.licensePlateNumber || title.vehicleRegistrationNumber || '';
    case 'machine':
      return title.registrationStatus ? (title.registrationNumber ?? '') : '';
    case 'vessel':
      return title.vesselRegistrationNumber || title.hin || '';
    default:
      return '';
  }
}

// --- Search and filter ---------------------------------------------------------------------

export type TitleChip = 'all' | 'incomplete' | Exclude<TitleFamily, 'none'>;

export interface TitleFilter {
  query: string;
  chip: TitleChip;
}

export const NO_FILTER: TitleFilter = { query: '', chip: 'all' };

export const hasActiveFilter = (filter: TitleFilter) =>
  filter.query.trim() !== '' || filter.chip !== 'all';

const normalise = (value: unknown) => String(value ?? '').toLocaleLowerCase();

/** Where a title's place is read from: a movable has no title document, so only its DOPA address. */
export const placeAddress = (title: RequestTitleDtoType) =>
  isMovableTitle(title) ? title.dopaAddress : title.titleAddress;

/** The text a search runs over: number, holder and place (plus a movable's own identifiers). */
function searchText(title: RequestTitleDtoType) {
  const address = placeAddress(title) ?? {};
  return normalise(
    [
      title.titleNumber,
      title.ownerName,
      title.condoName,
      movableIdentity(title),
      title.vin,
      address.subDistrictName,
      address.districtName,
      address.provinceName,
    ]
      .filter(has)
      .join(' '),
  );
}

/**
 * `title` with the names of its title-deed place filled in from the master when it holds a code
 * but no names, as a title loaded from the server does until it is opened. So that a search by
 * district or province finds it.
 */
export function withPlaceNames(
  title: RequestTitleDtoType,
  find: (subDistrictCode: string) => LocalityRecord | undefined,
): RequestTitleDtoType {
  const address = title.titleAddress;
  if (
    !address?.subDistrict ||
    (address.subDistrictName && address.districtName && address.provinceName)
  )
    return title;
  const found = find(address.subDistrict);
  if (!found) return title;
  return {
    ...title,
    titleAddress: {
      ...address,
      subDistrictName: address.subDistrictName || found.subDistrictName,
      districtName: address.districtName || found.districtName,
      provinceName: address.provinceName || found.provinceName,
    },
  };
}

/** Every word typed must appear somewhere in the title; the chip then narrows by family or status. */
export function matchesTitleFilter(
  title: RequestTitleDtoType,
  filter: TitleFilter,
  complete: boolean,
): boolean {
  if (filter.chip === 'incomplete' && complete) return false;
  if (
    filter.chip !== 'all' &&
    filter.chip !== 'incomplete' &&
    titleFamily(title.collateralType) !== filter.chip
  )
    return false;
  const words = normalise(filter.query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = searchText(title);
  return words.every(word => haystack.includes(word));
}

/** The indices (within `indices`' own order) that pass the filter. */
export function filterIndices(
  titles: readonly RequestTitleDtoType[],
  indices: readonly number[],
  filter: TitleFilter,
  completeness: readonly boolean[],
) {
  if (!hasActiveFilter(filter)) return [...indices];
  return indices.filter(index => matchesTitleFilter(titles[index], filter, completeness[index]));
}

// --- A condominium's land title numbers ----------------------------------------------------

/**
 * A condominium stands on many land parcels, so its `titleNumber` holds a list of title deed
 * numbers in one string (the column takes 500 characters). The entries are the numbers and the
 * ranges "a-b" found in the text, in order (Thai numerals read as Arabic digits, spaces around the
 * hyphen allowed, an en dash counts as one); an exact repeat is dropped, the first occurrence keeping
 * its place; any other text ("โฉนด", separators) is ignored. Joined by `normaliseLandTitleNumbers` with a bare comma.
 */
export function splitLandTitleNumbers(value: string | null | undefined): string[] {
  const seen = new Set<string>();
  const entries: string[] = [];
  // Thai numerals count as the digits they are: a list keyed in ๑๒๓๔ is 1234
  const text = String(value ?? '').replace(/[\u0E50-\u0E59]/g, digit =>
    String(digit.charCodeAt(0) - 0x0e50),
  );
  for (const match of text.matchAll(/\d+(?:\s*[-\u2013]\s*\d+)?/g)) {
    const entry = match[0].replace(/\s*[-\u2013]\s*/, '-');
    if (seen.has(entry)) continue;
    seen.add(entry);
    entries.push(entry);
  }
  return entries;
}

/** The list tidied: one entry each, joined with "," (no space: the column is 500 characters). */
export const normaliseLandTitleNumbers = (value: string | null | undefined) =>
  splitLandTitleNumbers(value).join(',');

/** How many parcels an entry stands for: "a-b" is b-a+1 when b is not below a, anything else is one. */
export function parcelsIn(entry: string): number {
  const range = /^(\d+)-(\d+)$/.exec(entry);
  if (!range) return 1;
  const [from, to] = [Number(range[1]), Number(range[2])];
  return to >= from && Number.isSafeInteger(to - from + 1) ? to - from + 1 : 1;
}

/** The first entry, how many more entries follow it, and the number of parcels in all of them. */
export function summariseTitleNumber(value: string | null | undefined) {
  const entries = splitLandTitleNumbers(value);
  return {
    first: entries[0] ?? '',
    rest: Math.max(entries.length - 1, 0),
    count: entries.reduce((sum, entry) => sum + parcelsIn(entry), 0),
  };
}

// --- Order ---------------------------------------------------------------------------------

/** Thai-aware, so "2" sorts before "10" and Thai prefixes (ก-ฮ) sort the way a clerk expects. */
export const compareTitleNumbers = new Intl.Collator('th', { numeric: true }).compare;

/**
 * The titles with the estate rows put in title-number order. The movables are left exactly where
 * they are: only the estate's slots are re-filled, so no movable changes position. Titles without a
 * number go last, because whichever is first is the one the other systems take.
 */
export function sortEstateByNumber<T extends TitleLike & { titleNumber?: string | null }>(
  titles: readonly T[],
): T[] {
  const slots: number[] = [];
  titles.forEach((title, index) => {
    if (!isMovableTitle(title)) slots.push(index);
  });
  const sorted = slots
    .map(index => titles[index])
    .sort((a, b) => {
      const [x, y] = [a, b].map(title =>
        has(title.titleNumber)
          ? // A condominium's number is a list of land titles: it sorts by the first of them.
            titleFamily(title.collateralType) === 'condo'
            ? (splitLandTitleNumbers(title.titleNumber)[0] ?? null)
            : String(title.titleNumber)
          : null,
      );
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      return compareTitleNumbers(x, y);
    });
  const result = [...titles];
  slots.forEach((slot, i) => {
    result[slot] = sorted[i];
  });
  return result;
}

export const isEstateSortedByNumber = (
  titles: readonly (TitleLike & { titleNumber?: string | null })[],
) => sortEstateByNumber(titles).every((title, i) => title === titles[i]);

/** A position typed as "move to #n" (1-based) as an index into a list of `count`, clamped to it. */
export const positionToIndex = (position: number, count: number) =>
  Math.min(Math.max(Math.trunc(position) || 1, 1), Math.max(count, 1)) - 1;

/** The array after RHF's `move(from, to)`: remove at `from`, insert at `to`. */
export function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  const result = [...list];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

/** The indices of the table `index` belongs to, in array order. */
const groupOf = (titles: readonly TitleLike[], index: number) => {
  const { estate, movable } = splitByGroup(titles);
  return estate.includes(index) ? estate : movable;
};

export type TitleTableKind = 'estate' | 'movable';

/**
 * Which table a title is in and its place there, counting from 1: the number the table shows, the
 * number "move to place n" takes, and the one to show wherever a title is named "#n".
 */
export function tableRank(
  titles: readonly TitleLike[],
  index: number,
): { group: TitleTableKind; rank: number } {
  const { estate, movable } = splitByGroup(titles);
  const inEstate = estate.includes(index);
  return {
    group: inEstate ? 'estate' : 'movable',
    rank: (inEstate ? estate : movable).indexOf(index) + 1,
  };
}

/** A title's place among the titles of its own table, 1-based. */
export const rankInGroup = (titles: readonly TitleLike[], index: number) =>
  tableRank(titles, index).rank;

/** Titles in the table `index` belongs to. */
export const groupSize = (titles: readonly TitleLike[], index: number) =>
  groupOf(titles, index).length;

/**
 * Where "move to place n" lands, as an index into the whole `titles` array: place n (1-based,
 * clamped) of the title's own table, mapped to the slot that place has now. Typing a place can
 * therefore never carry a title into the other table.
 */
export function slotInGroup(titles: readonly TitleLike[], index: number, position: number) {
  const group = groupOf(titles, index);
  return group[positionToIndex(position, group.length)];
}

/**
 * `current` (stable item ids) put in the order of `desired`: ids of `desired` that are gone are
 * skipped and repeated ones count once. An id `desired` does not know (added, duplicated or
 * re-created since) keeps its place next to whatever precedes it now, rather than being sent to the
 * end; one that was added at the very end stays at the end. Used to restore an order without
 * disturbing what changed meanwhile.
 */
export function orderByIds(current: readonly string[], desired: readonly string[]): string[] {
  const present = new Set(current);
  const result = desired.filter((id, i) => present.has(id) && desired.indexOf(id) === i);
  const known = new Set(result);
  const lastKnown = current.reduce((last, id, i) => (known.has(id) ? i : last), -1);
  current.forEach((id, i) => {
    if (known.has(id)) return;
    if (i > lastKnown) {
      result.push(id);
      return;
    }
    const before = i > 0 ? result.indexOf(current[i - 1]) : -1;
    result.splice(before + 1, 0, id);
  });
  return result;
}

// --- Addresses -----------------------------------------------------------------------------

export const ADDRESS_KEYS = [
  'houseNumber',
  'projectName',
  'moo',
  'soi',
  'road',
  'subDistrict',
  'subDistrictName',
  'district',
  'districtName',
  'province',
  'provinceName',
  'postcode',
] as const;

export type AddressValue = Partial<Record<(typeof ADDRESS_KEYS)[number], string | null>>;

export const clean = (value: unknown) => String(value ?? '').trim();

/** Equal as the form sees them: null, undefined and blank are the same, and so is stray padding. */
export const sameAddress = (a: AddressValue | undefined, b: AddressValue | undefined) =>
  ADDRESS_KEYS.every(key => clean(a?.[key]) === clean(b?.[key]));

export const addressHasValue = (address: AddressValue | undefined) =>
  ADDRESS_KEYS.some(key => clean(address?.[key]) !== '');

/** The twelve address fields of `source`, blanks as empty strings, ready to set on another address. */
export const copyAddress = (source: AddressValue | undefined): Record<string, string> =>
  Object.fromEntries(ADDRESS_KEYS.map(key => [key, source?.[key] ?? '']));

/** The address fields a person types, which read the same in the title and DOPA registers. */
export const FREE_TEXT_ADDRESS_KEYS = ['houseNumber', 'projectName', 'moo', 'soi', 'road'] as const;

/**
 * The locality: its codes come from a master list. The Title and DOPA masters have diverged (many
 * Title codes exist in no DOPA table), so a locality may only be copied from one to the other
 * through a lookup in the target master, never by copying the code.
 */
export const LOCALITY_ADDRESS_KEYS = [
  'subDistrict',
  'subDistrictName',
  'district',
  'districtName',
  'province',
  'provinceName',
  'postcode',
] as const;

/** A row of the address master (the shape of `ThaiAddress`). */
export interface LocalityRecord {
  subDistrictCode: string;
  subDistrictName: string;
  districtCode: string;
  districtName: string;
  provinceCode: string;
  provinceName: string;
  postcode: string;
}

/** The locality fields a DOPA master row fills in, as the location selector writes them. */
export const localityOf = (record: LocalityRecord | undefined): Record<string, string> => ({
  subDistrict: record?.subDistrictCode ?? '',
  subDistrictName: record?.subDistrictName ?? '',
  district: record?.districtCode ?? '',
  districtName: record?.districtName ?? '',
  province: record?.provinceCode ?? '',
  provinceName: record?.provinceName ?? '',
  postcode: record?.postcode ?? '',
});

/**
 * An address built from another one: its typed fields as they are, and the locality of `record`,
 * that address's place found in the target master (none found: empty, never the source's own code).
 * Used both ways: the DOPA address from the title document's, and the title document's from the
 * request's.
 */
export const addressWithLocality = (
  source: AddressValue | undefined,
  record: LocalityRecord | undefined,
): Record<string, string> => ({
  ...Object.fromEntries(FREE_TEXT_ADDRESS_KEYS.map(key => [key, source?.[key] ?? ''])),
  ...localityOf(record),
});

/** A locality name without the administrative prefix the two masters do or don't carry. */
export const localityName = (value: unknown) =>
  clean(value)
    .replace(/\s+/g, '')
    .replace(/^(แขวง|ตำบล|เขต|อำเภอ|จังหวัด)/, '');

/**
 * The master row for an address's locality, or none: the row whose sub-district, district and
 * province names all agree (administrative prefixes and padding ignored). Used to carry a locality
 * from one master to the other, which number the same place differently, so the code is never
 * copied: a code only breaks a tie between rows with identical names, and an address without names
 * cannot be placed at all (the same code may be another place in the other master). When no row
 * agrees on all three, the sub-district and province alone may name exactly one row (a district
 * that was redrawn); see `districtOnlyInRecord` for telling the caller the district differs.
 */
export function resolveLocality(
  address: AddressValue | undefined,
  rows: readonly LocalityRecord[],
): LocalityRecord | undefined {
  const names = [address?.subDistrictName, address?.districtName, address?.provinceName].map(
    localityName,
  );
  if (!names.every(Boolean)) return undefined;
  const named = rows.filter(
    row =>
      localityName(row.subDistrictName) === names[0] &&
      localityName(row.districtName) === names[1] &&
      localityName(row.provinceName) === names[2],
  );
  // One place can have a row per postcode: they agree on the sub-district, so the postcode picks.
  const pick = (found: LocalityRecord[]) =>
    found.every(row => row.subDistrictCode === found[0].subDistrictCode)
      ? (found.find(row => row.postcode === clean(address?.postcode)) ?? found[0])
      : undefined;
  if (named.length > 0) {
    if (named.every(row => row.subDistrictCode === named[0].subDistrictCode)) return pick(named);
    const code = clean(address?.subDistrict);
    return code ? named.find(row => row.subDistrictCode === code) : undefined;
  }
  // No exact match: districts get redrawn (the sub-district stays, under another district), so
  // fall back to the sub-district and province alone. Only when that names one place; never by
  // the sub-district name alone, and never across provinces. The caller says the district differs.
  return pick(
    rows.filter(
      row =>
        localityName(row.subDistrictName) === names[0] &&
        localityName(row.provinceName) === names[2],
    ),
  );
}

/** The district `record` has when it is not the one `address` names (a fallback match), else null. */
export const districtOnlyInRecord = (
  address: AddressValue | undefined,
  record: LocalityRecord | undefined,
): string | null =>
  record && localityName(record.districtName) !== localityName(address?.districtName)
    ? record.districtName
    : null;
