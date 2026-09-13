import { useCallback, useMemo, useRef } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { schemas } from '@shared/schemas/v1';
import type { z } from 'zod';
import { propertyGroupKeys, useGetPropertyGroups } from '../api/propertyGroup';
import type { PropertyGroup, PropertyItem, PropertyPhoto, PropertyType } from '../types';
import { areaUnitFor, formatArea } from '../utils/areaFormat';

type GetPropertyGroupByIdResponse = z.infer<typeof schemas.GetPropertyGroupByIdResponse>;
type GetPricingAnalysisResponse = z.infer<typeof schemas.GetPricingAnalysisResponse>;
type PropertyGroupItem = z.infer<typeof schemas.PropertyGroupItemDto>;

// ==================== Helpers ====================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function mapGroupItemToPropertyItem(item: PropertyGroupItem): PropertyItem {
  const photos: PropertyPhoto[] = (item.photos ?? []).map(p => ({
    documentId: p.documentId,
    isThumbnail: p.isThumbnail,
    mappingId: p.mappingId ?? undefined,
  }));
  const thumbnailId = photos.find(p => p.isThumbnail)?.documentId ?? photos[0]?.documentId;

  const isMachine = item.propertyType === 'MAC';
  const isBuilding = item.propertyType === 'B' || item.propertyType === 'LSB';

  return {
    id: item.propertyId!,
    type: (item.propertyType as PropertyType) || 'Lands',
    image: thumbnailId
      ? `${API_BASE_URL}/documents/${thumbnailId}/download?download=false&size=large`
      : undefined,
    photos,
    address: item.propertyName || '-',
    area: isMachine ? item.dimension || '-' : formatArea(item.area, item.propertyType ?? undefined),
    // Raw figures beside the formatted string: group totals add these up rather than parsing
    // the display text back out again. Machines have no area — `area` holds their dimensions.
    areaValue: isMachine ? undefined : ((item.area as number | null | undefined) ?? undefined),
    areaUnit: isMachine ? undefined : areaUnitFor(item.propertyType ?? undefined),
    latitude: (item.latitude as number | null | undefined) ?? undefined,
    longitude: (item.longitude as number | null | undefined) ?? undefined,
    priceRange: '-',
    location: item.location || '-',
    titleNo: ((item.titleNo as string | null | undefined) ?? undefined) || undefined,
    titles: (item.titles as PropertyItem['titles']) ?? undefined,
    sequenceNumber: item.sequenceInGroup ?? undefined,
    detailId: item.appraisalDetailId ?? undefined,
    ...(isMachine
      ? {
          brand: item.brand ?? undefined,
          model: item.model ?? undefined,
          registrationNumber: item.registrationNumber ?? undefined,
          dimension: item.dimension ?? undefined,
          registrationStatus: item.registrationStatus ?? undefined,
          isPriceCertified: item.isPriceCertified ?? undefined,
          conditionUse: item.conditionUse ?? undefined,
        }
      : {}),
    ...(isBuilding
      ? {
          buildingType: item.buildingType ?? undefined,
          buildingTypeOther: item.buildingTypeOther ?? undefined,
          numberOfFloors: item.numberOfFloors ?? undefined,
        }
      : {}),
  };
}

// ==================== Hook ====================

export function useEnrichedPropertyGroups(appraisalId: string | undefined) {
  // Step 1: Fetch the list of groups
  const {
    data: groupsData,
    isLoading: isLoadingGroups,
    isFetching: isFetchingGroups,
    error: groupsError,
  } = useGetPropertyGroups(appraisalId);

  const groupIds = useMemo(() => groupsData?.groups?.map(g => g.id) ?? [], [groupsData]);

  // Step 2: For each group, fetch group detail (includes property summary fields)
  const groupDetailQueries = useQueries({
    queries: groupIds.map(groupId => ({
      queryKey: propertyGroupKeys.detail(appraisalId!, groupId),
      queryFn: async (): Promise<GetPropertyGroupByIdResponse> => {
        const { data } = await axios.get(`/appraisals/${appraisalId}/property-groups/${groupId}`);
        return data;
      },
      enabled: !!appraisalId && groupIds.length > 0,
      retry: 1,
    })),
  });

  /**
   * Step 3: what the group's pricing analysis actually contains.
   *
   * Fetched by id rather than by group, because the by-group endpoint returns the final value
   * but not the approaches — and the existence of an analysis says nothing on its own. One is
   * created the moment anyone opens the pricing screen, so on the development database half of
   * them hold no approach, no method and no value at all. "Someone is working on this" means
   * at least one method exists.
   *
   * Only groups that have an analysis are fetched; the id arrives with the detail above, so a
   * group nobody has touched costs no request.
   */
  const pricedGroups = groupIds
    .map(id => ({
      groupId: id,
      pricingAnalysisId: groupDetailQueries.find(q => q.data?.id === id)?.data?.pricingAnalysisId,
    }))
    .filter((g): g is { groupId: string; pricingAnalysisId: string } => !!g.pricingAnalysisId);

  const pricingQueries = useQueries({
    queries: pricedGroups.map(({ groupId, pricingAnalysisId }) => ({
      queryKey: [...propertyGroupKeys.detail(appraisalId!, groupId), 'pricing'] as const,
      queryFn: async (): Promise<GetPricingAnalysisResponse> => {
        const { data } = await axios.get(`/pricing-analysis/${pricingAnalysisId}`);
        return data;
      },
      enabled: !!appraisalId,
      retry: 1,
      staleTime: 60_000,
    })),
  });

  const pricingByGroup = new Map<string, { value: number | null; hasMethods: boolean }>();
  pricedGroups.forEach(({ groupId }, i) => {
    const data = pricingQueries[i]?.data;
    pricingByGroup.set(groupId, {
      value: data?.finalAppraisedValue ?? null,
      hasMethods: (data?.approaches ?? []).some(a => (a.methods ?? []).length > 0),
    });
  });

  const isLoadingDetails = groupDetailQueries.some(r => r.isLoading);
  const isFetchingDetails = groupDetailQueries.some(r => r.isFetching);
  const detailsError = groupDetailQueries.find(r => r.error)?.error ?? null;

  // Stable reference — only update when individual query data refs actually change.
  // Cannot use useMemo with a dynamic deps array (React requires fixed-length deps),
  // so we use a ref with shallow comparison instead.
  const prevDetailDataRef = useRef<(GetPropertyGroupByIdResponse | undefined)[]>([]);
  const rawDetailData = groupDetailQueries.map(r => r.data);
  if (
    rawDetailData.length !== prevDetailDataRef.current.length ||
    rawDetailData.some((d, i) => d !== prevDetailDataRef.current[i])
  ) {
    prevDetailDataRef.current = rawDetailData;
  }
  const groupDetailData = prevDetailDataRef.current;

  const isLoading = isLoadingGroups || isLoadingDetails;
  const error = groupsError || detailsError;

  // Map to the PropertyGroup[] shape used by the frontend
  const groups: PropertyGroup[] = useMemo(
    () =>
      (groupsData?.groups ?? []).map(apiGroup => {
        const groupDetail = groupDetailData.find(d => d?.id === apiGroup.id);
        const properties = groupDetail?.properties ?? [];

        // Sort by sequenceInGroup and map to PropertyItem
        const items: PropertyItem[] = properties
          .slice()
          .sort((a, b) => (a.sequenceInGroup ?? 0) - (b.sequenceInGroup ?? 0))
          .map(mapGroupItemToPropertyItem);

        return {
          id: apiGroup.id,
          name: apiGroup.groupName,
          items,
          description: apiGroup.description,
          groupNumber: apiGroup.groupNumber,
          pricingAnalysisId: groupDetail?.pricingAnalysisId ?? null,
          appraisedValue: pricingByGroup.get(apiGroup.id)?.value ?? null,
          hasPricingMethods: pricingByGroup.get(apiGroup.id)?.hasMethods ?? false,
        };
      }),

    // render from pricingQueries; keying the memo on the serialised values keeps it stable.
    [groupsData, groupDetailData, JSON.stringify([...pricingByGroup])],
  );

  const isFetching = isFetchingGroups || isFetchingDetails;

  // Retry both waves at once. propertyGroupKeys.all is a strict prefix of
  // propertyGroupKeys.detail and invalidateQueries matches by prefix, so this
  // refetches the group list AND every group detail — including ones currently
  // in an error state. Collecting refetch off each useQueries result instead
  // would give an unstable callback: that array's identity changes every render.
  const queryClient = useQueryClient();
  const refetch = useCallback(() => {
    if (!appraisalId) return;
    void queryClient.invalidateQueries({ queryKey: propertyGroupKeys.all(appraisalId) });
  }, [queryClient, appraisalId]);

  return {
    groups,
    isLoading,
    isFetching,
    error,
    refetch,
    isLoadingGroups,
    isLoadingGroupDetails: isLoadingDetails,
  };
}
