import { z } from 'zod';
import type { DCFAssumption, DCFCategory, DCFMethod, DCFSection } from '../types/dcf';

/**
 * Validates mandatory fields for a given DCF method's detail object.
 *
 * This function is shared between:
 *   - AssumptionEditDraftSchema  (modal form — path prefix "method.detail.*")
 *   - DCFForm superRefine        (outer panel form — path prefix
 *     "sections.{n}.categories.{m}.assumptions.{k}.method.detail.*")
 *
 * `addIssue` receives a path *relative to the detail object* so each caller
 * can prepend its own prefix before forwarding to ctx.addIssue.
 */
export function validateMethodDetail(
  methodType: string,
  detail: Record<string, any>,
  addIssue: (path: (string | number)[], message: string) => void,
  section?: DCFSection,
  assumption?: DCFAssumption,
  category?: DCFCategory,
  method?: DCFMethod,
): void {
  /** Flags a detail-level scalar field as required when empty. */
  const req = (field: string, message = 'Required') => {
    const val = detail[field];
    if (val == null || val === '') addIssue([field], message);
  };

  /** Flags an array field when it has no rows. */
  const minOneRow = (field: string, message = 'At least one row is required') => {
    const arr = detail[field];
    if (!Array.isArray(arr) || arr.length === 0) addIssue([field], message);
  };

  /** Flags every row in an array where a specific cell is empty. */
  const reqInRows = (
    arrayField: string,
    rowField: string,
    message?: (row: any, idx: number) => string,
  ) => {
    const rows: any[] = detail[arrayField] ?? [];
    rows.forEach((row, idx) => {
      if (row?.[rowField] == null || row[rowField] === '')
        addIssue(
          [arrayField, idx, rowField],
          message ? message(row, idx) : `[${idx}]: ${rowField} is Required`,
        );
    });
  };

  switch (methodType) {
    // Method 01 — Specified Room Income Per Day
    case '01':
      minOneRow('roomDetails');
      reqInRows('roomDetails', 'saleableArea');
      reqInRows('roomDetails', 'roomIncome');
      reqInRows('roomDetails', 'roomType');
      req('occupancyRateFirstYearPct', '1st yr Occupancy Rate is required');
      req('increaseRatePct', 'Increase Rate Pct is requried');
      req('startIn', 'Start In is required.');
      break;

    // Method 02 — Specified Room Income By Seasonal Rates
    case '02':
      minOneRow('roomDetails');
      // saleableArea lives inside each row's seasons[] array
      (detail.roomDetails ?? []).forEach((row: any, rowIdx: number) => {
        (row?.seasons ?? []).forEach((season: any, sIdx: number) => {
          if (season?.saleableArea == null || season.saleableArea === '')
            addIssue(['roomDetails', rowIdx, 'seasons', sIdx, 'saleableArea'], 'Required');
        });
      });
      req('increaseRatePct', 'Increase Rate is required.');
      req('startIn', 'Start In is required.');
      break;

    // Method 03 — Specified Room Income with Growth
    case '03':
      req('firstYearAmt', '1st Year Amt is required.');
      req('saleableArea', 'Saleable Area is required.');
      req('increaseRatePct', 'Increase Rate Pct is requried');
      req('startIn', 'Start In is required.');
      break;

    // Method 04 — Specified Room Income with Growth by Occupancy Rate
    case '04':
      req('firstYearAmt', '1st Year Amt is required.');
      req('saleableArea', 'Saleable Area is required.');
      req('increaseRatePct', 'Increase Rate Pct is requried');
      req('startIn', 'Start In is required.');
      break;

    // Method 05 — Specified Rental Income Per Month
    case '05':
      minOneRow('roomDetails');
      reqInRows('roomDetails', 'saleableArea');
      req('increaseRatePct', 'Increase Rate Pct is requried');
      req('startIn', 'Start In is required.');
      break;

    // Method 06 — Specified Rental Income Per Square Meter
    case '06':
      minOneRow('areaDetail');
      reqInRows('areaDetail', 'saleableArea');
      req('increaseRatePct', 'Increase Rate Pct is requried');
      req('startIn', 'Start In is required.');
      break;

    // Method 07 — Room Cost Based On Expenses Per Room Per Day
    case '07':
      minOneRow('roomDetails');
      reqInRows('roomDetails', 'saleableArea');
      req('startIn', 'Start In is required.');
      break;

    // Method 08 — Specified Food And Beverage Expenses Per Room Per Day
    case '08':
      req('firstYearAmt', '1st Year Amt is required.');
      req('startIn', 'Start In is required.');
      break;

    // Method 09 — Position Based Salary Calculation
    case '09':
      minOneRow('jobPositionDetails');
      req('startIn', 'Start In is required.');
      break;

    // Method 10 — Parameter Based On Tier Of Property Value
    case '10':
      req('startIn', 'Start In is required.');
      break;

    // Method 11 — Specified Energy Cost Index
    case '11':
      req('energyCostIndex', 'Energy Cost Index is required');
      req('startIn', 'Start In is required.');
      break;

    // Method 12 — Proportion Of The New Replacement Cost
    case '12':
      req('proportionPct', 'Proportion Pct is required');
      req('startIn', 'Start In is required.');
      break;

    // Method 13 — Proportion (of another assumption/category/section)
    case '13':
      req('proportionPct', 'Proportion Pct is required');
      req('startIn', 'Start In is required.');
      if (!detail.refTarget?.clientId) addIssue(['refTarget', 'clientId'], 'Required');
      break;

    // Method 14 — Specified Value with Growth
    case '14':
      req('firstYearAmt', '1st Year Amt is required.');
      req('startIn', 'Start In is required.');
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
