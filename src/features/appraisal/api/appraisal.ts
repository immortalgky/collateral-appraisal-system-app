import type { GetAppraisalByIdResponseType } from '@/shared/schemas/v1';
import { useQuery } from '@tanstack/react-query';
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
