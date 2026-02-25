import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  GetLawAndRegulationsResultType,
  SaveLawAndRegulationsRequestType,
  SaveLawAndRegulationsResponseType,
} from '@shared/schemas/v1';

export const lawAndRegulationKeys = {
  all: (appraisalId: string | undefined) =>
    ['appraisal', appraisalId, 'law-and-regulations'] as const,
};

/**
 * Get all law and regulation items for an appraisal
 * GET /appraisals/{appraisalId}/law-and-regulations
 */
export const useGetLawAndRegulations = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: lawAndRegulationKeys.all(appraisalId),
    queryFn: async (): Promise<GetLawAndRegulationsResultType> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/law-and-regulations`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Batch save (replace all) law and regulation items
 * PUT /appraisals/{appraisalId}/law-and-regulations
 */
export const useSaveLawAndRegulations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      ...body
    }: SaveLawAndRegulationsRequestType & {
      appraisalId: string;
    }): Promise<SaveLawAndRegulationsResponseType> => {
      const { data } = await axios.put(`/appraisals/${appraisalId}/law-and-regulations`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: lawAndRegulationKeys.all(variables.appraisalId),
      });
    },
  });
};
