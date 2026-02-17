import { useQueries, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { propertyGroupKeys, type GetPropertyGroupByIdResponse } from '@/features/appraisal/api';
import { GET_PROPERTY_GROUP_BY_ID_RESPONSE } from '../../data/data';
import { useGetPricingAnalysis } from '../../api/api';
import { MAPPED_MARKET_COMPARABLE_DATA } from '@features/appraisal/components/priceAnalysis/data/marketSurveyData.ts';
import {
  GetMarketComparableByIdResponse,
  type GetMarketComparablesByIdResponseType,
  GetMarketComparablesResponse,
  type GetMarketComparablesResponseType,
  PriceAnalysisConfig,
  type PriceAnalysisConfigType,
} from '@features/appraisal/components/priceAnalysis/schemas/v1.ts';
import { PROPERTIES } from '@features/appraisal/components/priceAnalysis/data/propertiesData.ts';
import type { PropertyItem, PropertyType } from '@features/appraisal/types';

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
  // Step 1: For a group, fetch group detail (to get property IDs + types)
  const groupDetailQuery = useQuery({
    queryKey: propertyGroupKeys.detail(appraisalId!, groupId),
    queryFn: async (): Promise<GetPropertyGroupByIdResponse> => {
      // const { data } = await axios.get(`/appraisals/${appraisalId}/property-groups/${groupId}`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 3000));
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
      allPropertyEntries.push({
        propertyId: prop.propertyId,
        propertyType: prop.propertyType ?? 'Lands',
        groupId,
        sequenceInGroup: prop.sequenceInGroup,
      });
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

  // Step 3: fetch market surveys in application
  const marketSurveysQuery = useQuery({
    queryKey: ['market-survey'],
    queryFn: async (): Promise<GetMarketComparablesResponseType> => {
      // const { data } = await axios.get(`/market-comparable/`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 3000));
      return GetMarketComparablesResponse.parse(GET_PROPERTY_GROUP_BY_ID_RESPONSE);
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
  const marketSurveyDetailQueries = useQueries({
    queries: allMarketSurveyEntries.map(entry => {
      return {
        queryKey: ['pricing-market', entry.id, appraisalId],
        queryFn: async (): Promise<GetMarketComparablesByIdResponseType> => {
          // const { data } = await axios.get(`/market-comparables/${entry.id}`);
          // return data as Record<string, unknown>;
          return GetMarketComparableByIdResponse.parse(mapping_mock_survey_data.get(entry.id));
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
    queryFn: async (): Promise<PriceAnalysisConfigType> => {
      const res = await fetch(
        '/src/features/appraisal/components/priceAnalysis/data/priceAnalysis.config.json',
        { cache: 'no-store' },
      );

      if (!res.ok) {
        throw new Error(`Config fetch failed (${res.status})`);
      }

      const json = await res.json();
      return PriceAnalysisConfig.parse(json);
    },

    /** set stateTime infinit since this is a static config */
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Step: 5 Fetch price analysis selection data
  const pricingSelectionQuery = useGetPricingAnalysis(groupId);

  // Step 5: Assemble wait until all data finished
  const isLoadingGroupDetails = groupDetailQuery.isLoading;
  const isLoadingPropertyDetails = propertyDetailQueries.some(q => q.isLoading);
  const isLoadingMarketSurveyDetails = marketSurveyDetailQueries.some(q => q.isLoading);
  const isLoadingPricingConfiguration = pricingConfigurationQuery.isLoading;
  const isLoadingPricingSelection = pricingSelectionQuery.isLoading;

  // Only groups-level and group-detail-level errors are fatal.
  // Property detail errors are non-fatal — the property just shows minimal info.
  const isLoading =
    isLoadingGroupDetails ||
    isLoadingPropertyDetails ||
    isLoadingMarketSurveyDetails ||
    isLoadingPricingConfiguration ||
    isLoadingPricingSelection;
  const error = pricingConfigurationQuery.error;

  // Build a lookup map for property details
  const propertyDetailMap = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < allPropertyEntries.length; i++) {
    const detail = propertyDetailQueries[i]?.data;
    if (detail) {
      propertyDetailMap.set(allPropertyEntries[i].propertyId, detail);
    }
  }

  const groupDetail = groupDetailQuery?.data;
  const properties = groupDetail?.properties ?? [];
  const marketSurveyDetails = marketSurveyDetailQueries?.map(q => q.data);
  const pricingConfiguration = pricingConfigurationQuery?.data;
  const pricingSelection = pricingSelectionQuery?.data ?? {
    id: '',
    propertyGroupId: groupId,
    status: '',
    finalMarketValue: 0,
    finalAppraisedValue: 0,
    finalForcedSaleValue: 0,
    valuationDate: new Date(),
    approaches: [],
  };

  const _groupDetail = GET_PROPERTY_GROUP_BY_ID_RESPONSE;
  const _property = PROPERTIES[0];
  const initialData = {
    groupDetail: _groupDetail, // groupDetail
    properties: _property, // properties
    marketSurveyDetails,
    pricingConfiguration,
    pricingSelection,
  };

  return {
    initialData,
    isLoading,
    error,
  };
}
