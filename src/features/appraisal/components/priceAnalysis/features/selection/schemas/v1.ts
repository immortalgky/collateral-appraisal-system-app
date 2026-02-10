import z from 'zod';

const AddPriceAnalysisApproachRequest = z.object({ approachType: z.string() }).passthrough();
const AddPriceAnalysisApproachResponse = z
  .object({ id: z.string(), approachType: z.string(), status: z.string() })
  .passthrough();

const AddPriceAnalysisMethodRequest = z.object({ methodType: z.string() }).passthrough();
const AddPriceAnalysisMethodResponse = z
  .object({ id: z.string(), methodType: z.string(), status: z.string() })
  .passthrough();

export type AddPriceAnalysisApproachRequestType = z.infer<typeof AddPriceAnalysisApproachRequest>;
export type AddPriceAnalysisApproachResponseType = z.infer<typeof AddPriceAnalysisApproachResponse>;

export type AddPriceAnalysisMethodRequestType = z.infer<typeof AddPriceAnalysisMethodRequest>;
export type AddPriceAnalysisMethodResponseType = z.infer<typeof AddPriceAnalysisMethodResponse>;
