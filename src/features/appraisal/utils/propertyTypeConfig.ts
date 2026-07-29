/**
 * Shared property type configuration maps.
 * Single source of truth for property type → API endpoint and route mappings.
 * Maps are keyed by short codes only.
 */

/** Maps property type code to the backend detail endpoint path segment */
export const typeToDetailEndpoint: Record<string, string> = {
  L: 'land-detail',
  B: 'building-detail',
  U: 'condo-detail',
  LB: 'land-and-building-detail',
  MAC: 'machinery-detail',
  VEH: 'vehicle-detail',
  VES: 'vessel-detail',
  LSL: 'lease-agreement-land-detail',
  LSB: 'lease-agreement-building-detail',
  LS: 'lease-agreement-land-building-detail',
  LSU: 'lease-agreement-condo-detail',
};

/** Maps property type code to the frontend route segment */
export const typeToRouteSegment: Record<string, string> = {
  L: 'land',
  B: 'building',
  U: 'condo',
  LB: 'land-building',
  MAC: 'machinery',
  LSL: 'lease-land',
  LSB: 'lease-building',
  LS: 'lease-land-building',
  LSU: 'lease-condo',
};

/**
 * Maps property type code to its icon sprite id (`/icons/solid.svg#<name>`).
 * Must stay keyed by the same codes as `typeToDetailEndpoint` — a missing code
 * silently falls back to the generic building glyph, which is how MAC/VEH/VES
 * and the four lease codes went unnoticed. `propertyTypeIcon.test.ts` guards this.
 */
export const typeToIconName: Record<string, string> = {
  L: 'earth-asia',
  B: 'house',
  U: 'building',
  LB: 'house-chimney',
  MAC: 'gears',
  VEH: 'car',
  VES: 'ship',
  LSL: 'scroll',
  LSB: 'file-contract',
  LS: 'file-signature',
  LSU: 'file-signature',
};

/** Set of property type codes that have building details */
export const BUILDING_TYPE_CODES = new Set(['B', 'LB', 'LSB', 'LS']);

/** Maps display name → short code for reverse lookup */
const displayNameToCode: Record<string, string> = {
  Lands: 'L',
  Building: 'B',
  Condominium: 'U',
  'Land and building': 'LB',
  Machine: 'MAC',
  Machinery: 'MAC',
  Vehicle: 'VEH',
  Vessel: 'VES',
  'Lease Agreement Lands': 'LSL',
  'Lease Agreement Building': 'LSB',
  'Lease Agreement Land and building': 'LS',
  'Lease Agreement Condo': 'LSU',
};

/** Resolve a display name or short code to its short code */
export function resolveTypeCode(typeNameOrCode: string): string | undefined {
  return (
    displayNameToCode[typeNameOrCode] ??
    (typeToDetailEndpoint[typeNameOrCode] ? typeNameOrCode : undefined)
  );
}

/** Get the backend detail endpoint for a property type (accepts display name or code) */
export function getDetailEndpoint(typeNameOrCode: string): string | undefined {
  const code = displayNameToCode[typeNameOrCode] ?? typeNameOrCode;
  return typeToDetailEndpoint[code];
}

/** Get the icon sprite id for a property type (accepts display name or code) */
export function getTypeIconName(typeNameOrCode: string): string {
  const code = displayNameToCode[typeNameOrCode] ?? typeNameOrCode;
  return typeToIconName[code] ?? 'building';
}

/** Get the frontend route segment for a property type (accepts display name or code) */
export function getRouteSegment(typeNameOrCode: string): string | undefined {
  const code = displayNameToCode[typeNameOrCode] ?? typeNameOrCode;
  return typeToRouteSegment[code];
}

/** Check if a property type has building details (accepts display name or code) */
export function isBuildingType(typeNameOrCode: string): boolean {
  const code = displayNameToCode[typeNameOrCode] ?? typeNameOrCode;
  return BUILDING_TYPE_CODES.has(code);
}
