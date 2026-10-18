import { isCondo, isLandAndBuildingLike } from '../types';
import type { ProjectUnitPrice, ProjectType } from '../types';
import { roundAwayFromZero, snap, truncateTowardZero } from '@/shared/utils/decimalRounding';

/**
 * Client-side mirror of the backend's unit-price calculation
 * (see Project.cs:CalculateCondoUnitPrices / CalculateLandAndBuildingUnitPrices).
 *
 * Used to give the user an immediate preview when they toggle a location flag
 * (Corner/Edge/Pool View/South/Other/Near Garden) without round-tripping the
 * server. The backend remains the source of truth on Save / Save Draft.
 *
 * IMPORTANT: keep this in sync with Project.cs.
 */

export interface AssumptionInputs {
  locationMethod?: string | null;
  cornerAdjustment?: number | null;
  edgeAdjustment?: number | null;
  poolViewAdjustment?: number | null;
  southAdjustment?: number | null;
  otherAdjustment?: number | null;
  nearGardenAdjustment?: number | null;
  landIncreaseDecreaseRate?: number | null;
  floorIncrementEveryXFloor?: number | null;
  floorIncrementAmount?: number | null;
  forceSalePercentage?: number | null;
}

const num = (v: number | null | undefined): number =>
  typeof v === 'number' && !Number.isNaN(v) ? v : 0;

/** Mirror of Project.cs:ApplyLocationMethod. */
const applyLocationMethod = (
  rawAdjustment: number,
  method: string | null | undefined,
  standardPriceTotal: number,
  areaMultiplier: number,
): number => {
  switch (method) {
    case 'AdjustPriceSqm':
      return snap(rawAdjustment * areaMultiplier);
    case 'AdjustPricePercentage':
      return snap(snap(standardPriceTotal * rawAdjustment) / 100);
    case 'Lumpsum':
      // Flat baht — applied as-is, not multiplied by area or percentage.
      return rawAdjustment;
    default:
      return rawAdjustment;
  }
};

const roundToNearest10000 = (value: number): number => roundAwayFromZero(value, 10000);
const roundToNearest1000 = (value: number): number => roundAwayFromZero(value, 1000);
/** total x percent / 100, with the product snapped before the division. */
const percentOf = (total: number, percent: number): number => snap(snap(total * percent) / 100);

/**
 * `modelCoverage` is the matched model's fire-insurance rate (Baht/sq.m.); leave it undefined when
 * the unit has no model, which keeps the unit's stored coverageAmount. Otherwise coverageAmount
 * becomes the per-unit TOTAL the backend stores, round-to-1000 of rate x usable area, mirroring
 * Project.cs exactly:
 * - Condo: `(rate * usableArea) ?? 0`, so 0 when the rate or the area is null.
 * - LB: no rate gives no coverage; no area counts as 0.
 */
export const recomputeUnitPrice = (
  unit: ProjectUnitPrice,
  assumption: AssumptionInputs,
  projectType: ProjectType,
  modelCoverage?: { rate: number | null | undefined },
): ProjectUnitPrice => {
  const priced = isCondo(projectType)
    ? recomputeCondo(unit, assumption)
    : recomputeLB(unit, assumption);
  if (!modelCoverage) return priced;
  const { rate } = modelCoverage;
  const coverageAmount = isCondo(projectType)
    ? rate == null || unit.usableArea == null
      ? 0
      : roundToNearest1000(rate * unit.usableArea)
    : rate == null
      ? undefined
      : roundToNearest1000(rate * num(unit.usableArea));
  return { ...priced, coverageAmount };
};

/** Per-model figures the live preview reads (the backend reads the same ones on Save). */
export interface ModelPricing {
  standardPrice?: number | null;
  /** Fire-insurance rate, Baht/sq.m. */
  coverageAmount?: number | null;
  /** Standard land AREA (Sq.Wa) for LB models. */
  standardLandArea?: number | null;
}

/**
 * Rows for the Calculated view: always the live recompute (it is what Save would write), with the
 * model's price and coverage looked up per unit. The Imported view does not call this; it shows
 * the stored rows as the API returned them.
 */
export const buildDisplayedUnitPrices = (
  units: ProjectUnitPrice[],
  assumption: AssumptionInputs,
  projectType: ProjectType,
  modelLookup: Map<string, ModelPricing>,
): ProjectUnitPrice[] => {
  return units.map(up => {
    const lookup = modelLookup.get(up.projectModelId ?? '');
    // LB land +/- mirrors Project.cs exactly: (landArea ?? 0 - standardLandArea ?? 0) x (rate ?? 0),
    // with no fallback to the stored amount. Condo has no land adjustment.
    const isLB = isLandAndBuildingLike(projectType);
    const landAreaDifference = isLB
      ? snap(num(up.landArea) - num(lookup?.standardLandArea))
      : up.landAreaDifference;
    const landIncreaseDecreaseAmount = isLB
      ? snap((landAreaDifference ?? 0) * num(assumption.landIncreaseDecreaseRate))
      : up.landIncreaseDecreaseAmount;
    // Mirrors the backend: a unit whose model is not in the lookup is priced at 0, with no coverage.
    const enriched: ProjectUnitPrice = {
      ...up,
      standardPrice: lookup?.standardPrice ?? 0,
      landAreaDifference,
      landIncreaseDecreaseAmount,
    };
    const priced = recomputeUnitPrice(
      enriched,
      assumption,
      projectType,
      lookup && { rate: lookup.coverageAmount },
    );
    return lookup ? priced : { ...priced, coverageAmount: undefined };
  });
};

/**
 * Condo: ProjectUnitPrice.standardPrice is stored as the per-sq.m. rate
 * (see Project.cs:CalculateCondoUnitPrices), so the area-based total is
 * standardPrice * usableArea.
 */
const recomputeCondo = (unit: ProjectUnitPrice, a: AssumptionInputs): ProjectUnitPrice => {
  const usableArea = num(unit.usableArea);
  const standardPriceTotal = snap(num(unit.standardPrice) * usableArea);

  // adjustPriceLocation is stored as the raw flag-adjustment total. The
  // configured LocationMethod is only applied when folding it into the appraisal
  // value (mirrors Project.cs).
  const adjustPriceLocation =
    (unit.isCorner ? num(a.cornerAdjustment) : 0) +
    (unit.isEdge ? num(a.edgeAdjustment) : 0) +
    (unit.isPoolView ? num(a.poolViewAdjustment) : 0) +
    (unit.isSouth ? num(a.southAdjustment) : 0) +
    (unit.isOther ? num(a.otherAdjustment) : 0);
  const locationContribution = applyLocationMethod(
    adjustPriceLocation,
    a.locationMethod,
    standardPriceTotal,
    usableArea,
  );

  const everyX = num(a.floorIncrementEveryXFloor);
  const incAmount = num(a.floorIncrementAmount);
  // C# integer division truncates toward zero, so floors <= 0 give 0 or negative steps, as in the
  // backend: no `floor > 0` guard. `+ 0` turns the -0 of floor 0 (trunc(-1 / everyX)) into 0, which
  // would otherwise render as "-0.00".
  const priceIncrementPerFloor =
    unit.floor != null && everyX > 0 ? Math.trunc((unit.floor - 1) / everyX) * incAmount + 0 : 0;

  const totalAppraisalValue = snap(
    standardPriceTotal + locationContribution + priceIncrementPerFloor,
  );
  const totalAppraisalValueRounded = roundAwayFromZero(totalAppraisalValue);
  const forceSellingPrice =
    a.forceSalePercentage != null
      ? roundToNearest1000(percentOf(totalAppraisalValueRounded, a.forceSalePercentage))
      : // No percentage known (no models, no saved assumption): the forced sale of a unit worth 0
        // is 0 whatever the percentage, which is what the backend stores; otherwise unknown.
        totalAppraisalValueRounded === 0
        ? 0
        : undefined;

  return {
    ...unit,
    adjustPriceLocation,
    priceIncrementPerFloor,
    totalAppraisalValue,
    totalAppraisalValueRounded,
    forceSellingPrice,
  };
};

/**
 * LB: ProjectUnitPrice.standardPrice is the model's FinalAppraisedValue directly (total Baht).
 * It is NOT multiplied by usable area — see Project.cs:CalculateLandAndBuildingUnitPrices.
 * Location adjustments scale by LandArea (Sq.Wa), not UsableArea.
 */
const recomputeLB = (unit: ProjectUnitPrice, a: AssumptionInputs): ProjectUnitPrice => {
  const landArea = num(unit.landArea);
  const standardPriceTotal = num(unit.standardPrice);
  const landIncreaseDecreaseAmount = num(unit.landIncreaseDecreaseAmount);

  // adjustPriceLocation is stored as the raw flag-adjustment total. The
  // configured LocationMethod is only applied when folding it into the appraisal
  // value (mirrors Project.cs). LB scales by landArea (Sq.Wa).
  const adjustPriceLocation =
    (unit.isCorner ? num(a.cornerAdjustment) : 0) +
    (unit.isEdge ? num(a.edgeAdjustment) : 0) +
    (unit.isNearGarden ? num(a.nearGardenAdjustment) : 0) +
    (unit.isOther ? num(a.otherAdjustment) : 0);
  const locationContribution = applyLocationMethod(
    adjustPriceLocation,
    a.locationMethod,
    standardPriceTotal,
    landArea,
  );

  const totalAppraisalValue = snap(
    standardPriceTotal + landIncreaseDecreaseAmount + locationContribution,
  );
  const totalAppraisalValueRounded = roundToNearest10000(totalAppraisalValue);
  const forceSellingPrice =
    a.forceSalePercentage != null
      ? roundToNearest1000(percentOf(totalAppraisalValueRounded, a.forceSalePercentage))
      : // No percentage known (no models, no saved assumption): the forced sale of a unit worth 0
        // is 0 whatever the percentage, which is what the backend stores; otherwise unknown.
        totalAppraisalValueRounded === 0
        ? 0
        : undefined;

  return {
    ...unit,
    adjustPriceLocation,
    totalAppraisalValue,
    totalAppraisalValueRounded,
    forceSellingPrice,
  };
};

/**
 * Stored money has two decimals, and a previewed figure can carry a third (1,369,326.125). Whether
 * the database rounds that digit (away from zero) or truncates it on the way in is not settled, so
 * either counts as the same figure: 1,369,326.13 or 1,369,326.12. A real difference is anything
 * else. Null against a value is a difference.
 */
const sameFigure = (previewed?: number | null, stored?: number | null) =>
  previewed == null || stored == null
    ? previewed == stored
    : Math.abs(roundAwayFromZero(previewed, 0.01) - stored) < 1e-6 ||
      Math.abs(truncateTowardZero(previewed, 0.01) - stored) < 1e-6;

/** Every calculated figure Save writes (the flags and unit attributes are inputs, not results). */
const CALCULATED_FIELDS = [
  'standardPrice',
  'totalAppraisalValue',
  'totalAppraisalValueRounded',
  'forceSellingPrice',
  'coverageAmount',
  'adjustPriceLocation',
  'priceIncrementPerFloor',
  'landIncreaseDecreaseAmount',
] as const satisfies readonly (keyof ProjectUnitPrice)[];

/** Whether the recomputed rows differ from the stored ones in any figure Save would write. */
export const differsFromStored = (displayed: ProjectUnitPrice[], stored: ProjectUnitPrice[]) =>
  displayed.some((row, i) =>
    CALCULATED_FIELDS.some(field => !sameFigure(row[field], stored[i]?.[field])),
  );
