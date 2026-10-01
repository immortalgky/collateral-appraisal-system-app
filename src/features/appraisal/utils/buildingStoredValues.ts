import {
  type Numberish,
  derivedBuildingCostValue,
  enteredBuildingCostValue,
  enteredFigure,
  scheduleCostFigures,
} from '@/features/pricingAnalysis/domain/calculation';

/**
 * A building stores two figures the way its property screen shows them: the appraiser's typed value,
 * otherwise the one its depreciation rows give — Building Cost Value (every row) and the fire
 * insurance (IsBuilding rows). Both are rounded by the server's rule (`roundSumToThousand`), and the
 * form keeps "not entered" as null so the figure keeps following the table.
 */

type DepreciationRow = { isBuilding?: boolean | null; priceAfterDepreciation?: Numberish };

/** The IsBuilding rows' subtotal (each row at 2 dp, as the server sums it) and the insurance derived from it. */
export const buildingInsuranceFigures = (rows: DepreciationRow[] | null | undefined) => {
  const { total, derived } = scheduleCostFigures(
    (rows ?? []).filter(row => row?.isBuilding) as Record<string, unknown>[],
  );
  return { subtotal: total, insurance: derived };
};

/**
 * A building's insurance when the appraiser typed none: its IsBuilding rows rounded to the nearest
 * 1,000 — the server's BuildingAppraisalDetail.ComputeInsurancePrice. Null without such rows.
 */
export const derivedBuildingInsurance = (
  rows: DepreciationRow[] | null | undefined,
): number | null => buildingInsuranceFigures(rows).insurance;

/**
 * A building's insurance as the form holds it: what the appraiser typed, or null for "not entered" —
 * the same reading as enteredBuildingCostValue (a stored figure equal to the derived one is not
 * entered; a typed figure that happens to equal it is indistinguishable).
 */
export const enteredBuildingInsurance = (
  stored: Numberish,
  rows: DepreciationRow[] | null | undefined,
): number | null => enteredFigure(stored, derivedBuildingInsurance(rows));

export { derivedBuildingCostValue, enteredBuildingCostValue };

/** Form values as the server will store them: an untyped Building Cost Value or insurance becomes the derived figure. */
export const withStoredBuildingValues = (values: Record<string, unknown>) => {
  if (!Array.isArray(values.depreciationDetails)) return values;
  const rows = values.depreciationDetails as Record<string, unknown>[];
  return {
    ...values,
    ...('buildingCostValue' in values && values.buildingCostValue == null
      ? { buildingCostValue: derivedBuildingCostValue(rows) }
      : {}),
    ...('buildingInsurancePrice' in values && values.buildingInsurancePrice == null
      ? { buildingInsurancePrice: derivedBuildingInsurance(rows as DepreciationRow[]) }
      : {}),
  };
};
