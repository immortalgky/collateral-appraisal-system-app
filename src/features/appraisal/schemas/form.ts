import { z } from 'zod';

export const factorDataDto = z
  .object({
    factorId: z.string().uuid().nullable().optional(),
    factorCode: z.string().nullable().optional(),
    value: z.any().nullable().optional(),
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

export const createMarketSurveyForm = z
  .object({
    factorData: z.array(factorDataDto).nullable().optional(),
    note: z.string().nullable().optional(),
    infoDateTime: z.string().datetime({ local: true }).nullable().optional(),
    sourceInfo: z.string().nullable().optional(),
    surveyName: z.string(),
    templateId: z.string().uuid().nullable().optional(),
    templateCode: z.string().nullable().optional(),
  })
  .passthrough();

export type createMarketSurveyFormType = z.infer<typeof createMarketSurveyForm>;

export const createMarketSurveyFormDefault: createMarketSurveyFormType = {
  factorData: [],
  surveyName: '',
  templateId: '',
  templateCode: '',
  note: '',
  infoDateTime: '',
  sourceInfo: '',
};
