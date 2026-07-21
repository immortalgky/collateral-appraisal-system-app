import type { GetAppraisalByIdResponseType } from '@/shared/schemas/v1';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import axios from '@shared/api/axiosInstance';

/**
 * Hook for fetching appraisal data by ID
 * GET /appraisals/{appraisalId}
 */
export const useGetAppraisalById = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId],
    queryFn: async (): Promise<GetAppraisalByIdResponseType> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

// The API serializes with DefaultIgnoreCondition.WhenWritingNull, so null fields are OMITTED
// from the JSON entirely — use .nullish() (not .nullable()) for every optional field.
const previousAppraisalChainItemSchema = z.object({
  appraisalId: z.string(),
  appraisalNumber: z.string(),
  appraisalDate: z.string().nullish(),
  appraisalValue: z.number().nullish(),
  status: z.string().nullish(),
  depth: z.number(),
});

export type PreviousAppraisalChainItem = z.infer<typeof previousAppraisalChainItemSchema>;

const previousAppraisalChainResponseSchema = z.object({
  items: z.array(previousAppraisalChainItemSchema),
});

/**
 * Fetch the reappraisal / construction-inspection lineage for an appraisal, nearest-ancestor-first.
 * GET /appraisals/{appraisalId}/previous-chain
 */
export const useGetPreviousAppraisalChain = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId, 'previous-chain'],
    queryFn: async (): Promise<PreviousAppraisalChainItem[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/previous-chain`);
      return previousAppraisalChainResponseSchema.parse(data).items;
    },
    enabled: !!appraisalId,
  });
};
