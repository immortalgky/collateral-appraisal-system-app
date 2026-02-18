import { useQuery } from '@tanstack/react-query';
import {
  GetComparativeFactorsResponse,
  GetPricingTemplateByMethodResponse,
  type GetComparativeFactorsResponseType,
  type GetPricingTemplatesByMethodResponseType,
} from '../schemas/v1';
import axios from '@shared/api/axiosInstance';
import {
  DIRECT_COMPARISON_TEMPLATES,
  SALE_GRID_TEMPLATES,
  WQS_TEMPLATES,
} from '../data/templatesData';

interface useInitializeCalculationMethodProps {
  appraisalId: string;
  methodId: string;
  methodType: string;
}
export function useInitializeCalculationMethod({
  appraisalId,
  methodId,
  methodType,
}: useInitializeCalculationMethodProps) {
  // Step 1: Fetch pricing template that belong to method type
  const pricingTemplateQuery = useQuery({
    queryKey: ['price-analysis-template', methodType],
    queryFn: async (): Promise<GetPricingTemplatesByMethodResponseType> => {
      await new Promise(resolve => setTimeout(resolve, 1000));

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

      if (!parse.success) {
        console.log(parse.error);
        throw parse.error;
      }
      return parse.data;
    },
    enabled: !!methodType,
    refetchOnWindowFocus: false, // don't refetch when tab focuses
    refetchOnReconnect: false,
    staleTime: Infinity,
    retry: 1,
  });

  // Step 2: Fetch comparative factors
  const comparativeFactorsQuery = useQuery({
    queryKey: ['price-analysis', appraisalId, ['comparative-factors'], methodId],
    queryFn: async (): Promise<GetComparativeFactorsResponseType> => {
      const { data } = await axios.get(
        `/pricing-analysis/${appraisalId}/methods/${methodId}/comparative-factors`,
      );
      const parse = GetComparativeFactorsResponse.safeParse(data);

      if (!parse.success) {
        throw parse.error;
      }
      return parse.data;
    },
    enabled: !!appraisalId && !!methodId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  const isLoading = pricingTemplateQuery.isLoading || comparativeFactorsQuery.isLoading;

  const error = comparativeFactorsQuery.error;

  const pricingTemplate = pricingTemplateQuery.data?.templates;
  const comparativeFactors = comparativeFactorsQuery.data;

  console.log(pricingTemplate, comparativeFactors);

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
