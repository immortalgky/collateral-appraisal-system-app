import { useMemo, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { schemas } from '@shared/schemas/v1';
import type { z } from 'zod';
import { propertyGroupKeys, useGetPropertyGroups } from '../api/propertyGroup';
import type { PropertyGroup, PropertyItem, PropertyPhoto, PropertyType } from '../types';

type GetPropertyGroupByIdResponse = z.infer<typeof schemas.GetPropertyGroupByIdResponse>;
type PropertyGroupItem = z.infer<typeof schemas.PropertyGroupItemDto>;

// ==================== Helpers ====================

const LAND_TYPES = new Set([
  'L',
  'LB',
  'Lands',
  'Land and building',
  'Lease Agreement Lands',
  'Lease Agreement Land and building',
]);

function formatWaToRaiNganWa(totalWa: number): string {
  const rai = Math.floor(totalWa / 400);
  const ngan = Math.floor((totalWa % 400) / 100);
  const wa = totalWa % 100;
  return `${rai}-${ngan}-${wa} (${totalWa} sq.wa)`;
}

function formatArea(area: number | null | undefined, propertyType: string | undefined): string {
  if (area == null) return '-';
  if (propertyType && LAND_TYPES.has(propertyType)) return formatWaToRaiNganWa(area);
  return `${area} sq.m.`;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function mapGroupItemToPropertyItem(item: PropertyGroupItem): PropertyItem {
  const photos: PropertyPhoto[] = (item.photos ?? []).map(p => ({
    documentId: p.documentId,
    isThumbnail: p.isThumbnail,
  }));
  const thumbnailId =
    photos.find(p => p.isThumbnail)?.documentId ?? photos[0]?.documentId;

  return {
    id: item.propertyId!,
    type: (item.propertyType as PropertyType) || 'Lands',
    image: thumbnailId
      ? `${API_BASE_URL}/documents/${thumbnailId}/download?download=false&size=large`
      : undefined,
    photos,
    address: item.propertyName || '-',
    area: formatArea(item.area, item.propertyType ?? undefined),
    priceRange: '-',
    location: item.location || '-',
    sequenceNumber: item.sequenceInGroup ?? undefined,
    detailId: item.appraisalDetailId ?? undefined,
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

  const groupIds = useMemo(
    () => groupsData?.groups?.map(g => g.id) ?? [],
    [groupsData],
  );

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
          useSystemCalc: apiGroup.useSystemCalc,
          pricingAnalysisId: groupDetail?.pricingAnalysisId ?? null,
        };
      }),
    [groupsData, groupDetailData],
  );

  const isFetching = isFetchingGroups || isFetchingDetails;

  return {
    groups,
    isLoading,
    isFetching,
    error,
    isLoadingGroups,
    isLoadingGroupDetails: isLoadingDetails,
  };
}
