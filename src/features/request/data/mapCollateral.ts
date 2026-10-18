// Maps property type codes (from properties form) to allowed collateral type codes (in titles form).
// Keys = PropertyType parameter codes (old letter codes, unchanged).
// Values = CollateralType parameter codes (new 33-code numeric set).

export const LAND_CODES = ['01', '13', '14', '17', '19', '21', '26', '27'];
const LB_CODES = ['02', '03', '04', '23', '24', '32'];
const BUILDING_CODES = ['05', '06', '07', '15', '16', '18', '20', '22'];
const CONDO_CODES = ['08', '33'];
const LEASE_LS_CODES = ['09', '25', '30', '31'];
export const LEASE_LAND_CODE = ['29'];
const LEASE_CONDO_CODE = ['28'];
export const VEHICLE_CODE = '10';
export const MACHINE_CODE = '11';
export const VESSEL_CODE = '12';
/** Vehicle, machine, vessel: no title-document address. */
export const MOVABLE_CODES = [VEHICLE_CODE, MACHINE_CODE, VESSEL_CODE];

export const mapCollateral: Record<string, string[]> = {
  // Land → land titles + land-with-building titles
  L: [...LAND_CODES, ...LB_CODES],
  // Land and Building → land + land-with-building + building titles
  LB: [...LAND_CODES, ...LB_CODES, ...BUILDING_CODES],
  // Building → land-with-building + building titles
  B: [...LB_CODES, ...BUILDING_CODES],
  // Condominium → condo titles only
  U: CONDO_CODES,
  // Lease Agreement (Land and Building) → all leasehold types
  LS: [...LEASE_LS_CODES, ...LEASE_LAND_CODE],
  // Lease Agreement (Land) → all leasehold types
  LSL: [...LEASE_LS_CODES, ...LEASE_LAND_CODE],
  // Lease Agreement (Building) → all leasehold types
  LSB: [...LEASE_LS_CODES, ...LEASE_LAND_CODE],
  // Lease Agreement Condo → lease condo only
  LSU: LEASE_CONDO_CODE,
  // Movables
  VEH: [VEHICLE_CODE],
  MAC: [MACHINE_CODE],
  VES: [VESSEL_CODE],
};

export const mapBuildingType: Record<string, string[]> = {
  U: ['05', '06', '99'],
  LSU: ['05', '06', '99'],
};

// Property types with no building, so no Building Type. Keep in step with the BE twin
// `RequestProperty.NoBuildingPropertyTypes` (collateral-appraisal-system-api,
// Modules/Request/Request/Domain/Requests/RequestProperty.cs).
export const NO_BUILDING_PROPERTY_TYPES: readonly string[] = ['L', 'LSL', 'MAC', 'VEH', 'VES'];
