import { useQueries, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { type GetPropertyGroupByIdResponse, propertyGroupKeys } from '@/features/appraisal/api';
import {
  type FactorDataType,
  type GetMarketComparableByIdResponseType,
  type MarketComparableDetailType,
  type GetPricingAnalysisResponseType,
  PriceAnalysisConfigResponse,
} from '../schemas';
import priceAnalysisConfig from '../data/priceAnalysis.config.json';
import { pricingAnalysisKeys } from '../api/queryKeys';

// Stable fallback for new pricing analyses — avoids creating a new object every render
const EMPTY_PRICING_SELECTION = { approaches: [] } as unknown as GetPricingAnalysisResponseType;

// Parse config at module level — priceAnalysisConfig is a static JSON import,
// so parsing inside the hook body creates a new reference every render and
// causes infinite re-render loops when used as a useEffect dependency.
const pricingConfigParsed = PriceAnalysisConfigResponse.safeParse(priceAnalysisConfig);
if (!pricingConfigParsed.success) {
  console.error('PriceAnalysis config schema error', pricingConfigParsed.error.flatten());
}
const PRICING_CONFIG_DATA = pricingConfigParsed.success ? pricingConfigParsed.data : undefined;
const PRICING_CONFIGURATION = PRICING_CONFIG_DATA?.approaches;

// ==================== Hook ===================

export function useEnrichedPricingAnalysis({
  appraisalId,
  groupId,
  pricingAnalysisId,
}: {
  appraisalId: string;
  groupId: string;
  pricingAnalysisId: string;
}) {
  // Step 1: For a group, fetch group detail (to get property IDs + types)
  const groupDetailQuery = useQuery({
    queryKey: propertyGroupKeys.detail(appraisalId!, groupId),
    queryFn: async (): Promise<GetPropertyGroupByIdResponse> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/property-groups/${groupId}`);
      return data;
    },
    enabled: !!appraisalId && !!groupId,
    staleTime: Infinity,
    retry: 1,
  });

  // Collect all property entries with their types from group details
  const allPropertyEntries: Array<{
    propertyId: string;
    propertyType: string;
    groupId: string;
    sequenceInGroup: number;
  }> = [];

  if (groupDetailQuery.data) {
    const gId = groupDetailQuery.data.id;
    const properties = groupDetailQuery.data.properties ?? [];
    for (const prop of properties) {
      if (!!prop.propertyId && !!prop.sequenceInGroup) {
        allPropertyEntries.push({
          propertyId: prop.propertyId,
          propertyType: prop.propertyType ?? 'Lands',
          groupId: gId,
          sequenceInGroup: prop.sequenceInGroup,
        });
      }
    }
  }

  // Step 2: For each property, fetch its detail (non-fatal — failures are gracefully handled)
  const propertyDetailQueries = useQueries({
    queries: allPropertyEntries.map(entry => {
      const endpoint = typeToDetailEndpoint[entry.propertyType];
      return {
        queryKey: propertyGroupKeys.propertyDetail(appraisalId!, entry.propertyId),
        queryFn: async () => {
          const { data } = await axios.get(
            `/appraisals/${appraisalId}/properties/${entry.propertyId}/${endpoint}`,
          );
          return data as Record<string, unknown>;
        },
        enabled: !!appraisalId && !!endpoint,
        staleTime: Infinity,
        retry: 1,
      };
    }),
  });

  // Step 3: fetch market comparables from real API
  const marketSurveysQuery = useQuery({
    queryKey: pricingAnalysisKeys.comparables(appraisalId),
    queryFn: async () => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/comparables`);
      return data?.comparables ?? [];
    },
    enabled: !!appraisalId,
    staleTime: Infinity,
    retry: 1,
  });

  // loop add survey ID
  const allMarketSurveyEntries: Array<{ id: string }> = [];
  if (marketSurveysQuery.data) {
    (marketSurveysQuery.data as Array<{ id: string; marketComparableId: string }>).map(survey => {
      allMarketSurveyEntries.push({
        id: String(survey.marketComparableId),
      });
    });
  }

  // Step 3.1: For each market survey, fetch its detail from real API
  const marketSurveyDetailQueries = useQueries({
    queries: allMarketSurveyEntries.map(entry => {
      return {
        queryKey: pricingAnalysisKeys.marketComparableDetail(entry.id),
        queryFn: async (): Promise<GetMarketComparableByIdResponseType> => {
          const { data } = await axios.get(`/market-comparables/${entry.id}`);
          return data as GetMarketComparableByIdResponseType;
        },
        enabled: !!appraisalId && !!entry.id,
        staleTime: Infinity,
        retry: 1,
      };
    }),
  });

  // Step 4: Price analysis config — parsed once at module level (see above)

  // Step 5: Fetch price analysis selection data from real API
  const pricingSelectionQuery = useQuery({
    queryKey: pricingAnalysisKeys.detail(pricingAnalysisId),
    queryFn: async (): Promise<GetPricingAnalysisResponseType> => {
      const { data } = await axios.get(`/pricing-analysis/${pricingAnalysisId}`);
      return data as GetPricingAnalysisResponseType;
    },
    enabled: !!pricingAnalysisId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    retry: 1,
  });

  // Step 6: Fetch all factors from real API
  const allFactorQuery = useQuery({
    queryKey: pricingAnalysisKeys.allFactors,
    queryFn: async (): Promise<FactorDataType[]> => {
      const { data } = await axios.get('/market-comparable-factors');
      return (data?.factors ?? []) as FactorDataType[];
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    retry: 1,
  });

  // Step 7: Assemble — wait until all data finished
  const isLoading =
    groupDetailQuery.isLoading ||
    propertyDetailQueries.some(q => q.isLoading) ||
    marketSurveyDetailQueries.some(q => q.isLoading) ||
    pricingSelectionQuery.isLoading ||
    allFactorQuery.isLoading;

  const error = pricingSelectionQuery.error;

  const groupDetail = groupDetailQuery.data;
  const properties = propertyDetailQueries[0]?.data;
  const marketSurveyDetails = marketSurveyDetailQueries
    .map(q => q.data?.marketComparable)
    .filter(Boolean) as MarketComparableDetailType[];
  const pricingConfiguration = PRICING_CONFIGURATION;
  const pricingSelection = pricingSelectionQuery.data ?? EMPTY_PRICING_SELECTION;
  const allFactors = allFactorQuery.data;

  return {
    groupDetail,
    properties,
    marketSurveyDetails,
    pricingConfiguration,
    pricingSelection,
    allFactors,
    isLoading,
    error,
  };
}

// ==================== Type-to-Endpoint Mapping ====================

const typeToDetailEndpoint: Record<string, string> = {
  Lands: 'land-detail',
  'Lease Agreement Lands': 'land-detail',
  Building: 'building-detail',
  'Lease Agreement Building': 'building-detail',
  'Land and building': 'land-and-building-detail',
  'Lease Agreement Land and building': 'land-and-building-detail',
  Condominium: 'condo-detail',
  Machine: 'machinery-detail',
  Vehicle: 'vehicle-detail',
  Vessel: 'vessel-detail',
  L: 'land-detail',
  U: 'condo-detail',
  LB: 'land-and-building-detail',
};
