import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import axios from '@shared/api/axiosInstance';
import { type GetPropertyGroupByIdResponse, propertyGroupKeys } from '@/features/appraisal/api';
import {
  type FactorDataType,
  type GetMarketComparableByIdResponseType,
  type MarketComparableDetailType,
  type GetPricingAnalysisResponseType,
  PricingAnalysisConfigResponse,
} from '../schemas';
import pricingAnalysisConfig from '../data/pricingAnalysis.config.json';
import { pricingAnalysisKeys } from '../api/queryKeys';
import { useProjectModelPricingContext } from './useProjectModelPricingContext';
import type { FlatContext } from '../utils/flattenPricingContext';
import type { ProjectModel } from '@/features/blockProject/types';
import { useGetGalleryPhotos } from '@/features/appraisal/api/gallery';
import { toGalleryImage } from '@/features/appraisal/types/gallery';
import type { GalleryPhotoDtoType } from '@shared/schemas/v1';

// Stable fallback for new pricing analyses — avoids creating a new object every render
const EMPTY_PRICING_SELECTION = { approaches: [] } as unknown as GetPricingAnalysisResponseType;

// Parse config at module level — pricingAnalysisConfig is a static JSON import,
// so parsing inside the hook body creates a new reference every render and
// causes infinite re-render loops when used as a useEffect dependency.
const pricingConfigParsed = PricingAnalysisConfigResponse.safeParse(pricingAnalysisConfig);
const PRICING_CONFIG_DATA = pricingConfigParsed.success ? pricingConfigParsed.data : undefined;
const PRICING_CONFIGURATION = PRICING_CONFIG_DATA?.approaches;

// ==================== Hook ===================

export function useEnrichedPricingAnalysis({
  appraisalId,
  groupId,
  pricingAnalysisId,
  skipGroupDetail = false,
}: {
  appraisalId: string;
  /** For propertyGroup: the group ID. For projectModel: the model ID. */
  groupId: string;
  pricingAnalysisId: string;
  /** Set true for model-level pricing analyses where there is no PropertyGroup. */
  skipGroupDetail?: boolean;
}) {
  // Step 0: For projectModel subjects, fetch the model to get its projectId,
  // then fetch the combined pricing context (project + tower + model).
  // When skipGroupDetail=false this branch stays disabled.
  const modelDetailQuery = useQuery({
    queryKey: ['appraisal', appraisalId, 'project', 'models', groupId],
    queryFn: async (): Promise<ProjectModel> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/project/models/${groupId}`);
      return data as ProjectModel;
    },
    enabled: !!appraisalId && !!groupId && skipGroupDetail,
    staleTime: Infinity,
    retry: 1,
  });

  const projectId = modelDetailQuery.data?.projectId ?? '';

  // Resolve the model's thumbnail src (only for projectModel subjects)
  const galleryPhotosQuery = useGetGalleryPhotos(skipGroupDetail ? appraisalId : undefined);
  const modelThumbnailSrc = useMemo<string | undefined>(() => {
    if (!skipGroupDetail) return undefined;
    const model = modelDetailQuery.data;
    const cover = model?.images?.find(i => i.isThumbnail);
    if (!cover) return undefined;
    const photos = (galleryPhotosQuery.data?.photos ?? []) as GalleryPhotoDtoType[];
    const photo = photos.find(p => p.id === cover.galleryPhotoId);
    return photo ? toGalleryImage(photo).thumbnailSrc : undefined;
  }, [skipGroupDetail, modelDetailQuery.data, galleryPhotosQuery.data]);

  const pricingContextResult = useProjectModelPricingContext({
    appraisalId,
    projectId,
    modelId: groupId,
    enabled: skipGroupDetail && !!projectId,
  });

  // Step 1: For a group, fetch group detail (to get property IDs + types)
  const groupDetailQuery = useQuery({
    queryKey: [propertyGroupKeys.detail(appraisalId!, groupId), 'price'],
    queryFn: async (): Promise<GetPropertyGroupByIdResponse> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/property-groups/${groupId}`);
      return data;
    },
    enabled: !!appraisalId && !!groupId && !skipGroupDetail,
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
          propertyType: prop.propertyType ?? 'L',
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
        enabled: !!appraisalId && !!endpoint && !skipGroupDetail,
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
    (!skipGroupDetail && groupDetailQuery.isLoading) ||
    (skipGroupDetail && (modelDetailQuery.isLoading || pricingContextResult.isLoading)) ||
    propertyDetailQueries.some(q => q.isLoading) ||
    marketSurveyDetailQueries.some(q => q.isLoading) ||
    pricingSelectionQuery.isLoading ||
    allFactorQuery.isLoading;

  const error = pricingSelectionQuery.error;

  const groupDetail = groupDetailQuery.data;
  const properties = propertyDetailQueries.map(q => q.data).filter(Boolean) as Record<
    string,
    unknown
  >[];

  // Map propertyId → detail data for panels that need all properties (e.g., CostMachinePanel)
  // Memoized to prevent infinite re-render loops when used as a dependency
  const propertiesMap = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    allPropertyEntries.forEach((entry, idx) => {
      const data = propertyDetailQueries[idx]?.data;
      if (data) map[entry.propertyId] = data;
    });
    return map;
  }, [
    allPropertyEntries.map(entry => entry.propertyId).join(','),
    propertyDetailQueries.map(q => q.dataUpdatedAt).join(','),
  ]);

  const marketSurveyDetails = marketSurveyDetailQueries
    .map(q => q.data?.marketComparable)
    .filter(Boolean) as MarketComparableDetailType[];
  const pricingConfiguration = PRICING_CONFIGURATION;
  const pricingSelection = pricingSelectionQuery.data ?? EMPTY_PRICING_SELECTION;
  const allFactors = allFactorQuery.data;

  // For projectModel subjects, expose the flat context so the scoring forms
  // can resolve subject column values via factor.fieldName. Also expose it
  // as a single-entry properties array so existing panel prop chains that
  // read properties[0] work without modification.
  const flatContext: FlatContext | undefined = skipGroupDetail
    ? pricingContextResult.flat
    : undefined;

  // When subject is projectModel, inject flat as properties[0] so panels
  // that use properties[0] for the subject column get the resolved values.
  const effectiveProperties = skipGroupDetail && flatContext
    ? [flatContext as Record<string, unknown>]
    : properties;

  return {
    groupDetail,
    properties: effectiveProperties,
    propertiesMap,
    marketSurveyDetails,
    pricingConfiguration,
    pricingSelection,
    allFactors,
    isLoading,
    error,
    /** Flat pricing context — only populated when skipGroupDetail=true (projectModel subject) */
    flatContext,
    pricingContext: pricingContextResult.context,
    /** Resolved thumbnail src for the project model (projectModel subjects only) */
    modelThumbnailSrc,
  };
}

// ==================== Type-to-Endpoint Mapping ====================

const typeToDetailEndpoint: Record<string, string> = {
  Lands: 'land-detail',
  'Lease Agreement Lands': 'land-detail',
  'Lease Agreement Building': 'building-detail',
  'Land and building': 'land-and-building-detail',
  'Lease Agreement Land and building': 'land-and-building-detail',
  Condominium: 'condo-detail',
  MAC: 'machinery-detail',
  Vehicle: 'vehicle-detail',
  Vessel: 'vessel-detail',
  L: 'land-detail',
  U: 'condo-detail',
  LB: 'land-and-building-detail',
  B: 'building-detail',
  LS: 'lease-agreement-land-building-detail',
  LSL: 'lease-agreement-land-detail',
  LSB: 'lease-agreement-building-detail',
};
