import { z } from 'zod';

const MachineryItemSchema = z.object({
  appraisalPropertyId: z.string(),
  quantity: z.number().nullable(),
  machineName: z.string().nullable(),
  registrationNumber: z.string().nullable(),
  manufacturer: z.string().nullable(),
  conditionUse: z.string().nullable(),
  yearOfManufacture: z.number().nullable(),
  isPriceCertified: z.boolean().nullable(),
});

/** ConditionUse code for "สำรวจไม่พบ" — the survey never found the machine. */
export const NOT_FOUND_CONDITION_CODE = '03';

/**
 * A row the appraiser cannot type into. Two reasons, and they are not interchangeable:
 *
 *  - the price is not certified — they declined to put a value on this machine at all;
 *  - ConditionUse is '03' — the survey never found it, and '03' is the ONE code for which the
 *    residual-life floor is skipped (see CostMachineSection), so R = N - n runs negative on any
 *    machine older than its life span. Left open for typing, an RCN entered against a negative R
 *    produces a negative Physical Deterioration and a negative FMV, which nothing downstream
 *    rejects: the server sums FairMarketValue as sent and rolls it into the group's value.
 *    Closing the row stops anyone ENTERING one. It does not clear a value already stored against
 *    a machine that was marked '03' after the fact — that is handled where the payload is built,
 *    which sends a locked row's FAIR MARKET VALUE as null. RCN and life span are sent unchanged
 *    on purpose: they are the appraiser's own figures and re-certifying the price finds them
 *    still there.
 *
 * Either way the cost inputs stay empty by design, so requiring them would block Save behind
 * errors sitting on disabled fields — the whole form unsaveable because of a row nobody is
 * allowed to fill in.
 *
 * Exported so the table imports this exact predicate rather than restating it. The rule decides
 * BOTH which inputs are disabled and which are exempt from validation; if the two ever disagreed,
 * the form would show a greyed row carrying an error nobody can clear.
 */
export function isMachineRowLocked(machine: {
  conditionUse: string | null;
  isPriceCertified: boolean | null;
}) {
  return machine.conditionUse === NOT_FOUND_CONDITION_CODE || machine.isPriceCertified === false;
}

/** The cost inputs, with the bounds each one is held to when the row IS editable. */
const COST_INPUTS = [
  { key: 'rcn', label: 'RCN', max: null },
  { key: 'lifeSpan', label: 'Life span', max: null },
  { key: 'conditionFactor', label: 'Condition factor', max: 1 },
  { key: 'functionalObsolescence', label: 'Functional obsolescence', max: 1 },
  { key: 'economicObsolescence', label: 'Economic obsolescence', max: 1 },
] as const;

const MachineryRowSchema = z
  .object({
    id: z.string().nullable(),
    appraisalPropertyId: z.string(),
    machine: MachineryItemSchema,
    // nullish, not nullable — the API drops null properties from its JSON, so a saved row whose
    // RCN is null comes back with the key MISSING and the form holds `undefined`. `.nullable()`
    // rejects that and zod reports its default "Required" on a field the row has disabled, which
    // is exactly the trap this schema exists to avoid. Whether an empty value is acceptable at all
    // is decided in superRefine below, the only place that can see the machine the row belongs to.
    rcn: z.number().nullish(),
    lifeSpan: z.number().nullish(),
    durationInUse: z.number(),
    residualLifeSpan: z.number(),
    conditionFactor: z.number().nullish(),
    physicalDeterioration: z.number().nullish(),
    functionalObsolescence: z.number().nullish(),
    economicObsolescence: z.number().nullish(),
    fmv: z.number().nullish(),
    marketDemand: z.enum(['Y', 'N']).nullable(),
    notes: z.string().nullable(),
  })
  .superRefine((row, ctx) => {
    if (isMachineRowLocked(row.machine)) return;

    for (const { key, label, max } of COST_INPUTS) {
      const value = row[key];
      if (value == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${label} is required` });
        continue;
      }
      if (value < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${label} must be at least 0`,
        });
      } else if (max != null && value > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${label} must be at most ${max}`,
        });
      }
    }
  });

export const CostMachineFormSchema = z.object({
  // appraisal.PricingAnalysisMethods.Remark is nvarchar(4000). The textarea caps typing at the
  // same number, so this only catches a value that got in some other way — but without it the
  // DOM attribute is the only thing standing between a long remark and a SQL truncation error.
  remark: z.string().max(4000, 'Remark must be at most 4000 characters').nullable(),
  machineryCosts: z.array(MachineryRowSchema),
});

export type CostMachineFormType = z.infer<typeof CostMachineFormSchema>;
export type MachineryRowFormType = z.infer<typeof MachineryRowSchema>;
export type MachineryItemType = z.infer<typeof MachineryItemSchema>;
