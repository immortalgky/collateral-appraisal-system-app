import { z } from 'zod';

export const MarketSurveyDataDto = z
  .object({
    marketSurveyId: z.coerce.number().int(),
    factorCode: z.string(),
    value: z.string(),
    measurementUnit: z.string(),
    otherRemark: z.string(),
    factorDesc: z.string(),
    fieldName: z.string(),
    dataType: z.string(),
    fieldLength: z.coerce.number(),
    fieldDecimal: z.coerce.number(),
    parameterGroup: z.string(),
    mandatory: z.string(),
    displaySeq: z.coerce.number().int(),
  })
  .passthrough();

export const CreateMarketSurveyRequest = z
  .object({
    marketSurveyData: z.array(MarketSurveyDataDto),
    surveyName: z.string(),
    surveyTemplateCode: z.string(),
  })
  .passthrough();

export const UpdateMarketSurveyRequest = z
  .object({
    marketSurveyData: z.array(MarketSurveyDataDto),
    surveyName: z.string(),
    surveyTemplateCode: z.string(),
  })
  .passthrough();

export const GetMarketSurveyResponse = z
  .object({
    marketSurveyData: z.array(MarketSurveyDataDto),
    surveyName: z.string(),
    surveyTemplateCode: z.string(),
  })
  .passthrough();

const DeleteMarketSurveyResponse = z.object({ isSuccess: z.boolean() }).passthrough();

export const GetMarketSurveyTemplateFactorResponse = z
  .object({
    marketSurveyId: z.coerce.number().int(),
    factorCode: z.string(),
    factorDesc: z.string(),
    value: z.string(),
    fieldName: z.string(),
    dataType: z.string(),
    fieldLength: z.coerce.number(),
    fieldDecimal: z.coerce.number(),
    parameterGroup: z.string(),
    active: z.string(),
  })
  .passthrough();

export const UpdateMarketSurveyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
export const CreateMarketSurveyResponse = z.object({ isSuccess: z.boolean() }).passthrough();

export const schema = {
  MarketSurveyDataDto,
  CreateMarketSurveyRequest,
  DeleteMarketSurveyResponse,
};

export type CreateMarketSurveyRequestType = z.infer<typeof CreateMarketSurveyRequest>;
export type UpdateMarketSurveyRequestType = z.infer<typeof UpdateMarketSurveyRequest>;
export type CreateMarketSurveyResponseType = z.infer<typeof CreateMarketSurveyResponse>;
export type UpdateMarketSurveyResponseType = z.infer<typeof UpdateMarketSurveyResponse>;
export type GetMarketSurveyTemplateFactorResponseType = z.infer<
  typeof GetMarketSurveyTemplateFactorResponse
>;
export type GetMarketSurveyResponseType = z.infer<typeof GetMarketSurveyResponse>;
