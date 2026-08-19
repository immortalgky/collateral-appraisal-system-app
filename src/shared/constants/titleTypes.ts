/**
 * Land title (deed) type codes and the deed identifiers each one carries.
 *
 * Mirrors parameter.Parameters where Group = 'DeedType', and the backend's
 * TitleDeedInfo.ValidDeedTypes in
 * Modules/Request/Request/Domain/RequestTitles/TitleDeedInfo.cs.
 * Keep in sync when a deed type is added or removed.
 *
 * Which identifiers apply is driven by how each document is surveyed:
 *   - โฉนด (DEED / น.ส.4) is a full cadastral survey, positioned by
 *     ระวาง (rawang) + เลขที่ดิน (landParcelNumber) + หน้าสำรวจ (surveyNumber).
 *   - น.ส.3ก (NS3K) is surveyed from an aerial photo map
 *     (ระวางรูปถ่ายทางอากาศ), so it carries the aerial map name/number and
 *     sheet number instead of the UTM ระวาง.
 *   - น.ส.3 / น.ส.3ข (NS3 / NS3KO) have no aerial photo map and none of the
 *     cadastral position fields.
 *
 * Every type carries titleNumber, เล่ม/หน้า (book/page) and area, so those
 * fields need no condition.
 */
export const TITLE_TYPE_CODES = ['DEED', 'NS3', 'NS3K', 'NS3KO', 'POSR', 'OTHER'] as const;

export type TitleTypeCode = (typeof TITLE_TYPE_CODES)[number];

/**
 * Escape-hatch types that display every deed identifier.
 *
 * OTHER is the catch-all. POSR is deliberately permissive until the business
 * defines which identifiers a possessory-rights document actually carries —
 * hiding a field clears its value (see clearOnHide below), so showing a spare
 * field is the recoverable choice.
 */
const SHOW_ALL_TITLE_TYPES: TitleTypeCode[] = ['POSR', 'OTHER'];

/**
 * Field visibility per title type, for `showWhen` on the land-title configs.
 *
 * ⚠ These MUST be expressed as "types that DO carry the field". `clearOnHide`
 * defaults to true, so hiding a field nulls its value on the next save — a
 * wrong entry here destroys data rather than merely hiding it.
 */

/** ระวาง — the UTM cadastral map sheet. โฉนด only. */
export const RAWANG_TITLE_TYPES: TitleTypeCode[] = ['DEED', ...SHOW_ALL_TITLE_TYPES];

/** แผ่นที่ + ระวางรูปถ่ายทางอากาศ (sheet number, aerial map name/number). น.ส.3ก only. */
export const AERIAL_TITLE_TYPES: TitleTypeCode[] = ['NS3K', ...SHOW_ALL_TITLE_TYPES];

/** เลขที่ดิน — land parcel number. โฉนด and น.ส.3ก. */
export const LAND_PARCEL_TITLE_TYPES: TitleTypeCode[] = ['DEED', 'NS3K', ...SHOW_ALL_TITLE_TYPES];

/** หน้าสำรวจ — survey page. โฉนด only. */
export const SURVEY_TITLE_TYPES: TitleTypeCode[] = ['DEED', ...SHOW_ALL_TITLE_TYPES];
