import { z } from 'zod';

/**
 * Validates mandatory fields for a given DCF method's detail object.
 *
 * Shared between:
 *   - AssumptionEditDraftSchema  (modal — path prefix "method.detail.*")
 *   - DCFForm superRefine        (outer panel — path prefix
 *     "sections.{n}.categories.{m}.assumptions.{k}.method.detail.*")
 *
 * `addIssue` receives a path *relative to the detail object* so each caller
 * prepends its own prefix before forwarding to ctx.addIssue.
 */
export function validateMethodDetail(
  methodType: string,
  detail: Record<string, any>,
  addIssue: (path: (string | number)[], message: string) => void,
): void {
  /** Flags a scalar detail field as required when empty. */
  const req = (field: string, message = 'Required') => {
    const val = detail[field];
    if (val == null || val === '') addIssue([field], message);
  };

  /** Flags an array field when it has no rows. */
  const minOneRow = (field: string, message = 'At least one row is required') => {
    const arr = detail[field];
    if (!Array.isArray(arr) || arr.length === 0) addIssue([field], message);
  };

  /**
   * Flags every row in an array where a specific cell is empty.
   * Default message is 'Required' — kept short for inline table cells.
   */
  const reqInRows = (arrayField: string, rowField: string, message = 'Required') => {
    const rows: any[] = detail[arrayField] ?? [];
    rows.forEach((row, idx) => {
      if (row?.[rowField] == null || row[rowField] === '')
        addIssue([arrayField, idx, rowField], message);
    });
  };

  switch (methodType) {
    // Method 01 — Specified Room Income Per Day
    case '01':
      minOneRow('roomDetails', 'Please add at least one room');
      reqInRows('roomDetails', 'roomType');
      reqInRows('roomDetails', 'roomIncome');
      reqInRows('roomDetails', 'saleableArea');
      req('increaseRatePct', 'Increase Rate (%) is required');
      req('increaseRateYrs', 'Increase Rate period (years) is required');
      req('occupancyRateFirstYearPct', 'Occupancy Rate — First Year (%) is required');
      req('occupancyRatePct', 'Occupancy Rate (%) is required');
      req('occupancyRateYrs', 'Occupancy Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 02 — Specified Room Income By Seasonal Rates
    case '02':
      minOneRow('roomDetails', 'Please add at least one room');
      reqInRows('roomDetails', 'roomType');
      // saleableArea and roomIncome live inside each row's seasons[] array
      (detail.roomDetails ?? []).forEach((row: any, rowIdx: number) => {
        if (!row?.seasons?.length)
          addIssue(['roomDetails', rowIdx, 'seasons'], 'At least one season is required');

        (row?.seasons ?? []).forEach((season: any, sIdx: number) => {
          if (season?.saleableArea == null || season.saleableArea === '')
            addIssue(['roomDetails', rowIdx, 'seasons', sIdx, 'saleableArea'], 'Required');
          if (season?.roomIncome == null || season.roomIncome === '')
            addIssue(['roomDetails', rowIdx, 'seasons', sIdx, 'roomIncome'], 'Required');
        });
      });
      // Season header fields (description is optional — treated like remark)
      (detail.seasonDetails ?? []).forEach((season: any, sIdx: number) => {
        if (season?.seasonName == null || String(season.seasonName).trim() === '')
          addIssue(['seasonDetails', sIdx, 'seasonName'], 'Season Name is required');
        if (season?.numberOfMonths == null || season.numberOfMonths === '')
          addIssue(['seasonDetails', sIdx, 'numberOfMonths'], 'No. of Months is required');
      });
      req('totalSaleableArea', 'Total Saleable Area is required');
      req('increaseRatePct', 'Increase Rate (%) is required');
      req('increaseRateYrs', 'Increase Rate period (years) is required');
      req('occupancyRateFirstYearPct', 'Occupancy Rate — First Year (%) is required');
      req('occupancyRatePct', 'Occupancy Rate (%) is required');
      req('occupancyRateYrs', 'Occupancy Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 03 — Specified Room Income With Growth
    case '03':
      req('firstYearAmt', 'Room Income is required');
      req('saleableArea', 'Saleable Area is required');
      req('totalNumberOfSaleableArea', 'Total Number of Saleable Area is required');
      req('increaseRatePct', 'Increase Rate (%) is required');
      req('increaseRateYrs', 'Increase Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 04 — Specified Room Income With Growth By Occupancy Rate
    case '04':
      req('firstYearAmt', 'Room Income is required');
      req('saleableArea', 'Saleable Area is required');
      req('totalNumberOfSaleableArea', 'Total Number of Saleable Area is required');
      req('increaseRatePct', 'Increase Rate (%) is required');
      req('increaseRateYrs', 'Increase Rate period (years) is required');
      req('occupancyRateFirstYearPct', 'Occupancy Rate — First Year (%) is required');
      req('occupancyRatePct', 'Occupancy Rate (%) is required');
      req('occupancyRateYrs', 'Occupancy Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 05 — Specified Rental Income Per Month
    case '05':
      minOneRow('roomDetails', 'Please add at least one room');
      reqInRows('roomDetails', 'roomType');
      reqInRows('roomDetails', 'roomIncome');
      reqInRows('roomDetails', 'saleableArea');
      req('totalSaleableArea', 'Total Saleable Area is required');
      req('increaseRatePct', 'Increase Rate (%) is required');
      req('increaseRateYrs', 'Increase Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 06 — Specified Rental Income Per Square Meter
    case '06':
      minOneRow('areaDetail', 'Please add at least one area');
      reqInRows('areaDetail', 'description');
      reqInRows('areaDetail', 'rentalPrice');
      reqInRows('areaDetail', 'saleableArea');
      req('totalSaleableArea', 'Total Saleable Area is required');
      req('increaseRatePct', 'Increase Rate (%) is required');
      req('increaseRateYrs', 'Increase Rate period (years) is required');
      req('occupancyRateFirstYearPct', 'Occupancy Rate — First Year (%) is required');
      req('occupancyRatePct', 'Occupancy Rate (%) is required');
      req('occupancyRateYrs', 'Occupancy Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 07 — Room Cost Based On Expenses Per Room Per Day
    case '07':
      minOneRow('roomDetails', 'Please add at least one room');
      reqInRows('roomDetails', 'roomType');
      reqInRows('roomDetails', 'roomExpensePerDay');
      reqInRows('roomDetails', 'saleableArea');
      req('increaseRatePct', 'Increase Rate (%) is required');
      req('increaseRateYrs', 'Increase Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 08 — Specified Food And Beverage Expenses Per Room Per Day
    case '08':
      req('firstYearAmt', 'Food and Beverage Expenses is required');
      req('increaseRatePct', 'Increase Rate (%) is required');
      req('increaseRateYrs', 'Increase Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 09 — Position Based Salary Calculation
    case '09':
      minOneRow('jobPositionDetails', 'Please add at least one job position');
      reqInRows('jobPositionDetails', 'jobPosition');
      reqInRows('jobPositionDetails', 'salaryBahtPerPersonPerMonth');
      reqInRows('jobPositionDetails', 'numberOfEmployees');
      req('increaseRatePct', 'Increase Rate (%) is required');
      req('increaseRateYrs', 'Increase Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 10 — Parameter Based On Tier Of Property Value
    case '10':
      req('increaseRatePct', 'Land Price Increase Rate (%) is required');
      req('increaseRateYrs', 'Land Price Increase Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 11 — Specified Energy Cost Index
    case '11':
      req('energyCostIndex', 'Energy Cost Index is required');
      req('increaseRatePct', 'Energy Cost Increase Rate (%) is required');
      req('increaseRateYrs', 'Energy Cost Increase Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 12 — Proportion Of The New Replacement Cost
    case '12':
      req('proportionPct', 'Proportion (%) is required');
      req('increaseRatePct', 'Increase Rate (%) is required');
      req('increaseRateYrs', 'Increase Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    // Method 13 — Proportion (of another assumption/category/section)
    case '13':
      req('proportionPct', 'Proportion (%) is required');
      req('startIn', 'Start In (year) is required');
      if (detail.refTarget?.clientId == null || detail.refTarget.clientId === '')
        addIssue(['refTarget', 'clientId'], 'Reference target is required');
      break;

    // Method 14 — Specified Value With Growth
    case '14':
      req('firstYearAmt', 'First Year Amount is required');
      req('increaseRatePct', 'Increase Rate (%) is required');
      req('increaseRateYrs', 'Increase Rate period (years) is required');
      req('startIn', 'Start In (year) is required');
      break;

    default:
      break;
  }
}

/**
 * Validation schema for AssumptionEditDraft — the inner modal form used by
 * DiscountedCashFlowMethodModal.
 *
 * Strategy: passthrough on the outer object (many derived/display fields live
 * alongside user-input fields and must not block submission) + superRefine for
 * conditional rules that depend on the currently-selected method type.
 *
 * Error paths match the RHF field names so RHFInputCell picks them up
 * automatically via useController's fieldState.error.
 */
export const AssumptionEditDraftSchema = z
  .object({
    assumptionType: z.string({ required_error: 'Required' }).min(1, 'Required'),
    assumptionName: z.string().nullable().optional(),
    method: z
      .object({
        methodType: z.string({ required_error: 'Required' }).min(1, 'Required'),
        detail: z.unknown(),
      })
      .passthrough(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    // assumptionName is required only when the user picked "Miscellaneous" (M99)
    if (data.assumptionType === 'M99' && !String(data.assumptionName ?? '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['assumptionName'], message: 'Required' });
    }

    const methodType = (data.method as any)?.methodType as string | null | undefined;
    const detail = (data.method as any)?.detail as Record<string, any> | undefined;

    // method.detail is only present after a methodType is chosen
    if (!methodType || !detail) return;

    validateMethodDetail(methodType, detail, (path, message) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['method', 'detail', ...path],
        message,
      });
    });
  });

export type AssumptionEditDraftSchemaType = z.infer<typeof AssumptionEditDraftSchema>;
