import { z } from 'zod';

export const factorDataDto = z
  .object({
    factorId: z.string().uuid().nullable().optional(),
    factorCode: z.string().nullable().optional(),
    value: z.string().nullable().optional(),
    otherRemarks: z.string().nullable().optional(),
    factorName: z.string().nullable().optional(),
    fieldName: z.string().nullable().optional(),
    dataType: z.string().nullable().optional(),
    fieldLength: z.coerce.number().nullable().optional(),
    fieldDecimal: z.coerce.number().nullable().optional(),
    parameterGroup: z.string().nullable().optional(),
    isActive: z.boolean().nullable().optional(),
    displaySeq: z.coerce.number().int().nullable().optional(),
  })
  .passthrough();

export const CreateMarketSurveyRequest = z
  .object({
    factorData: z.array(factorDataDto),
    note: z.string().nullable().optional(),
    infoDateTime: z.string().datetime({ local: true }).nullable().optional(),
    sourceInfo: z.string().nullable().optional(),
    surveyName: z.string(),
    templateId: z.string().uuid().nullable().optional(),
  })
  .passthrough();

export const UpdateMarketSurveyRequest = z
  .object({
    factorData: z.array(factorDataDto),
    note: z.string().nullable().optional(),
    infoDateTime: z.string().datetime({ local: true }).nullable().optional(),
    sourceInfo: z.string().nullable().optional(),
    surveyName: z.string(),
    templateId: z.string().uuid().nullable().optional(),
  })
  .passthrough();

export const GetMarketSurveyResponse = z
  .object({
    factorData: z.array(factorDataDto),
    note: z.string().nullable().optional(),
    infoDateTime: z.string().datetime({ local: true }).nullable().optional(),
    sourceInfo: z.string().nullable().optional(),
    surveyName: z.string(),
    templateId: z.string().uuid().nullable().optional(),
  })
  .passthrough();

const DeleteMarketSurveyResponse = z.object({ isSuccess: z.boolean() }).passthrough();

export const GetMarketSurveyTemplateFactorResponse = z
  .object({
    factorId: z.string().uuid(),
    factorCode: z.string(),
    value: z.any(),
    otherRemarks: z.string(),
    factorName: z.string(),
    fieldName: z.string(),
    dataType: z.string(),
    fieldLength: z.coerce.number(),
    fieldDecimal: z.coerce.number(),
    parameterGroup: z.string(),
    isActive: z.boolean(),
    displaySeq: z.coerce.number().int(),
  })
  .passthrough();

export const UpdateMarketSurveyResponse = z.object({ isSuccess: z.boolean() }).passthrough();
export const CreateMarketSurveyResponse = z.object({ isSuccess: z.boolean() }).passthrough();

export const schema = {
  factorDataDto,
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
