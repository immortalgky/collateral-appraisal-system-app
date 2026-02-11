import z from 'zod';

/** ================================ */
/** Add price analysis approach */
/** ================================ */
const AddPriceAnalysisApproachRequest = z.object({ approachType: z.string() }).passthrough();
const AddPriceAnalysisApproachResponse = z
  .object({ id: z.string(), approachType: z.string(), status: z.string() })
  .passthrough();

export type AddPriceAnalysisApproachRequestType = z.infer<typeof AddPriceAnalysisApproachRequest>;
export type AddPriceAnalysisApproachResponseType = z.infer<typeof AddPriceAnalysisApproachResponse>;

/** ================================ */
/** Add price analysis method */
/** ================================ */
const AddPriceAnalysisMethodRequest = z.object({ methodType: z.string() }).passthrough();
const AddPriceAnalysisMethodResponse = z
  .object({ id: z.string(), methodType: z.string(), status: z.string() })
  .passthrough();

export type AddPriceAnalysisMethodRequestType = z.infer<typeof AddPriceAnalysisMethodRequest>;
export type AddPriceAnalysisMethodResponseType = z.infer<typeof AddPriceAnalysisMethodResponse>;

/** ================================ */
/** Query price analysis approaches & methods */
/** ================================ */
const MethodDto = z
  .object({
    id: z.string(),
    methodType: z.string(),
    isCandidated: z.boolean(),
    appraisalValue: z.number().nullable().optional(),
  })
  .passthrough();

const ApproachDto = z
  .object({
    id: z.string(),
    approachType: z.string(),
    appraisalValue: z.number().nullable().optional(),
    isCandidated: z.boolean(),
    methods: z.array(MethodDto),
  })
  .passthrough();

export const GetPricingAnalysisRequest = z.object({ id: z.string() }).passthrough();
export const GetPricingAnalysisResponse = z
  .object({
    id: z.string(),
    propertyGroupId: z.string(),
    status: z.string(),
    finalMarketValue: z.number().nullable().optional(), // not sure
    finalAppraisedValue: z.number().nullable().optional(),
    finalForcedSaleValue: z.number().nullable().optional(), // not sure
    valuationDate: z.string().datetime().nullable().optional(),
    approaches: z.array(ApproachDto),
  })
  .passthrough();

export type ApproachDtoType = z.infer<typeof ApproachDto>;
export type MethodDtoType = z.infer<typeof MethodDto>;
export type GetPricingAnalysisRequestType = z.infer<typeof GetPricingAnalysisRequest>;
export type GetPricingAnalysisResponseType = z.infer<typeof GetPricingAnalysisResponse>;
