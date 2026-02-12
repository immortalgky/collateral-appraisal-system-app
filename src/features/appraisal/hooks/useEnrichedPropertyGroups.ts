import { useQueries } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import {
  type GetPropertyGroupByIdResponse,
  propertyGroupKeys,
  useGetPropertyGroups,
} from '../api/propertyGroup';
import type { PropertyGroup, PropertyItem, PropertyType } from '../types';

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

// ==================== Hook ====================

export function useEnrichedPropertyGroups(appraisalId: string | undefined) {
  // Step 1: Fetch the list of groups
  const {
    data: groupsData,
    isLoading: isLoadingGroups,
    error: groupsError,
  } = useGetPropertyGroups(appraisalId);

  const groupIds = groupsData?.groups?.map(g => g.id) ?? [];

  // Step 2: For each group, fetch group detail (to get property IDs + types)
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

  // Collect all property entries with their types from group details
  const allPropertyEntries: Array<{
    propertyId: string;
    propertyType: string;
    groupId: string;
    sequenceInGroup: number;
  }> = [];

  for (const query of groupDetailQueries) {
    if (query.data) {
      const groupId = query.data.id;
      const properties = query.data.properties ?? [];
      for (const prop of properties) {
        allPropertyEntries.push({
          propertyId: prop.propertyId,
          propertyType: prop.propertyType ?? 'Lands',
          groupId,
          sequenceInGroup: prop.sequenceInGroup,
        });
      }
    }
  }

  // Step 3: For each property, fetch its detail (non-fatal — failures are gracefully handled)
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
        retry: 1,
      };
    }),
  });

  // Step 4: Assemble enriched groups
  const isLoadingGroupDetails = groupDetailQueries.some(q => q.isLoading);
  const isLoadingPropertyDetails = propertyDetailQueries.some(q => q.isLoading);

  // Only groups-level and group-detail-level errors are fatal.
  // Property detail errors are non-fatal — the property just shows minimal info.
  const isLoading = isLoadingGroups || isLoadingGroupDetails;
  const error = groupsError || groupDetailQueries.find(q => q.error)?.error || null;

  // Build a lookup map for property details
  const propertyDetailMap = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < allPropertyEntries.length; i++) {
    const detail = propertyDetailQueries[i]?.data;
    if (detail) {
      propertyDetailMap.set(allPropertyEntries[i].propertyId, detail);
    }
  }

  // Map to the PropertyGroup[] shape used by the frontend
  const groups: PropertyGroup[] = (groupsData?.groups ?? []).map(apiGroup => {
    const groupDetail = groupDetailQueries.find(q => q.data?.id === apiGroup.id)?.data;
    const properties = groupDetail?.properties ?? [];

    // Sort by sequenceInGroup and map to PropertyItem
    const items: PropertyItem[] = properties
      .slice()
      .sort((a, b) => a.sequenceInGroup - b.sequenceInGroup)
      .map(prop => {
        const detail = propertyDetailMap.get(prop.propertyId);
        if (detail) {
          return mapDetailToPropertyItem(detail);
        }
        // Fallback: property detail still loading or failed — show what we know
        return {
          id: prop.propertyId,
          type: (prop.propertyType as PropertyType) || 'Lands',
          address: prop.propertyType || 'Property',
          area: '-',
          priceRange: '-',
          location: '-',
          sequenceNumber: prop.sequenceInGroup,
        };
      });

    return {
      id: apiGroup.id,
      name: apiGroup.groupName,
      items,
      description: apiGroup.description,
      groupNumber: apiGroup.groupNumber,
      useSystemCalc: apiGroup.useSystemCalc,
    };
  });

  return {
    groups,
    isLoading,
    error,
    isLoadingGroups,
    isLoadingGroupDetails,
    isLoadingPropertyDetails,
  };
}
