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

/**
 * What the type is physically about, and on what terms it is held.
 *
 * The eleven types are not a flat list: four freehold codes pair one-to-one with four lease
 * codes over the same four things, and three others sit outside that grid. The picker lays them
 * out as that grid, and pairing also lets a lease code borrow its freehold twin's icon so the
 * two read as the same property held differently.
 */
export type PropertyBase = 'land' | 'building' | 'landBuilding' | 'condo' | 'other';
export type PropertyTenure = 'own' | 'lease' | 'other';

export const typeToBase: Record<string, PropertyBase> = {
  L: 'land',
  B: 'building',
  LB: 'landBuilding',
  U: 'condo',
  LSL: 'land',
  LSB: 'building',
  LS: 'landBuilding',
  LSU: 'condo',
  MAC: 'other',
  VEH: 'other',
  VES: 'other',
};

export const typeToTenure: Record<string, PropertyTenure> = {
  L: 'own',
  B: 'own',
  LB: 'own',
  U: 'own',
  LSL: 'lease',
  LSB: 'lease',
  LS: 'lease',
  LSU: 'lease',
  MAC: 'other',
  VEH: 'other',
  VES: 'other',
};

/** The freehold code holding the same thing, for lease codes. */
/**
 * The order the four base kinds are offered in, wherever they are offered: the land, then the
 * structure on its own, then the two together, then a unit inside a block.
 *
 * Both the quick-add bar and the picker read this one list, so changing the order changes both.
 * They used to keep their own copies, which is exactly the pair that drifts.
 */
export const PROPERTY_BASE_ORDER: PropertyBase[] = ['land', 'building', 'landBuilding', 'condo'];

/**
 * Colour per type, as Tailwind background classes — the dot in a list, and the icon tile in the
 * picker. Kept here rather than in each view because the card grid, the split view and the
 * picker all draw it, and three separate copies had already started to appear.
 *
 * The shades match the mock (green-700, blue-700, cyan-600, violet-600): the 500s that were here
 * first washed out against a 12% tint of themselves.
 */
export const typeToDotColor: Record<string, string> = {
  L: 'bg-green-700',
  B: 'bg-blue-700',
  LB: 'bg-cyan-600',
  U: 'bg-violet-600',
  LSL: 'bg-green-700',
  LSB: 'bg-blue-700',
  LS: 'bg-cyan-600',
  LSU: 'bg-violet-600',
  MAC: 'bg-amber-700',
  VEH: 'bg-slate-500',
  VES: 'bg-slate-500',
};

export const getTypeDotColor = (typeNameOrCode: string): string =>
  typeToDotColor[displayNameToCode[typeNameOrCode] ?? typeNameOrCode] ?? 'bg-gray-400';

/** Glyph id in `public/icons/property.svg`, for the four things a property can be. */
const BASE_GLYPH: Record<PropertyBase, string> = {
  land: 'land',
  building: 'building',
  landBuilding: 'land-building',
  condo: 'condo',
  other: '',
};

/** Which sprite a type's icon lives in, and what it is called there. */
export interface PropertyIconRef {
  style: string;
  name: string;
}

/**
 * The four things a property can *be* are drawn in our own sprite, because Font Awesome had no
 * honest answer for them: land came out as a globe, and a building and a land-and-building were
 * both houses differing by a chimney.
 *
 * Machinery, vehicles and vessels keep their Font Awesome icons — a gear, a car and a ship are
 * exactly what those are, and there was nothing to fix.
 *
 * A lease type resolves to its freehold twin's drawing for free: `typeToBase` already pairs
 * them, so `LSL` is 'land' just as `L` is. The picker marks the tenure with a dashed tile rather
 * than a different glyph.
 */
export const getPropertyIcon = (typeNameOrCode: string): PropertyIconRef => {
  const code = displayNameToCode[typeNameOrCode] ?? typeNameOrCode;
  const glyph = BASE_GLYPH[typeToBase[code]];
  return glyph
    ? { style: 'property', name: glyph }
    : { style: 'solid', name: getTypeIconName(code) };
};

/**
 * Every property type the picker offers. This used to live in the dropdown component, but the
 * picker needs it too and the dropdown renders the picker — leaving it there made the two
 * modules import each other.
 */
export const PROPERTY_TYPES = [
  {
    type: 'Building',
    code: 'B',
    route: 'building',
    description: 'Standalone building structure',
  },
  {
    type: 'Condominium',
    code: 'U',
    route: 'condo',
    description: 'Condominium unit',
  },
  {
    type: 'Land and building',
    code: 'LB',
    route: 'land-building',
    description: 'Land with building structure',
  },
  {
    type: 'Lands',
    code: 'L',
    route: 'land',
    description: 'Land parcel only',
  },
  {
    type: 'Lease Agreement Building',
    code: 'LSB',
    route: 'lease-building',
    description: 'Leased building property',
  },
  {
    type: 'Lease Agreement Land and building',
    code: 'LS',
    route: 'lease-land-building',
    description: 'Leased land with building',
  },
  {
    type: 'Lease Agreement Condo',
    code: 'LSU',
    route: 'lease-condo',
    description: 'Leased condominium unit',
  },
  {
    type: 'Lease Agreement Lands',
    code: 'LSL',
    route: 'lease-land',
    description: 'Leased land parcel',
  },
  {
    type: 'Machine',
    code: 'MAC',
    route: 'machinery',
    description: 'Machinery and equipment',
  },
  {
    type: 'Vehicle',
    code: 'VEH',
    route: null,
    description: 'Vehicle asset',
  },
  {
    type: 'Vessel',
    code: 'VES',
    route: null,
    description: 'Marine vessel',
  },
] as const;

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

/**
 * Link to a property's page (router.tsx `property/<segment>/:propertyId`). Undefined when any part
 * is missing — outside an appraisal, an unknown type, no id — so callers render plain text rather
 * than a dead link.
 */
export function getPropertyHref(
  basePath: string,
  typeNameOrCode: string | null | undefined,
  propertyId: string | null | undefined,
): string | undefined {
  const segment = typeNameOrCode ? getRouteSegment(typeNameOrCode) : undefined;
  return basePath && segment && propertyId
    ? `${basePath}/property/${segment}/${propertyId}`
    : undefined;
}

/** Check if a property type has building details (accepts display name or code) */
export function isBuildingType(typeNameOrCode: string): boolean {
  const code = displayNameToCode[typeNameOrCode] ?? typeNameOrCode;
  return BUILDING_TYPE_CODES.has(code);
}
