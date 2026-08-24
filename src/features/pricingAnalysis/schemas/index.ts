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
export type PricingAnalysisDocumentDtoType = z.infer<typeof schemas.PricingAnalysisDocumentDto>;

// -- Approaches & Methods --
export type AddPricingAnalysisApproachRequestType = z.infer<typeof schemas.AddApproachRequest>;
export type AddPricingAnalysisApproachResponseType = z.infer<typeof schemas.AddApproachResponse>;
export type AddPricingAnalysisMethodRequestType = z.infer<typeof schemas.AddMethodRequest>;
export type AddPricingAnalysisMethodResponseType = z.infer<typeof schemas.AddMethodResponse>;

// -- Comparative Analysis --
export const SaveComparativeAnalysisRequest = schemas.SaveComparativeAnalysisRequest;
export const SaveComparativeAnalysisResponse = schemas.SaveComparativeAnalysisResponse;
export type ComparativeFactorInputType = z.infer<typeof schemas.ComparativeFactorInput>;
export type SaveComparativeAnalysisRequestType = z.infer<
  typeof schemas.SaveComparativeAnalysisRequest
>;
export type SaveComparativeAnalysisResponseType = z.infer<
  typeof schemas.SaveComparativeAnalysisResponse
>;

// -- Comparative Factors --
export const GetComparativeFactorsResponse = schemas.GetComparativeFactorsResponse;
export type ComparativeFactorType = z.infer<typeof schemas.ComparativeFactorDto>;
export type FactorScoreType = z.infer<typeof schemas.FactorScoreDto>;
export type CalculationType = z.infer<typeof schemas.CalculationDto>;
export type GetComparativeFactorsResponseType = z.infer<
  typeof schemas.GetComparativeFactorsResponse
>;

// -- Link/Unlink Comparables --
export type LinkedComparableType = z.infer<typeof schemas.LinkedComparableDto>;
export type LinkComparableRequestType = z.infer<typeof schemas.LinkComparableRequest>;
export type LinkComparableResponseType = z.infer<typeof schemas.LinkComparableResponse>;

// -- Market Comparable --
export const GetMarketComparableByIdResponse = schemas.GetMarketComparableByIdResponse;
export type GetMarketComparableByIdResponseType = z.infer<
  typeof schemas.GetMarketComparableByIdResponse
>;
export type MarketComparableDetailType = z.infer<typeof schemas.MarketComparableDetailDto>;
export type MarketComparableDataType = z.infer<typeof schemas.MarketComparableDto>;

// -- Factor Data --
export type FactorDataType = z.infer<typeof schemas.FactorDataDto>;

// -- Final Value --
export type SetFinalValueRequestType = z.infer<typeof schemas.SetFinalValueRequest>;
export type SetFinalValueResponseType = z.infer<typeof schemas.SetFinalValueResponse>;
export type UpdateFinalValueRequestType = z.infer<typeof schemas.UpdateFinalValueRequest>;
export type UpdateFinalValueResponseType = z.infer<typeof schemas.UpdateFinalValueResponse>;

// -- Remark --
export type UpdateRemarkRequestType = z.infer<typeof schemas.UpdateRemarkRequest>;
export type UpdateRemarkResponseType = z.infer<typeof schemas.UpdateRemarkResponse>;

// -- Select Method --
export type SelectMethodResponseType = z.infer<typeof schemas.SelectMethodResponse>;

// -- Recalculate & Reset --
export type RecalculateFactorsResponseType = z.infer<typeof schemas.RecalculateFactorsResponse>;
export type ResetPricingMethodResultType = z.infer<typeof schemas.ResetPricingMethodResult>;

// -- Update Method/Approach --
export type UpdateMethodRequestType = z.infer<typeof schemas.UpdateMethodRequest>;
export type UpdateMethodResponseType = z.infer<typeof schemas.UpdateMethodResponse>;
export type UpdateApproachRequestType = z.infer<typeof schemas.UpdateApproachRequest>;

// -- Complete Pricing Analysis --
export type CompletePricingAnalysisRequestType = z.infer<
  typeof schemas.CompletePricingAnalysisRequest
>;
export type CompletePricingAnalysisResponseType = z.infer<
  typeof schemas.CompletePricingAnalysisResponse
>;

// ==================== Local-only types (not from server) ====================

// -- Pricing Analysis Configuration (parsed from local JSON config) --
const PricingAnalysisConfigDto = z
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
export const PricingAnalysisConfigResponse = z.object({
  approaches: z.array(PricingAnalysisConfigDto),
});
export type PricingAnalysisConfigType = z.infer<typeof PricingAnalysisConfigDto>;
export type PricingAnalysisConfigResponseType = z.infer<typeof PricingAnalysisConfigResponse>;

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

// -- Leasehold Analysis --
export {
  LeaseholdFormSchema,
  type LeaseholdFormType,
  type LandGrowthPeriodFormType,
} from './leaseholdForm';

// -- Update Land Value (manual mode) --
// TODO: replace with `schemas.UpdateFinalValueManualRequest`/`Response` once
// src/shared/schemas/v1.ts is regenerated — the backend endpoint
// (PUT /pricing-analysis/{id}/methods/{methodId}/land-value) already exists and is typed
// server-side (UpdateFinalValueManualRequest/Response), the generated client just hasn't
// been refreshed against the updated OpenAPI spec yet.
export const UpdateLandValueRequest = z.object({
  landValue: z.number(),
});
export const UpdateLandValueResponse = z
  .object({
    methodId: z.string(),
    landValue: z.number(),
    landArea: z.number().nullable().optional(),
    buildingValue: z.number(),
  })
  .passthrough();
export type UpdateLandValueRequestType = z.infer<typeof UpdateLandValueRequest>;
export type UpdateLandValueResponseType = z.infer<typeof UpdateLandValueResponse>;
