import type { ProjectUnitPrice, ProjectType } from '../types';

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
      return rawAdjustment * areaMultiplier;
    case 'AdjustPricePercentage':
      return (standardPriceTotal * rawAdjustment) / 100;
    default:
      return rawAdjustment;
  }
};

const roundToNearest10000 = (value: number): number =>
  Math.round(value / 10000) * 10000;

export const recomputeUnitPrice = (
  unit: ProjectUnitPrice,
  assumption: AssumptionInputs,
  projectType: ProjectType,
): ProjectUnitPrice =>
  projectType === 'Condo' ? recomputeCondo(unit, assumption) : recomputeLB(unit, assumption);

/**
 * Condo: ProjectUnitPrice.standardPrice is stored as the per-sq.m. rate
 * (see Project.cs:CalculateCondoUnitPrices), so the area-based total is
 * standardPrice * usableArea.
 */
const recomputeCondo = (
  unit: ProjectUnitPrice,
  a: AssumptionInputs,
): ProjectUnitPrice => {
  const usableArea = num(unit.usableArea);
  const standardPriceTotal = num(unit.standardPrice) * usableArea;

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
  const floor = num(unit.floor);
  const priceIncrementPerFloor =
    floor > 0 && everyX > 0 ? Math.floor((floor - 1) / everyX) * incAmount : 0;

  const totalAppraisalValue = standardPriceTotal + locationContribution + priceIncrementPerFloor;
  const totalAppraisalValueRounded = Math.round(totalAppraisalValue);
  const forceSellingPrice =
    a.forceSalePercentage != null
      ? Math.round((totalAppraisalValueRounded * a.forceSalePercentage) / 100)
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
 * LB: ProjectUnitPrice.standardPrice is stored as the area-based total
 * (per-sq.m. rate × usableArea, see Project.cs:CalculateLandAndBuildingUnitPrices).
 * Location adjustments scale by LandArea (sq.wa), not UsableArea.
 *
 * landIncreaseDecreaseAmount depends on standardLandArea (only on the model),
 * which isn't denormalized onto the unit-price record. Toggling a flag doesn't
 * affect this value, so we preserve whatever the backend last computed.
 */
const recomputeLB = (
  unit: ProjectUnitPrice,
  a: AssumptionInputs,
): ProjectUnitPrice => {
  const landArea = num(unit.landArea);
  const standardPriceTotal = num(unit.standardPrice);
  const landIncreaseDecreaseAmount = num(unit.landIncreaseDecreaseAmount);

  // adjustPriceLocation is stored as the raw flag-adjustment total. The
  // configured LocationMethod is only applied when folding it into the appraisal
  // value (mirrors Project.cs). LB scales by landArea (sq.wa).
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

  const totalAppraisalValue = standardPriceTotal + landIncreaseDecreaseAmount + locationContribution;
  const totalAppraisalValueRounded = roundToNearest10000(totalAppraisalValue);
  const forceSellingPrice =
    a.forceSalePercentage != null
      ? Math.round((totalAppraisalValueRounded * a.forceSalePercentage) / 100)
      : undefined;

  return {
    ...unit,
    adjustPriceLocation,
    totalAppraisalValue,
    totalAppraisalValueRounded,
    forceSellingPrice,
  };
};
