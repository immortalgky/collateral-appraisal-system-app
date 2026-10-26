/**
 * The collateral sentences of the appraisal brief: the SAME text the appraisal-summary REPORT prints.
 *
 * The wording is Thai, hard-coded here exactly as in the C# report providers, and it MUST change with
 * them. Part order, separators, number formats and the "skip a blank part" rules mirror (backend repo,
 * Modules/Reporting/Reporting/Application/):
 *
 *  - landClause / landDescription      Providers/AppraisalSummaryLandBuildingDataProvider.cs  1091-1126
 *  - titleDeedNumberPrefix / Noun      Formatting/TitleDeedLabel.cs
 *  - formatLandBuilding / formatGps /  Formatting/ThaiAddressFormatter.cs (FormatLandBuilding, FormatGps,
 *    stated / isStated                 Stated, IsStated)
 *  - codedDisplay                      AppraisalSummaryLandBuildingDataProvider.cs  452-463 (SQL CASE for code 99)
 *  - buildingName / buildingLine /     AppraisalSummaryLandBuildingDataProvider.cs  1865-1895
 *    progressSuffix                    (BuildingDisplayName, BuildBuildingLine, ProgressSuffix 1852-1858)
 *  - developmentLine                   AppraisalSummaryLandBuildingDataProvider.cs  1830-1845 (BuildItemDesc)
 *  - governmentPriceText & friends     Formatting/GovernmentPriceTextBuilder.cs; callers at
 *                                      LandBuildingDataProvider 1617-1625 ("ตารางวาละ") and
 *                                      Providers/AppraisalSummaryCondoDataProvider.cs 240-247 ("ตารางเมตรละ")
 *  - condoClause / condoClauses        Providers/AppraisalSummaryCondoDataProvider.cs  268-338
 *  - machineLine / machineSections     Providers/AppraisalSummaryMachineDataProvider.cs  375-443
 *                                      (BuildMachineSections) and 446-478 (DescribeMachine)
 *  - projectDetails / projectAddress / Providers/AppraisalSummaryBlockDataProvider.cs  254-264, 276-277,
 *    codeListDisplay / thaiPartialDate 458-537 (BuildProjectDetails), 551-576; rows in
 *    / projectRows                     Templates/partials/summary-block-body.html (property list table)
 *
 * The sentences are Thai literals on purpose: they mirror the Thai report word for word and are not
 * translated. LABELS (row names, machine section headings) are not sentences and live in the locale
 * files; this module returns keys for them. Pure functions: no React, no i18n, no three.js. Inputs are plain interfaces named after the C# row
 * fields and every field is optional. Parameter-code -> label lookups are never done here: pass the
 * resolved text (see codedDisplay for the code-99 "other" rule) or a label callback.
 */

type Maybe<T> = T | null | undefined;

// string.IsNullOrWhiteSpace negated.
const hasText = (v: Maybe<string>): v is string => v != null && v.trim() !== '';

// ── number formats ───────────────────────────────────────────────────────────
// C# "#,##0.##", "N2", "N0" (decimal rounds half away from zero; ICU on the shortest decimal repr of
// the double does the same). Explicit options + 'en-US' keep the output independent of the browser locale.
const upTo2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const fixed2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fixed0 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const fmt = (n: number): string => upTo2.format(n);

// ── ThaiAddressFormatter ─────────────────────────────────────────────────────
const DASHES = '-–—−‐‑‒－﹣';
const DASH_ENDS = /^[-–—−‐‑‒－﹣]+|[-–—−‐‑‒－﹣]+$/g;
const isDashOrSpace = (c: string): boolean => DASHES.includes(c) || c.trim() === '';

/** The trimmed value, or null when blank or only dashes ("no value" placeholders). */
export function stated(value: Maybe<string>): string | null {
  const t = value?.trim();
  return !t || [...t].every(isDashOrSpace) ? null : t;
}

/**
 * Whether a free-text numeric field (a condo floor) was filled in: blank, dashes and a numeric zero
 * are not; non-numeric text ("G") is.
 */
export function isStated(value: Maybe<string>): boolean {
  const s = stated(value);
  if (s === null) return false;
  const core = s.replace(DASH_ENDS, '').trim();
  // ponytail: decimal.TryParse(NumberStyles.Any) also takes currency/exponent forms; plain numerics only here.
  return !/^[+-]?(\d[\d,]*\.?\d*|\.\d+)$/.test(core) || Number(core.replace(/,/g, '')) !== 0;
}

export interface AddressInput {
  houseNumber?: Maybe<string>;
  village?: Maybe<string>;
  moo?: Maybe<string>;
  soi?: Maybe<string>;
  road?: Maybe<string>;
  subDistrict?: Maybe<string>;
  district?: Maybe<string>;
  province?: Maybe<string>;
}

/** FormatLandBuilding: label + value per part, a blank part (and its label) drops out; no space after จังหวัด / ม. */
export function formatLandBuilding(a: AddressInput): string {
  const out: string[] = [];
  const add = (label: string | null, value: Maybe<string>, spaceAfterLabel = true) => {
    const s = stated(value);
    if (s === null) return;
    out.push(label ? `${label}${spaceAfterLabel ? ' ' : ''}${s}` : s);
  };
  add('เลขที่', a.houseNumber);
  add(null, a.village);
  add('ม.', a.moo, false);
  add('ซอย', a.soi);
  add('ถนน', a.road);
  add('ตำบล/แขวง', a.subDistrict);
  add('อำเภอ/เขต', a.district);
  add('จังหวัด', a.province, false);
  return out.join(' ');
}

/** FormatGps: "N 13.270399 E 100.948020" (hemisphere from the sign, absolute value, 6 decimals). */
export function formatGps(latitude: Maybe<number>, longitude: Maybe<number>): string | null {
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }
  return `${latitude >= 0 ? 'N' : 'S'} ${Math.abs(latitude).toFixed(6)} ${longitude >= 0 ? 'E' : 'W'} ${Math.abs(longitude).toFixed(6)}`;
}

// ── title deed label ────────────────────────────────────────────────────────
// The brief carries the report's own wording per title (titleTypeLabel, titleNumberPrefix, from the
// backend's TitleDeedLabel). Only an older API without them falls back to this generic form.
const GENERIC_NOUN = 'เอกสารสิทธิ์';
const GENERIC_PREFIX = `${GENERIC_NOUN}เลขที่`;

/** The document's name on its own ("โฉนดที่ดิน"). */
export const titleDeedNoun = (titleTypeLabel: Maybe<string>): string =>
  titleTypeLabel?.trim() || GENERIC_NOUN;
/** The name plus "เลขที่" ("น.ส.3 เลขที่"), as the brief gives it. */
export const titleDeedNumberPrefix = (titleNumberPrefix: Maybe<string>): string =>
  titleNumberPrefix?.trim() || GENERIC_PREFIX;

// ── land ─────────────────────────────────────────────────────────────────────
export interface LandTitleInput {
  /** The report's wording for this deed, from the brief: "โฉนดที่ดิน" and "โฉนดที่ดินเลขที่". */
  titleTypeLabel?: Maybe<string>;
  titleNumberPrefix?: Maybe<string>;
  titleNumber?: Maybe<string>;
  bookNumber?: Maybe<string>;
  pageNumber?: Maybe<string>;
  landParcelNumber?: Maybe<string>;
  surveyNumber?: Maybe<string>;
  rawang?: Maybe<string>;
  areaRai?: Maybe<number>;
  areaNgan?: Maybe<number>;
  areaSquareWa?: Maybe<number>;
  subDistrict?: Maybe<string>;
  district?: Maybe<string>;
  province?: Maybe<string>;
}

// BuildAreaString: every empty position shows 0, e.g. "9-2-41 ไร่".
const areaString = (rai: Maybe<number>, ngan: Maybe<number>, wa: Maybe<number>): string =>
  `${fmt(rai ?? 0)}-${fmt(ngan ?? 0)}-${fmt(wa ?? 0)} ไร่`;

/**
 * One title's clause: "โฉนดที่ดินเลขที่ 1234 เล่ม 5 หน้า 6 เลขที่ดิน 7 หน้าสำรวจ 8 ระวาง 9 เนื้อที่ 1-2-3 ไร่
 * ตำบล/แขวง … อำเภอ/เขต … จังหวัด…". Title parts skip only blank text (a "-" still prints, as in the report);
 * the area part always prints.
 */
export function landClause(t: LandTitleInput): string {
  const parts: string[] = [];
  if (hasText(t.titleNumber))
    parts.push(`${titleDeedNumberPrefix(t.titleNumberPrefix)} ${t.titleNumber}`);
  if (hasText(t.bookNumber)) parts.push(`เล่ม ${t.bookNumber}`);
  if (hasText(t.pageNumber)) parts.push(`หน้า ${t.pageNumber}`);
  if (hasText(t.landParcelNumber)) parts.push(`เลขที่ดิน ${t.landParcelNumber}`);
  if (hasText(t.surveyNumber)) parts.push(`หน้าสำรวจ ${t.surveyNumber}`);
  if (hasText(t.rawang)) parts.push(`ระวาง ${t.rawang}`);
  parts.push(`เนื้อที่ ${areaString(t.areaRai, t.areaNgan, t.areaSquareWa)}`);
  const tail = formatLandBuilding({
    subDistrict: t.subDistrict,
    district: t.district,
    province: t.province,
  });
  if (hasText(tail)) parts.push(tail);
  return parts.join(' ');
}

/** The land description of a group: every title's clause, space-joined; null with no titles. */
export function landDescription(titles: readonly LandTitleInput[]): string | null {
  return titles.length > 0 ? titles.map(landClause).join(' ') : null;
}

// ── buildings and development items ──────────────────────────────────────────
/**
 * BuildingTypeDisplay / BuildingConditionDisplay (SQL CASE): code 99 with a remark prints the remark;
 * otherwise the parameter label, else the remark, else the raw code. `label` is the resolved master
 * text for `code` (null when the master has none).
 */
export function codedDisplay(
  code: Maybe<string>,
  other: Maybe<string>,
  label: Maybe<string>,
): string | null {
  if (code === '99' && other) return other;
  // The environment's label lookup answers with the code itself, or a dash, for a code it has no row for: not a label.
  const known = label && label !== code && label !== '—' ? label : null;
  return known ?? other ?? code ?? null;
}

export interface BuildingInput {
  /** BuildingTypeDisplay: the type label, or for code 99 the appraiser's remark (see codedDisplay). */
  buildingTypeDisplay?: Maybe<string>;
  /** Free-text property name, the last-resort name. */
  propertyName?: Maybe<string>;
  numberOfFloors?: Maybe<number>;
  totalBuildingArea?: Maybe<number>;
  buildingAge?: Maybe<number>;
  /** BuildingConditionDisplay, already resolved. */
  buildingConditionDisplay?: Maybe<string>;
}

/** "(ยังไม่ก่อสร้าง)" / "(แล้วเสร็จ 47.07%)"; null when there is no inspection or the work is complete. */
export function progressSuffix(progressPct: Maybe<number>): string | null {
  if (progressPct == null) return null;
  if (progressPct <= 0) return '(ยังไม่ก่อสร้าง)';
  if (progressPct >= 100) return null;
  return `(แล้วเสร็จ ${fmt(progressPct)}%)`;
}

/** BuildingDisplayName: the type, else the property name; null when neither is filled in. */
export function buildingName(b: BuildingInput): string | null {
  const name = hasText(b.buildingTypeDisplay) ? b.buildingTypeDisplay : b.propertyName;
  return hasText(name) ? name.trim() : null;
}

/**
 * The split-row building line: name, "N ชั้น", "พื้นที่ใช้สอย N ตารางเมตร", "อายุอาคาร N ปี", "สภาพอาคาร…",
 * progress. No "พร้อม" and no เลขที่. A 0 floor count or age is "not stated" and skipped; a 0 area prints.
 */
export function buildingLine(b: BuildingInput, progressPct?: Maybe<number>): string | null {
  const parts: string[] = [];
  const name = buildingName(b);
  if (name !== null) parts.push(name);
  if (b.numberOfFloors != null && b.numberOfFloors !== 0)
    parts.push(`${fmt(b.numberOfFloors)} ชั้น`);
  if (b.totalBuildingArea != null)
    parts.push(`พื้นที่ใช้สอย ${fmt(b.totalBuildingArea)} ตารางเมตร`);
  if (b.buildingAge != null && b.buildingAge !== 0) parts.push(`อายุอาคาร ${b.buildingAge} ปี`);
  if (hasText(b.buildingConditionDisplay)) parts.push(`สภาพอาคาร${b.buildingConditionDisplay}`);
  const progress = progressSuffix(progressPct);
  if (progress !== null) parts.push(progress);
  return parts.length > 0 ? parts.join(' ') : null;
}

export interface DevelopmentInput {
  /** The appraiser's own label of the row. */
  areaDescription?: Maybe<string>;
  area?: Maybe<number>;
  /** Age in years (the C# column is called Year). */
  year?: Maybe<number>;
}

/**
 * One development item (BuildItemDesc): name, "พื้นที่ N ตารางเมตร", "อายุ N ปี", progress. `namePrefix` (the
 * owning building's name, for an enhancement-only property) replaces areaDescription as the name.
 */
export function developmentLine(
  d: DevelopmentInput,
  progressPct?: Maybe<number>,
  namePrefix?: Maybe<string>,
  areaLabel = 'พื้นที่',
): string | null {
  const parts: string[] = [];
  if (hasText(namePrefix)) parts.push(namePrefix.trim());
  else if (hasText(d.areaDescription)) parts.push(d.areaDescription.trim());
  if (d.area != null && d.area !== 0) parts.push(`${areaLabel} ${fmt(d.area)} ตารางเมตร`);
  if (d.year != null && d.year > 0) parts.push(`อายุ ${d.year} ปี`);
  const progress = progressSuffix(progressPct);
  if (progress !== null) parts.push(progress);
  return parts.length > 0 ? parts.join(' ') : null;
}

// ── government price (GovernmentPriceTextBuilder) ────────────────────────────
export interface GovernmentPriceItem {
  /** Its title / room number, used only when several segments are printed. */
  number?: Maybe<string>;
  price?: Maybe<number>;
  isMissingFromSurvey?: Maybe<boolean>;
  /** Position in the printed collateral list; omitted sorts last (relative order kept). */
  displayOrder?: Maybe<number>;
  /** Overrides the shared prefix for this item. */
  numberPrefix?: Maybe<string>;
}

const LAST = Number.MAX_SAFE_INTEGER;
const orderOf = (r: GovernmentPriceItem): number => r.displayOrder ?? LAST;
const byOrder = (a: GovernmentPriceItem, b: GovernmentPriceItem): number => orderOf(a) - orderOf(b);

// Describe: numbers grouped by prefix (first-seen order), "<prefix> n1 และ n2", groups joined by " และ ".
function describeSegment(
  rows: readonly GovernmentPriceItem[],
  value: string,
  sharedPrefix: string,
): string {
  const numbersByPrefix = new Map<string, string[]>();
  for (const row of rows) {
    if (!hasText(row.number)) continue;
    const prefix = hasText(row.numberPrefix) ? row.numberPrefix : sharedPrefix;
    const numbers = numbersByPrefix.get(prefix) ?? [];
    numbers.push(row.number);
    numbersByPrefix.set(prefix, numbers);
  }
  if (numbersByPrefix.size === 0) return value;
  const described = [...numbersByPrefix].map(
    ([prefix, numbers]) => `${prefix} ${numbers.join(' และ ')}`,
  );
  return `${described.join(' และ ')} ${value}`;
}

/**
 * Groups items by identical price and renders one line: a lone segment is just its value; several are
 * each prefixed with their numbers and joined by " , ". ตกสำรวจ beats price. Null when nothing to print.
 */
export function governmentPriceText(
  items: readonly GovernmentPriceItem[],
  numberPrefix: string,
  formatPrice: (price: number) => string,
): string | null {
  const missing = items.filter(r => r.isMissingFromSurvey).sort(byOrder);
  const byPrice = new Map<number, GovernmentPriceItem[]>();
  for (const r of items) {
    if (r.isMissingFromSurvey || r.price == null) continue;
    const same = byPrice.get(r.price);
    if (same) same.push(r);
    else byPrice.set(r.price, [r]);
  }
  const segments: { rows: GovernmentPriceItem[]; value: string }[] = [];
  if (missing.length > 0) segments.push({ rows: missing, value: 'ตกสำรวจ' });
  for (const [price, rows] of byPrice)
    segments.push({ rows: rows.sort(byOrder), value: formatPrice(price) });
  // A segment sits where its first item does (stable sort keeps ties in insertion order).
  const first = (s: { rows: GovernmentPriceItem[] }) => Math.min(...s.rows.map(orderOf));
  segments.sort((a, b) => first(a) - first(b));

  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0].value;
  return segments.map(s => describeSegment(s.rows, s.value, numberPrefix)).join(' , ');
}

export interface LandGovernmentPriceItem extends Omit<GovernmentPriceItem, 'numberPrefix'> {
  /** The deed's own prefix ("โฉนดที่ดินเลขที่"), from the brief. */
  titleNumberPrefix?: Maybe<string>;
}

/** Land: "ตารางวาละ 12,500.00 บาท"; each parcel carries its own deed noun. */
export const landGovernmentPriceText = (items: readonly LandGovernmentPriceItem[]): string | null =>
  governmentPriceText(
    items.map(r => ({ ...r, numberPrefix: titleDeedNumberPrefix(r.titleNumberPrefix) })),
    titleDeedNumberPrefix(null),
    p => `ตารางวาละ ${fixed2.format(p)} บาท`,
  );

/** Condo: "ตารางเมตรละ 85,000.00 บาท"; display order is the input order. */
export const condoGovernmentPriceText = (
  items: readonly Omit<GovernmentPriceItem, 'displayOrder' | 'numberPrefix'>[],
): string | null =>
  governmentPriceText(
    items.map((r, i) => ({ ...r, displayOrder: i })),
    'ห้องชุดเลขที่',
    p => `ตารางเมตรละ ${fixed2.format(p)} บาท`,
  );

// ── condo ────────────────────────────────────────────────────────────────────
export interface CondoAreaInput {
  areaDescription?: Maybe<string>;
  areaSize?: Maybe<number>;
}

export interface CondoUnitInput {
  roomNumber?: Maybe<string>;
  /** Free text, so "0" and dashes mean not stated. */
  floorNumber?: Maybe<string>;
  buildingNumber?: Maybe<string>;
  condoName?: Maybe<string>;
  condoRegistrationNumber?: Maybe<string>;
  builtOnTitleNumber?: Maybe<string>;
  subDistrict?: Maybe<string>;
  district?: Maybe<string>;
  province?: Maybe<string>;
  /** Area components (room, balcony, ...); when empty usableArea is the fallback. */
  areas?: Maybe<readonly CondoAreaInput[]>;
  usableArea?: Maybe<number>;
  numberOfFloors?: Maybe<number>;
  buildingAge?: Maybe<number>;
  /** BuildingConditionDisplay, already resolved. */
  buildingConditionDisplay?: Maybe<string>;
}

// HasHouseNumber / the building-number test: present and not only '-', '–', '—'.
const hasNumber = (v: Maybe<string>): v is string =>
  hasText(v) && v.trim().replace(/^[-–—]+|[-–—]+$/g, '') !== '';

/** One unit's clause; null when it has nothing to print. */
export function condoClause(c: CondoUnitInput): string | null {
  const parts: string[] = [];
  if (hasText(c.roomNumber)) parts.push(`ห้องชุดเลขที่ ${c.roomNumber}`);
  if (isStated(c.floorNumber)) parts.push(`ชั้นที่ ${c.floorNumber}`);
  if (hasNumber(c.buildingNumber)) parts.push(`อาคารเลขที่ ${c.buildingNumber}`);
  if (hasText(c.condoName)) parts.push(`ชื่ออาคารชุด ${c.condoName}`);
  if (hasText(c.condoRegistrationNumber))
    parts.push(`ทะเบียนอาคารชุดเลขที่ ${c.condoRegistrationNumber}`);
  if (hasText(c.builtOnTitleNumber)) parts.push(`ปลูกสร้างบนโฉนดเลขที่ ${c.builtOnTitleNumber}`);
  const tail = formatLandBuilding({
    subDistrict: c.subDistrict,
    district: c.district,
    province: c.province,
  });
  if (hasText(tail)) parts.push(tail);

  const areas = c.areas ?? [];
  if (areas.length > 0) {
    for (const a of areas) {
      if (a.areaSize == null || a.areaSize <= 0) continue;
      // The appraiser's label already reads as one ("พื้นที่ภายในห้องชุด"); only unlabelled rows need the word.
      const label = hasText(a.areaDescription) ? a.areaDescription.trim() : 'พื้นที่';
      parts.push(`${label} ${fmt(a.areaSize)} ตารางเมตร`);
    }
    const total = areas.reduce((sum, a) => sum + (a.areaSize ?? 0), 0);
    if (areas.length > 1 && total > 0) parts.push(`รวมพื้นที่ ${fmt(total)} ตารางเมตร`);
  } else if (c.usableArea != null && c.usableArea > 0) {
    parts.push(`พื้นที่ห้องชุด ${fmt(c.usableArea)} ตารางเมตร`);
  }

  if (c.numberOfFloors != null && c.numberOfFloors !== 0)
    parts.push(`อาคารสูง ${fmt(c.numberOfFloors)} ชั้น`);
  if (c.buildingAge != null && c.buildingAge !== 0) parts.push(`อายุอาคาร ${c.buildingAge} ปี`);
  if (hasText(c.buildingConditionDisplay)) parts.push(`สภาพอาคาร${c.buildingConditionDisplay}`);
  return parts.length > 0 ? parts.join(' ') : null;
}

/** A condo group's units, " | " between units (as the report's collateral-details cell); null when empty. */
export function condoClauses(units: readonly CondoUnitInput[]): string | null {
  const clauses = units.map(condoClause).filter((s): s is string => s !== null);
  return clauses.length > 0 ? clauses.join(' | ') : null;
}

// ── machinery ────────────────────────────────────────────────────────────────
export interface MachineInput {
  machineName?: Maybe<string>;
  brand?: Maybe<string>;
  model?: Maybe<string>;
  registrationNumber?: Maybe<string>;
  serialNumber?: Maybe<string>;
  yearOfManufacture?: Maybe<number>;
  /** MachineCondition, already resolved. */
  machineCondition?: Maybe<string>;
  /** The report's section for this machine, decided by the backend (registered, not registered, or under procurement). */
  section?: Maybe<MachineBucket>;
  /** Only an explicit false prints "(ไม่รับรองราคา)". */
  isPriceCertified?: Maybe<boolean>;
  /** ConditionUse code: '03' = surveyed but not found. */
  conditionUse?: Maybe<string>;
}

const NOT_FOUND_CONDITION = '03';

/** One machine as a single sentence; '' when nothing is recorded on it. */
export function machineLine(m: MachineInput): string {
  const parts: string[] = [];
  if (hasText(m.machineName)) parts.push(m.machineName);
  if (hasText(m.brand)) parts.push(`ยี่ห้อ ${m.brand}`);
  if (hasText(m.model)) parts.push(`รุ่น ${m.model}`);
  if (hasText(m.registrationNumber)) parts.push(`ทะเบียนเลขที่ ${m.registrationNumber}`);
  if (hasText(m.serialNumber)) parts.push(`หมายเลขเครื่อง ${m.serialNumber}`);
  if (m.yearOfManufacture != null) parts.push(`ปีที่ผลิต ${m.yearOfManufacture}`);
  if (hasText(m.machineCondition)) parts.push(`สภาพ${m.machineCondition}`);
  if (m.conditionUse === NOT_FOUND_CONDITION) parts.push('(สำรวจไม่พบ)');
  if (m.isPriceCertified === false) parts.push('(ไม่รับรองราคา)');
  return parts.join(' ');
}

/** The report's three machine sections; the headings are labels, so the caller takes them from the locale files. */
export type MachineBucket = 'registered' | 'notRegistered' | 'notInstalled';
/** The sections the report prints, in its order. */
export const MACHINE_BUCKETS: readonly MachineBucket[] = [
  'registered',
  'notRegistered',
  'notInstalled',
];

export interface MachineSection {
  section: MachineBucket;
  /** The described machines in input order; the caller numbers them from 1. */
  lines: string[];
}

/**
 * Groups machines by the section the backend assigned (registered / not registered / not yet
 * installed), in that order. A machine with nothing recorded prints no line and is not counted; an
 * empty section produces none.
 */
export function machineSections(machines: readonly MachineInput[]): MachineSection[] {
  const sections: MachineSection[] = [];
  for (const section of MACHINE_BUCKETS) {
    const lines = machines
      .filter(m => m.section === section)
      .map(machineLine)
      .filter(t => t.length > 0);
    if (lines.length > 0) sections.push({ section, lines });
  }
  return sections;
}

// ── project (summary-block-body.html, project-level rows) ────────────────────
export interface ProjectModelInput {
  modelName?: Maybe<string>;
  /** Building type label, already resolved. */
  buildingType?: Maybe<string>;
  numberOfFloors?: Maybe<number>;
  numberOfHouse?: Maybe<number>;
  startingPriceMin?: Maybe<number>;
  startingPriceMax?: Maybe<number>;
  usableAreaMin?: Maybe<number>;
  standardUsableArea?: Maybe<number>;
}

export interface ProjectInput extends AddressInput {
  developer?: Maybe<string>;
  /** "U" | "LB" | "L". */
  projectType?: Maybe<string>;
  landAreaRai?: Maybe<number>;
  landAreaNgan?: Maybe<number>;
  landAreaSquareWa?: Maybe<number>;
  unitForSaleCount?: Maybe<number>;
  /** Gregorian "YYYY" | "YYYY-MM" | "YYYY-MM-DD". */
  projectSaleLaunchDate?: Maybe<string>;
  /** PublicUtility codes. */
  utilities?: Maybe<readonly string[]>;
  utilitiesOther?: Maybe<string>;
  /** Facilities codes. */
  facilities?: Maybe<readonly string[]>;
  facilitiesOther?: Maybe<string>;
  latitude?: Maybe<number>;
  longitude?: Maybe<number>;
}

const THAI_MONTHS = [
  '',
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

// int.TryParse: optional surrounding whitespace and sign, digits only ("2024abc" fails, unlike parseInt).
const tryInt = (s: string | undefined): number | null =>
  s !== undefined && /^\s*[+-]?\d+\s*$/.test(s) ? Number(s) : null;

/** FormatThaiPartialDate: only the parts present, year converted to Buddhist era; null when unparseable. */
export function thaiPartialDate(raw: Maybe<string>): string | null {
  if (!hasText(raw)) return null;
  const parts = raw.trim().split('-');
  const year = tryInt(parts[0]);
  if (year === null) return null;
  const beYear = year + 543;
  const month = tryInt(parts[1]);
  const day = tryInt(parts[2]);
  const monthOk = month !== null && month >= 1 && month <= 12;
  if (parts.length >= 3 && monthOk && day !== null && day >= 1)
    return `${day} ${THAI_MONTHS[month]} ${beYear}`;
  if (parts.length >= 2 && monthOk) return `${THAI_MONTHS[month]} ${beYear}`;
  return String(beYear);
}

/** Project address: house number / soi / road / sub-district / district / province (no village or moo); null when blank. */
export function projectAddress(p: AddressInput): string | null {
  const text = formatLandBuilding({
    houseNumber: p.houseNumber,
    soi: p.soi,
    road: p.road,
    subDistrict: p.subDistrict,
    district: p.district,
    province: p.province,
  });
  return text === '' ? null : text;
}

/**
 * Codes -> labels joined by ", " (an unmapped code prints itself, blanks are dropped), then the
 * free-text "other" appended with ", ". Null when both are blank. `label` returns the master text or null.
 */
export function codeListDisplay(
  codes: Maybe<readonly string[]>,
  other: Maybe<string>,
  label: (code: string) => Maybe<string>,
): string | null {
  const decoded = (codes ?? [])
    .filter(hasText)
    .map(c => (hasText(label(c)) ? label(c) : c))
    .join(', ');
  const joined = [decoded.trim(), hasText(other) ? other.trim() : '']
    .filter(s => s !== '')
    .join(', ');
  return joined === '' ? null : joined;
}

/**
 * Project description (BuildProjectDetails): type, area, sale-unit count, model count, then one "\nN.) …" line
 * per model that has anything to say (N is the model's position in the list). The model price range is
 * part of the report line: leave startingPrice* out to print none.
 */
export function projectDetails(
  p: ProjectInput,
  models: readonly ProjectModelInput[] = [],
): string | null {
  const type = p.projectType?.trim().toUpperCase();
  let text =
    type === 'U'
      ? 'อาคารชุด'
      : type === 'LB'
        ? 'โครงการบ้านจัดสรร'
        : type === 'L'
          ? 'โครงการที่ดินจัดสรร'
          : 'โครงการ';

  if ((p.landAreaRai ?? 0) > 0 || (p.landAreaNgan ?? 0) > 0 || (p.landAreaSquareWa ?? 0) > 0) {
    text += ` พื้นที่โครงการประมาณ ${areaString(p.landAreaRai, p.landAreaNgan, p.landAreaSquareWa)}`;
  }
  if (p.unitForSaleCount != null && p.unitForSaleCount > 0)
    text += ` จำนวนแปลงขาย ${p.unitForSaleCount} ยูนิต/แปลง`;

  if (models.length > 0) {
    const unitWord = type === 'U' ? 'แบบห้องชุด' : 'แบบบ้าน';
    text += ` มี${unitWord} ${models.length} แบบ ได้แก่`;
    models.forEach((m, i) => {
      const parts: string[] = [];
      if (hasText(m.modelName)) parts.push(m.modelName);
      if (hasText(m.buildingType)) parts.push(m.buildingType);
      if (m.numberOfFloors != null && m.numberOfFloors > 0)
        parts.push(`${fmt(m.numberOfFloors)} ชั้น`);
      if (m.numberOfHouse != null && m.numberOfHouse > 0)
        parts.push(`จำนวน ${m.numberOfHouse} หลัง`);
      const area = m.standardUsableArea ?? m.usableAreaMin;
      if (area != null && area > 0) parts.push(`พื้นที่ใช้สอย ${fmt(area)} ตร.ม.`);
      const min = m.startingPriceMin;
      const max = m.startingPriceMax;
      if (min != null && min > 0) {
        parts.push(
          max != null && min !== max
            ? `ราคา ${fixed0.format(min)}–${fixed0.format(max)} บาท`
            : `ราคาเริ่มต้น ${fixed0.format(min)} บาท`,
        );
      }
      if (parts.length > 0) text += `\n${i + 1}.) ${parts.join(' ')}`;
    });
  }
  const result = text.trim();
  return result === '' ? null : result;
}

/** The project-level rows of the block report; the row names are labels, taken from the locale files. */
export type ProjectRowKey =
  | 'address'
  | 'developer'
  | 'details'
  | 'saleLaunch'
  | 'utilities'
  | 'facilities'
  | 'coordinates';

export interface SummaryRow {
  key: ProjectRowKey;
  /** Null: nothing to show (the report prints "-"). */
  value: string | null;
}

/**
 * The property-list rows of the block report that describe the project itself, in report order
 * (no appraised price, conditions, remarks or valuation method). `label` resolves PublicUtility / Facilities codes.
 */
export function projectRows(
  p: ProjectInput,
  models: readonly ProjectModelInput[],
  label: (group: 'PublicUtility' | 'Facilities', code: string) => Maybe<string>,
): SummaryRow[] {
  return [
    { key: 'address', value: projectAddress(p) },
    { key: 'developer', value: hasText(p.developer) ? p.developer : null },
    { key: 'details', value: projectDetails(p, models) },
    { key: 'saleLaunch', value: thaiPartialDate(p.projectSaleLaunchDate) },
    {
      key: 'utilities',
      value: codeListDisplay(p.utilities, p.utilitiesOther, c => label('PublicUtility', c)),
    },
    {
      key: 'facilities',
      value: codeListDisplay(p.facilities, p.facilitiesOther, c => label('Facilities', c)),
    },
    { key: 'coordinates', value: formatGps(p.latitude, p.longitude) },
  ];
}
