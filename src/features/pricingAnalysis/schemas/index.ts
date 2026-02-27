/**
 * Pricing Analysis schemas.
 *
 * Server-generated schemas come from `@shared/schemas/v1`.
 * Only local-only types (config, templates) are defined here.
 */
import { z } from 'zod';
import { schemas } from '@shared/schemas/v1';

// ==================== Re-exports from shared v1 (server-generated) ====================

// -- Pricing Analysis --
export const GetPricingAnalysisResponse = schemas.GetPricingAnalysisResponse;
export type GetPricingAnalysisResponseType = z.infer<typeof schemas.GetPricingAnalysisResponse>;

// -- Approaches & Methods --
export type AddPriceAnalysisApproachRequestType = z.infer<typeof schemas.AddApproachRequest>;
export type AddPriceAnalysisApproachResponseType = z.infer<typeof schemas.AddApproachResponse>;
export type AddPriceAnalysisMethodRequestType = z.infer<typeof schemas.AddMethodRequest>;
export type AddPriceAnalysisMethodResponseType = z.infer<typeof schemas.AddMethodResponse>;

// -- Comparative Analysis --
export const SaveComparativeAnalysisRequest = schemas.SaveComparativeAnalysisRequest;
export const SaveComparativeAnalysisResponse = schemas.SaveComparativeAnalysisResponse;
export type ComparativeFactorInputType = z.infer<typeof schemas.ComparativeFactorInput>;
export type SaveComparativeAnalysisRequestType = z.infer<typeof schemas.SaveComparativeAnalysisRequest>;
export type SaveComparativeAnalysisResponseType = z.infer<typeof schemas.SaveComparativeAnalysisResponse>;

// -- Comparative Factors --
export const GetComparativeFactorsResponse = schemas.GetComparativeFactorsResponse;
export type FactorScoreType = z.infer<typeof schemas.FactorScoreDto>;
export type GetComparativeFactorsResponseType = z.infer<typeof schemas.GetComparativeFactorsResponse>;

// -- Market Comparable --
export const GetMarketComparableByIdResponse = schemas.GetMarketComparableByIdResponse;
export type GetMarketComparableByIdResponseType = z.infer<typeof schemas.GetMarketComparableByIdResponse>;
export type MarketComparableDetailType = z.infer<typeof schemas.MarketComparableDetailDto>;
export type MarketComparableDataType = z.infer<typeof schemas.MarketComparableDto>;

// -- Factor Data --
export type FactorDataType = z.infer<typeof schemas.FactorDataDto>;

// ==================== Local-only types (not from server) ====================

// -- Pricing Analysis Configuration (parsed from local JSON config) --
const PriceAnalysisConfigDto = z
  .object({
    id: z.string(),
    approachType: z.string(),
    label: z.string(),
    icon: z.string(),
    appraisalValue: z.number().nullable().optional(),
    methods: z.array(
      z
        .object({
          id: z.string(),
          methodType: z.string(),
          icon: z.string(),
          label: z.string(),
          appraisalValue: z.number().nullable().optional(),
          configurations: z.array(
            z
              .object({
                type: z.string(),
                showQualitativeSection: z.boolean().nullable().optional(),
                showInitialPriceSection: z.boolean().nullable().optional(),
                showSecondRevisionSection: z.boolean().nullable().optional(),
                showAdjustedValueSection: z.boolean().nullable().optional(),
                showAdjustedWeightSection: z.boolean().nullable().optional(),
                showAdjustFinalValueSection: z.boolean().nullable().optional(),
              })
              .passthrough(),
          ),
        })
        .passthrough(),
    ),
  })
  .passthrough();
export const PriceAnalysisConfigResponse = z.object({
  approaches: z.array(PriceAnalysisConfigDto),
});
export type PriceAnalysisConfigType = z.infer<typeof PriceAnalysisConfigDto>;
export type PriceAnalysisConfigResponseType = z.infer<typeof PriceAnalysisConfigResponse>;

// -- Pricing Templates (mocked — no backend endpoint yet) --
const TemplateComparativeFactorDto = z.object({
  id: z.string().uuid(),
  factorCode: z.string(),
});
const TemplateCalculationFactorDto = z
  .object({
    id: z.string().uuid(),
    factorCode: z.string(),
    weight: z.number().nullable().optional(),
    intensity: z.number().nullable().optional(),
  })
  .passthrough();
const TemplateDetailDto = z
  .object({
    templateCode: z.string(),
    templateName: z.string(),
    collateralType: z.string(),
    comparativeFactors: z.array(TemplateComparativeFactorDto).optional().nullable(),
    calculationFactors: z.array(TemplateCalculationFactorDto).optional().nullable(),
  })
  .optional();
export const GetPricingTemplateByMethodResponse = z
  .object({
    templates: z.array(TemplateDetailDto).nullable().optional(),
  })
  .passthrough();

export type TemplateComparativeFactorType = z.infer<typeof TemplateComparativeFactorDto>;
export type TemplateCalculationFactorType = z.infer<typeof TemplateCalculationFactorDto>;
export type TemplateDetailType = z.infer<typeof TemplateDetailDto>;
export type GetPricingTemplatesByMethodResponseType = z.infer<
  typeof GetPricingTemplateByMethodResponse
>;
