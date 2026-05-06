// Maps property type codes (from properties form) to allowed collateral type codes (in titles form).
// Keys = PropertyType parameter codes (old letter codes, unchanged).
// Values = CollateralType parameter codes (new 33-code numeric set).

const LAND_CODES = ['01', '13', '14', '17', '19', '21', '26', '27'];
const LB_CODES = ['02', '03', '04', '23', '24', '32'];
const BUILDING_CODES = ['05', '06', '07', '15', '16', '18', '20', '22'];
const CONDO_CODES = ['08', '33'];
const LEASE_LS_CODES = ['09', '25', '30', '31'];
const LEASE_LAND_CODE = ['29'];
const LEASE_CONDO_CODE = ['28'];

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
  VEH: ['10'],
  MAC: ['11'],
  VES: ['12'],
};
