import { z } from 'zod';
import { validateMethodDetail } from './dcfMethodModalSchema';

// total*Values are derived display values written by useDerivedFields and the
// summary derived rules. Backend recomputes them on Save (formToSaveRequest
// does not include them), so client-side validation should not reject whatever
// shape RHF/derived rules end up writing — accept any.
const DerivedArray = z.any();

// User-input fields here are deliberately lenient: the existing modal flow can
// emit nulls or wrapper objects (assumptionParams entries) before the user has
// filled everything in. formToSaveRequest normalizes/filters before sending.
const DCFMethodForm = z.object({
  id: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  dbId: z.string().nullable().optional(),
  methodType: z.any(),
  detail: z.record(z.string(), z.unknown()).optional(),
  totalMethodValues: DerivedArray,
});

const DCFAssumptionForm = z.object({
  templateId: z.string().nullable().optional(),
  id: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  dbId: z.string().nullable().optional(),
  assumptionType: z.any(),
  assumptionName: z.any(),
  displaySeq: z.number(),
  identifier: z.string().optional(),
  totalAssumptionValues: DerivedArray,
  method: DCFMethodForm,
});

const DCFCategoryForm = z.object({
  templateId: z.string().nullable().optional(),
  id: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  dbId: z.string().nullable().optional(),
  categoryType: z.string(),
  categoryName: z.string(),
  displaySeq: z.number(),
  identifier: z.string().optional(),
  totalCategoryValues: DerivedArray,
  assumptions: z.array(DCFAssumptionForm),
});

// Sections may carry summary-only fields (contractRentalFee, grossRevenue, etc.) on
// the synthesized summary row — passthrough lets SectionSummaryDCF read them via RHF
// without forcing every consumer to know the union shape.
const DCFSectionForm = z
  .object({
    templateId: z.string().nullable().optional(),
    id: z.string().nullable().optional(),
    clientId: z.string().nullable().optional(),
    dbId: z.string().nullable().optional(),
    sectionType: z.string(), // income, expense, dcf_final, direct_final
    sectionName: z.string(),
    displaySeq: z.number(),
    identifier: z.string(),
    totalSectionValues: DerivedArray,
    categories: z.array(DCFCategoryForm),
  })
  .passthrough();

const HighestBestUsedForm = z.object({
  areaRai: z.number().nullable().optional(),
  areaNgan: z.number().nullable().optional(),
  areaWa: z.number().nullable().optional(),
  pricePerSqWa: z.number().nullable().optional(),
  totalWa: z.number().nullable().optional(),
  totalValue: z.number().nullable().optional(),
});

export const DCFForm = z
  .object({
    id: z.string().nullable().optional(),
    templateCode: z.string(),
    templateName: z.string().optional(),
    totalNumberOfYears: z.number(),
    totalNumberOfDayInYear: z.number(),
    capitalizeRate: z.number(),
    discountedRate: z.number(),
    sections: z.array(DCFSectionForm),
    finalValue: z.number(),
    finalValueRounded: z.number(),
    finalValueAdjust: z.number().nullable().optional(),
    isHighestBestUsed: z.boolean().optional(),
    highestBestUsed: HighestBestUsedForm.optional(),
    appraisalPrice: z.number().nullable().optional(),
    appraisalPriceRounded: z.number().nullable().optional(),
    appraisalPriceDifferentiate: z.number().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate each assumption's method detail fields using the shared validator.
    // Errors are placed at the exact RHF path so RHFInputCell highlights the
    // offending cell automatically on the outer DCF panel form's Save.
    (data.sections ?? []).forEach((section: any, sIdx: number) => {
      (section.categories ?? []).forEach((category: any, cIdx: number) => {
        (category.assumptions ?? []).forEach((assumption: any, aIdx: number) => {
          const method = assumption?.method as any;
          if (!method?.methodType || !method?.detail) return;

          // Build a context prefix so that error messages on the outer panel
          // tell the user exactly which assumption is invalid.
          // Only include parts that are actually populated ("if has data").
          const contextParts = [
            section?.sectionName,
            category?.categoryName,
            assumption?.assumptionName ?? assumption?.assumptionType,
          ].filter(Boolean) as string[];
          const contextPrefix = contextParts.length ? `[${contextParts.join(' › ')}] ` : '';

          validateMethodDetail(
            method.methodType,
            method.detail as Record<string, any>,
            (path, message) => {
              ctx.addIssue({
                code: 'custom',
                path: [
                  'sections',
                  sIdx,
                  'categories',
                  cIdx,
                  'assumptions',
                  aIdx,
                  'method',
                  'detail',
                  ...path,
                ],
                message: contextPrefix + message,
              });
            },
          );
        });
      });
    });
  });

export type DCFMethodFormType = z.infer<typeof DCFMethodForm>;
export type DCFAssumptionFormType = z.infer<typeof DCFAssumptionForm>;
export type DCFCategoryFormType = z.infer<typeof DCFCategoryForm>;
export type DCFSectionFormType = z.infer<typeof DCFSectionForm>;
export type DCFFormType = z.infer<typeof DCFForm>;
