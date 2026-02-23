import { useQueries, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { propertyGroupKeys, type GetPropertyGroupByIdResponse } from '@/features/appraisal/api';
import { APPROACHES_QUERY_RESPONSE, GET_PROPERTY_GROUP_BY_ID_RESPONSE } from '../data/data';
import {
  MAPPED_MARKET_COMPARABLE_DATA,
  MARKET_COMPARABLES,
} from '@features/appraisal/components/priceAnalysis/data/marketSurveyData.ts';
import {
  type FactorDataType,
  GetMarketComparableByIdResponse,
  type GetMarketComparableByIdResponseType,
  GetMarketComparablesResponse,
  type GetMarketComparablesResponseType,
  GetPricingAnalysisResponse,
  type GetPricingAnalysisResponseType,
  PriceAnalysisConfigResponse,
  type PriceAnalysisConfigResponseType,
} from '@features/appraisal/components/priceAnalysis/schemas/v1.ts';
import { PROPERTIES } from '@features/appraisal/components/priceAnalysis/data/propertiesData.ts';
import type { PropertyItem, PropertyType } from '@features/appraisal/types';
import { ALL_FACTORS } from '../data/allFactorsData';

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

// ==================== Helpers ====================

function formatPrice(value: number | null | undefined): string {
  if (value == null) return '';
  return `฿${value.toLocaleString()}`;
}

function buildPriceRange(
  sellingPrice: number | null | undefined,
  forcedSalePrice: number | null | undefined,
): string {
  const selling = formatPrice(sellingPrice);
  const forced = formatPrice(forcedSalePrice);
  if (selling && forced) return `${forced} - ${selling}`;
  if (selling) return selling;
  if (forced) return forced;
  return '-';
}

function buildLocation(
  subDistrict: string | null | undefined,
  district: string | null | undefined,
  province: string | null | undefined,
): string {
  return [subDistrict, district, province].filter(Boolean).join(', ') || '-';
}

function buildArea(detail: Record<string, unknown>): string {
  if (detail.totalBuildingArea != null) return `${detail.totalBuildingArea} sq.m.`;
  if (detail.usableArea != null) return `${detail.usableArea} sq.m.`;
  return '-';
}

function mapDetailToPropertyItem(detail: Record<string, unknown>): PropertyItem {
  return {
    id: detail.propertyId as string,
    type: (detail.propertyType as PropertyType) || 'Lands',
    address: (detail.propertyName as string) || '-',
    area: buildArea(detail),
    priceRange: buildPriceRange(
      detail.sellingPrice as number | null,
      detail.forcedSalePrice as number | null,
    ),
    location:
      (detail.location as string) ||
      buildLocation(
        detail.subDistrict as string | null,
        detail.district as string | null,
        detail.province as string | null,
      ),
    sequenceNumber: detail.sequenceNumber as number | undefined,
    detailId: (detail.detailId ?? detail.landDetailId) as string | undefined,
  };
}

// ==================== Hook ===================

export function useInitializePriceAnalysis({
  appraisalId,
  groupId,
  pricingAnalysisId,
}: {
  appraisalId: string;
  groupId: string;
  pricingAnalysisId: string;
}) {
  // Step 5: Fetch price analysis selection data
  /** TODO: right now, GetPricingAnalysis not return methods */

  // Step 1: For a group, fetch group detail (to get property IDs + types)
  const groupDetailQuery = useQuery({
    queryKey: propertyGroupKeys.detail(appraisalId!, groupId),
    queryFn: async (): Promise<GetPropertyGroupByIdResponse> => {
      // const { data } = await axios.get(`/appraisals/${appraisalId}/property-groups/${groupId}`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 1000));
      return GET_PROPERTY_GROUP_BY_ID_RESPONSE;
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
    const groupId = groupDetailQuery.data.id;
    const properties = groupDetailQuery.data.properties ?? [];
    for (const prop of properties) {
      if (!!prop.propertyId && !!prop.sequenceInGroup) {
        allPropertyEntries.push({
          propertyId: prop.propertyId,
          propertyType: prop.propertyType ?? 'Lands',
          groupId,
          sequenceInGroup: prop.sequenceInGroup,
        });
      }
    }
  }

  // // Step 2: For each property, fetch its detail (non-fatal — failures are gracefully handled)
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

  // Step 3: fetch market surveys in application
  const marketSurveysQuery = useQuery({
    queryKey: ['market-survey'],
    queryFn: async (): Promise<GetMarketComparablesResponseType> => {
      // const { data } = await axios.get(`/market-comparable/`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 3000));
      const parse = GetMarketComparablesResponse.safeParse(MARKET_COMPARABLES);
      if (!parse.success) {
        throw parse.error;
      }
      return parse.data;
    },
    enabled: !!appraisalId && !!groupId,
    staleTime: Infinity,
    retry: 1,
  });

  // loop add survey ID
  const allMarketSurveyEntries: Array<{ id: string }> = [];
  if (marketSurveysQuery.data) {
    marketSurveysQuery.data.marketComparables.map(survey => {
      allMarketSurveyEntries.push({
        id: String(survey.id),
      });
    });
  }

  // Step 3.1: For each market survey, fetch its detail
  const mapping_mock_survey_data = new Map(MAPPED_MARKET_COMPARABLE_DATA.map(s => [s.id, s]));
  console.log('all entries', allMarketSurveyEntries);
  const marketSurveyDetailQueries = useQueries({
    queries: allMarketSurveyEntries.map(entry => {
      return {
        queryKey: ['pricing-market', entry.id, appraisalId],
        queryFn: async (): Promise<GetMarketComparableByIdResponseType> => {
          // const { data } = await axios.get(`/market-comparables/${entry.id}`);
          // return data as Record<string, unknown>;
          const parse = GetMarketComparableByIdResponse.safeParse(
            mapping_mock_survey_data.get(entry.id),
          );
          if (!parse.success) {
            throw parse.error;
          }
          console.log(parse.data);
          return parse.data;
        },
        enabled: !!appraisalId && !!entry.id,
        staleTime: Infinity,
        retry: 1,
      };
    }),
  });

  // Step 4: Fetch price analysis config
  /** fetch price analysis configuration on json file. The configuration file consist of 1 approach can include which method */
  const pricingConfigurationQuery = useQuery({
    queryKey: ['price-analysis-config'],
    queryFn: async (): Promise<PriceAnalysisConfigResponseType> => {
      const res = await fetch(
        '/src/features/appraisal/components/priceAnalysis/data/priceAnalysis.config.json',
        { cache: 'no-store' },
      );

      if (!res.ok) {
        throw new Error(`Config fetch failed (${res.status})`);
      }

      const json = await res.json();
      const parsed = PriceAnalysisConfigResponse.safeParse(json);
      if (!parsed.success) {
        throw parsed.error;
      }
      return parsed.data;
    },

    /** set stateTime infinit since this is a static config */
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // // Step 5: Fetch price analysis selection data
  // /** TODO: right now, GetPricingAnalysis not return methods */
  const pricingSelectionQuery = useQuery({
    queryKey: ['price-analysis', pricingAnalysisId],
    queryFn: async (): Promise<GetPricingAnalysisResponseType> => {
      // const { data } = await axios.get(`/pricing-analysis/${pricingAnalysisId}`);
      // const parse = GetPricingAnalysisResponse.safeParse(data);

      // if (!parse.success) {
      //   console.log(parse.error);
      //   throw parse.error;
      // }
      // return parse.data;

      // MOCK delay:
      await new Promise(resolve => setTimeout(resolve, 1000));
      const parsed = GetPricingAnalysisResponse.safeParse(APPROACHES_QUERY_RESPONSE);
      if (!parsed.success) {
        console.error('PricingAnalysis schema error', parsed.error.flatten());
        throw parsed.error;
      }
      return parsed.data;
    },
    enabled: !!pricingAnalysisId,
    refetchOnWindowFocus: false, // don't refetch when tab focuses
    refetchOnReconnect: false,
    staleTime: Infinity,
    retry: 1,
  });

  // Step 6: Fetch all factors
  const allFactorQuery = useQuery({
    queryKey: ['all-factors'],
    queryFn: async (): Promise<FactorDataType> => {
      // const { data } = await axios.get(`/market-comparable-factors`);

      // MOCK delay:
      await new Promise(resolve => setTimeout(resolve, 1000));
      return ALL_FACTORS;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    retry: 1,
  });

  // Step 5: Assemble wait until all data finished
  const isLoadingGroupDetails = groupDetailQuery.isLoading;
  const isLoadingPropertyDetails = propertyDetailQueries.some(q => q.isLoading);
  const isLoadingMarketSurveyDetails = marketSurveyDetailQueries.some(q => q.isLoading);
  const isLoadingPricingConfiguration = pricingConfigurationQuery.isLoading;
  const isLoadingPricingSelection = pricingSelectionQuery.isLoading;
  const isLoadingAllFactor = allFactorQuery.isLoading;

  // Only groups-level and group-detail-level errors are fatal.
  // Property detail errors are non-fatal — the property just shows minimal info.
  const isLoading =
    isLoadingGroupDetails ||
    isLoadingPropertyDetails ||
    isLoadingMarketSurveyDetails ||
    isLoadingPricingConfiguration ||
    isLoadingPricingSelection ||
    isLoadingAllFactor;
  const error = pricingConfigurationQuery.error;

  // // Build a lookup map for property details
  const propertyDetailMap = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < allPropertyEntries.length; i++) {
    const detail = propertyDetailQueries[i]?.data;
    if (detail) {
      propertyDetailMap.set(allPropertyEntries[i].propertyId, detail);
    }
  }

  const groupDetail = groupDetailQuery.data;
  const properties = groupDetail?.properties;
  const marketSurveyDetails = marketSurveyDetailQueries.map(q => q.data);
  const pricingConfiguration = pricingConfigurationQuery.data?.approaches;
  const pricingSelection = pricingSelectionQuery.data;
  const allFactors = allFactorQuery.data;

  console.log('pricing analysis', pricingSelection);

  const _groupDetail = GET_PROPERTY_GROUP_BY_ID_RESPONSE;
  const _property = PROPERTIES[1];
  const initialData = {
    groupDetail: _groupDetail, // groupDetail
    properties: _property, // properties
    marketSurveyDetails,
    pricingConfiguration,
    pricingSelection,
    allFactors,
  };

  return {
    initialData,
    isLoading,
    error,
  };
}
