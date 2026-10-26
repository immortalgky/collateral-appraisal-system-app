import { z } from 'zod';
import { vmsg } from '@/shared/components/form/validationMessage';

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
 *
 * Messages are tokens (see validationMessage.ts), translated where the error is shown. A field's
 * own label names it there, so the message is just "required" / "at least one row".
 */
export function validateMethodDetail(
  methodType: string,
  detail: Record<string, any>,
  addIssue: (path: (string | number)[], message: string) => void,
): void {
  const required = vmsg('required');
  const atLeastOne = vmsg('minItems', { min: 1 });

  /** Flags a scalar detail field as required when empty. */
  const req = (field: string) => {
    const val = detail[field];
    if (val == null || val === '') addIssue([field], required);
  };

  /** Flags an array field when it has no rows. */
  const minOneRow = (field: string) => {
    const arr = detail[field];
    if (!Array.isArray(arr) || arr.length === 0) addIssue([field], atLeastOne);
  };

  /** Flags every row in an array where a specific cell is empty. */
  const reqInRows = (arrayField: string, rowField: string) => {
    const rows: any[] = detail[arrayField] ?? [];
    rows.forEach((row, idx) => {
      if (row?.[rowField] == null || row[rowField] === '')
        addIssue([arrayField, idx, rowField], required);
    });
  };

  /** The growth fields every method with a yearly increase asks for. */
  const reqGrowth = () => {
    req('increaseRatePct');
    req('increaseRateYrs');
    req('startIn');
  };

  /** The occupancy fields of the methods that model it. */
  const reqOccupancy = () => {
    req('occupancyRateFirstYearPct');
    req('occupancyRatePct');
    req('occupancyRateYrs');
  };

  switch (methodType) {
    // Method 01 — Specified Room Income Per Day
    case '01':
      minOneRow('roomDetails');
      reqInRows('roomDetails', 'roomType');
      reqInRows('roomDetails', 'roomIncome');
      reqInRows('roomDetails', 'saleableArea');
      req('increaseRatePct');
      req('increaseRateYrs');
      reqOccupancy();
      req('startIn');
      break;

    // Method 02 — Specified Room Income By Seasonal Rates
    case '02':
      minOneRow('roomDetails');
      reqInRows('roomDetails', 'roomType');
      // saleableArea and roomIncome live inside each row's seasons[] array
      (detail.roomDetails ?? []).forEach((row: any, rowIdx: number) => {
        if (!row?.seasons?.length) addIssue(['roomDetails', rowIdx, 'seasons'], atLeastOne);

        (row?.seasons ?? []).forEach((season: any, sIdx: number) => {
          if (season?.saleableArea == null || season.saleableArea === '')
            addIssue(['roomDetails', rowIdx, 'seasons', sIdx, 'saleableArea'], required);
          if (season?.roomIncome == null || season.roomIncome === '')
            addIssue(['roomDetails', rowIdx, 'seasons', sIdx, 'roomIncome'], required);
        });
      });
      // Season header fields (description is optional — treated like remark)
      (detail.seasonDetails ?? []).forEach((season: any, sIdx: number) => {
        if (season?.seasonName == null || String(season.seasonName).trim() === '')
          addIssue(['seasonDetails', sIdx, 'seasonName'], required);
        if (season?.numberOfMonths == null || season.numberOfMonths === '')
          addIssue(['seasonDetails', sIdx, 'numberOfMonths'], required);
      });
      req('totalSaleableArea');
      req('increaseRatePct');
      req('increaseRateYrs');
      reqOccupancy();
      req('startIn');
      break;

    // Method 03 — Specified Room Income With Growth
    case '03':
      req('firstYearAmt');
      req('saleableArea');
      req('totalNumberOfSaleableArea');
      reqGrowth();
      break;

    // Method 04 — Specified Room Income With Growth By Occupancy Rate
    case '04':
      req('firstYearAmt');
      req('saleableArea');
      req('totalNumberOfSaleableArea');
      req('increaseRatePct');
      req('increaseRateYrs');
      reqOccupancy();
      req('startIn');
      break;

    // Method 05 — Specified Rental Income Per Month
    case '05':
      minOneRow('roomDetails');
      reqInRows('roomDetails', 'roomType');
      reqInRows('roomDetails', 'roomIncome');
      reqInRows('roomDetails', 'saleableArea');
      req('totalSaleableArea');
      reqGrowth();
      break;

    // Method 06 — Specified Rental Income Per Square Meter
    case '06':
      minOneRow('areaDetail');
      reqInRows('areaDetail', 'description');
      reqInRows('areaDetail', 'rentalPrice');
      reqInRows('areaDetail', 'saleableArea');
      req('totalSaleableArea');
      req('increaseRatePct');
      req('increaseRateYrs');
      reqOccupancy();
      req('startIn');
      break;

    // Method 07 — Room Cost Based On Expenses Per Room Per Day
    case '07':
      minOneRow('roomDetails');
      reqInRows('roomDetails', 'roomType');
      reqInRows('roomDetails', 'roomExpensePerDay');
      reqInRows('roomDetails', 'saleableArea');
      reqGrowth();
      break;

    // Method 08 — Specified Food And Beverage Expenses Per Room Per Day
    case '08':
      req('firstYearAmt');
      reqGrowth();
      break;

    // Method 09 — Position Based Salary Calculation
    case '09':
      minOneRow('jobPositionDetails');
      reqInRows('jobPositionDetails', 'jobPosition');
      reqInRows('jobPositionDetails', 'salaryBahtPerPersonPerMonth');
      reqInRows('jobPositionDetails', 'numberOfEmployees');
      reqGrowth();
      break;

    // Method 10 — Parameter Based On Tier Of Property Value
    case '10':
      reqGrowth();
      break;

    // Method 11 — Specified Energy Cost Index
    case '11':
      req('energyCostIndex');
      reqGrowth();
      break;

    // Method 12 — Proportion Of The New Replacement Cost
    case '12':
      req('proportionPct');
      reqGrowth();
      break;

    // Method 13 — Proportion (of another assumption/category/section)
    case '13':
      req('proportionPct');
      req('startIn');
      if (detail.refTarget?.clientId == null || detail.refTarget.clientId === '')
        addIssue(['refTarget', 'clientId'], required);
      break;

    // Method 14 — Specified Value With Growth
    case '14':
      req('firstYearAmt');
      reqGrowth();
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
    assumptionType: z.string({ required_error: vmsg('required') }).min(1, vmsg('required')),
    assumptionName: z.string().nullable().optional(),
    method: z
      .object({
        methodType: z.string({ required_error: vmsg('required') }).min(1, vmsg('required')),
        detail: z.unknown(),
      })
      .passthrough(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    // assumptionName is required only when the user picked "Miscellaneous" (M99)
    if (data.assumptionType === 'M99' && !String(data.assumptionName ?? '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['assumptionName'],
        message: vmsg('required'),
      });
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
