import type { GetAppraisalByIdResponseType } from '@/shared/schemas/v1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import axios from '@shared/api/axiosInstance';
import { errorText } from '@/shared/utils/errorUtils';

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

/**
 * Correct the construction-inspection round number of the whole appraisal (one value, shown on
 * every building's tab and in the header).
 * PUT /appraisals/{appraisalId}/inspection-number  { inspectionNumber }  ->  204
 * 400: not a positive number, or not a construction inspection. 409: the appraisal is closed.
 */
export const useUpdateInspectionNumber = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('appraisal');

  return useMutation({
    mutationFn: async ({
      appraisalId,
      inspectionNumber,
    }: {
      appraisalId: string;
      inspectionNumber: number;
    }): Promise<void> => {
      await axios.put(`/appraisals/${appraisalId}/inspection-number`, { inspectionNumber });
    },
    // The API stores exactly the submitted number, so the cached header (which feeds
    // AppraisalContext in AppraisalLayout and TaskLayout) is patched, not refetched: a failed
    // refetch would put the query in error and swap the whole page, unsaved forms included, for
    // the error screen.
    onSuccess: async (_, { appraisalId, inspectionNumber }) => {
      const queryKey = ['appraisal', appraisalId];
      // A header GET already in flight would land after the patch and put the old number back.
      await queryClient.cancelQueries({ queryKey, exact: true });
      queryClient.setQueryData<GetAppraisalByIdResponseType>(
        queryKey,
        old => old && { ...old, inspectionNumber },
      );
    },
    onError: error => {
      toast.error(errorText(error, t('constructionInspection.editRound.saveFailed')));
    },
  });
};

// The API serializes with DefaultIgnoreCondition.WhenWritingNull, so null fields are OMITTED
// from the JSON entirely — use .nullish() (not .nullable()) for every optional field.
// appraisalId is absent only on the last item of a chain that reaches back past CAS to a legacy
// AS400 book (99A…): it has a number, date and value but no appraisal to open.
const previousAppraisalChainItemSchema = z.object({
  appraisalId: z.string().nullish(),
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
