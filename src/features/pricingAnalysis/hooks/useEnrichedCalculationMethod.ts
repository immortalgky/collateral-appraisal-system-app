import { useQuery } from '@tanstack/react-query';
import {
  GetComparativeFactorsResponse,
  GetPricingTemplateByMethodResponse,
  type GetComparativeFactorsResponseType,
  type GetPricingTemplatesByMethodResponseType,
} from '../schemas';
import axios from '@shared/api/axiosInstance';
import {
  DIRECT_COMPARISON_TEMPLATES,
  SALE_GRID_TEMPLATES,
  WQS_TEMPLATES,
} from '../data/templatesData';
import { pricingAnalysisKeys } from '../api/queryKeys';

interface UseEnrichedCalculationMethodProps {
  pricingAnalysisId: string;
  methodId: string;
  methodType: string;
}

export function useEnrichedCalculationMethod({
  pricingAnalysisId,
  methodId,
  methodType,
}: UseEnrichedCalculationMethodProps) {
  // Step 1: Fetch pricing template that belong to method type
  const pricingTemplateQuery = useQuery({
    queryKey: pricingAnalysisKeys.template(methodType),
    queryFn: async (): Promise<GetPricingTemplatesByMethodResponseType> => {
      let parse;
      switch (methodType) {
        case 'WQS_MARKET':
          parse = GetPricingTemplateByMethodResponse.safeParse(WQS_TEMPLATES);
          break;
        case 'SAG_MARKET':
          parse = GetPricingTemplateByMethodResponse.safeParse(SALE_GRID_TEMPLATES);
          break;
        case 'DC_MARKET':
          parse = GetPricingTemplateByMethodResponse.safeParse(DIRECT_COMPARISON_TEMPLATES);
          break;
        default:
          parse = GetPricingTemplateByMethodResponse.safeParse(null);
      }

      if (!parse.success) throw parse.error;
      return parse.data;
    },
    enabled: !!methodType,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    retry: 1,
  });

  // Step 2: Fetch comparative factors
  const comparativeFactorsQuery = useQuery({
    queryKey: pricingAnalysisKeys.comparativeFactors(pricingAnalysisId, methodId),
    queryFn: async (): Promise<GetComparativeFactorsResponseType> => {
      const { data } = await axios.get(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/comparative-factors`,
      );
      const parse = GetComparativeFactorsResponse.safeParse(data);

      if (!parse.success) throw parse.error;
      return parse.data;
    },
    enabled: !!pricingAnalysisId && !!methodId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  const isLoading = pricingTemplateQuery.isLoading || comparativeFactorsQuery.isLoading;
  const error = comparativeFactorsQuery.error;

  const pricingTemplate = pricingTemplateQuery.data?.templates;
  const comparativeFactors = comparativeFactorsQuery.data;

  const calculationMethodData = {
    pricingTemplate,
    comparativeFactors,
  };

  return {
    calculationMethodData,
    isLoading,
    error,
  };
}
