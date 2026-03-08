import { useQuery } from '@tanstack/react-query';
import type { GetComparativeFactorsResponseType } from '../schemas';
import axios from '@shared/api/axiosInstance';
import { pricingAnalysisKeys } from '../api/queryKeys';
import { useGetComparativeAnalysisTemplates } from '@features/templateManagement/api/comparativeTemplate';

interface UseEnrichedCalculationMethodProps {
  pricingAnalysisId: string;
  methodId: string;
  methodType: string;
}

export function useEnrichedCalculationMethod({
  pricingAnalysisId,
  methodId,
}: UseEnrichedCalculationMethodProps) {
  // Step 1: Fetch all templates (for template dropdown list)
  const templatesQuery = useGetComparativeAnalysisTemplates();

  // Step 2: Fetch comparative factors
  const comparativeFactorsQuery = useQuery({
    queryKey: pricingAnalysisKeys.comparativeFactors(pricingAnalysisId, methodId),
    queryFn: async (): Promise<GetComparativeFactorsResponseType> => {
      const { data } = await axios.get(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/comparative-factors`,
      );
      return data as GetComparativeFactorsResponseType;
    },
    enabled: !!pricingAnalysisId && !!methodId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  const isLoading = templatesQuery.isLoading || comparativeFactorsQuery.isLoading;
  const error = comparativeFactorsQuery.error;

  const comparativeFactors = comparativeFactorsQuery.data;

  const calculationMethodData = {
    pricingTemplate: undefined as undefined,
    comparativeFactors,
    templateList: templatesQuery.data,
  };

  return {
    calculationMethodData,
    isLoading,
    error,
  };
}
