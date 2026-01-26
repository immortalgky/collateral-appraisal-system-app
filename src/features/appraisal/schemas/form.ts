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

export const createMarketSurveyForm = z
  .object({
    marketSurveyData: z.array(MarketSurveyDataDto),
    surveyName: z.string(),
    surveyTemplateCode: z.string(),
  })
  .passthrough();

export type createMarketSurveyFormType = z.infer<typeof createMarketSurveyForm>;

export const createMarketSurveyFormDefault: createMarketSurveyFormType = {
  marketSurveyData: [],
  surveyName: '',
  surveyTemplateCode: '',
};
