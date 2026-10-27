import { COST_APPROACH_TYPE, MARKET_APPROACH_TYPE, type Method } from '../types/selection';

/** Comparison methods whose manual mode splits out a land-rate breakdown — mock's `LANDM`
 *  (mock:3143). Machinery/Building Cost methods must never show this: it would add a land value on
 *  top of whatever already holds their own value. */
export const LAND_COMPARISON_METHOD_TYPES = [
  'WQS_COST',
  'SAG_COST',
  'DC_COST',
  'WQS_MARKET',
  'SAG_MARKET',
  'DC_MARKET',
];

/** Only a Cost LandAndBuilding breakdown prices the building (a Market LB method has no breakdown). */
export const hasBuildingBreakdown = (approachType: string, method: Pick<Method, 'role'>) =>
  approachType === COST_APPROACH_TYPE && method.role === 'LandAndBuilding';

/**
 * Whether a method may carry a manual land-rate breakdown right now: manual mode, a land comparison
 * method type, Land (Cost or Market) or LandAndBuilding (Cost only), and land to price by rate
 * (the group's land area above zero). The board shows the breakdown by this rule and Save
 * re-checks it, so a stale dirty key cannot send the server a request it rejects.
 *
 * Only a breakdown that has a rate needs the area: clearing one (`rate` null) needs none on the
 * server, so Save must still let that through for a group whose land area is 0. The board passes no
 * rate — it only shows the inputs for a group with land.
 */
export const qualifiesForManualBreakdown = (
  approachType: string,
  method: Pick<Method, 'role' | 'useSystemCalc' | 'methodType'>,
  landAreaInSqWa: number | null | undefined,
  { clearing = false }: { clearing?: boolean } = {},
) =>
  (clearing || (landAreaInSqWa ?? 0) > 0) &&
  method.useSystemCalc === false &&
  LAND_COMPARISON_METHOD_TYPES.includes(method.methodType) &&
  (method.role === 'Land'
    ? approachType === COST_APPROACH_TYPE || approachType === MARKET_APPROACH_TYPE
    : hasBuildingBreakdown(approachType, method));

/** The manual-cost-breakdown request. `buildingValue` goes only with the Cost LandAndBuilding role
 *  (the server rejects that role without it and never reads it otherwise); empty counts as 0. */
export const manualBreakdownRequest = (
  approachType: string,
  method: Pick<Method, 'role' | 'landRatePerSqWa' | 'appraisalValue' | 'buildingValue'>,
) => ({
  landRatePerSqWa: method.landRatePerSqWa ?? null,
  indicatedValue: method.appraisalValue,
  ...(hasBuildingBreakdown(approachType, method) && { buildingValue: method.buildingValue ?? 0 }),
});
