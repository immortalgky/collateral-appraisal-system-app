/** Cost Approach methods that price land and can carry a manual land value + building value
 *  fast-path (config-level method keys — see pricingAnalysis.config.json). Building Cost ('BC')
 *  and Machinery Cost ('MC_COST') are Cost Approach methods too, but they price the building/
 *  machinery itself, not land — including them here would double-count. */
const COST_APPROACH_LAND_PRICING_METHODS = ['WQS_COST', 'SAG_COST', 'DC_COST', 'LH', 'PR'];

export const isCostApproachLandPricingMethod = (methodType: string) =>
  COST_APPROACH_LAND_PRICING_METHODS.includes(methodType);

/** Property types that carry land (standalone or combined with a building, regular or
 *  lease-agreement variant). The land value fast-path only makes sense when the anchor's
 *  property group actually contains land — a pure Building/Condo/Machinery group has nothing
 *  for "Land Value" to price. */
const LAND_BEARING_PROPERTY_TYPES = ['L', 'LB', 'LSL', 'LS'];

export const hasLandProperty = (properties: Record<string, unknown>[] | undefined) =>
  (properties ?? []).some(p => LAND_BEARING_PROPERTY_TYPES.includes(p.propertyType as string));
