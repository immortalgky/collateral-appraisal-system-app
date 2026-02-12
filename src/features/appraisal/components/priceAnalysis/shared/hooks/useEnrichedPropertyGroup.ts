import { useQueries, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { PropertyGroup, PropertyItem, PropertyType } from '@/features/appraisal/types';
import {
  propertyGroupKeys,
  type GetPropertyGroupByIdResponse,
  type PropertyGroupDto,
} from '@/features/appraisal/api';

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

export function useEnrichedPropertyGroup(appraisalId: string | undefined, groupId: string) {
  // Step 1: For a group, fetch group detail (to get property IDs + types)
  const groupDetailQuery = useQuery({
    queryKey: propertyGroupKeys.detail(appraisalId!, groupId),
    queryFn: async (): Promise<GetPropertyGroupByIdResponse> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/property-groups/${groupId}`);
      return data;
    },
    enabled: !!appraisalId && !!groupId,
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
        retry: 1,
      };
    }),
  });

  // Step 3: Assemble enriched groups. wait until all property finished
  const isLoadingGroupDetails = groupDetailQuery.isLoading;
  const isLoadingPropertyDetails = propertyDetailQueries.some(q => q.isLoading);

  // Only groups-level and group-detail-level errors are fatal.
  // Property detail errors are non-fatal — the property just shows minimal info.
  const isLoading = isLoadingGroupDetails;
  const error = groupDetailQuery.error;

  // Build a lookup map for property details
  const propertyDetailMap = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < allPropertyEntries.length; i++) {
    const detail = propertyDetailQueries[i]?.data;
    if (detail) {
      propertyDetailMap.set(allPropertyEntries[i].propertyId, detail);
    }
  }

  // Map to the PropertyGroup[] shape used by the frontend
  const groupDetail = groupDetailQuery?.data;
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
  const group: PropertyGroup = {
    id: groupDetail?.id ?? '',
    name: groupDetail?.groupName ?? '',
    items,
    description: groupDetail?.description,
    groupNumber: groupDetail?.groupNumber,
    useSystemCalc: groupDetail?.useSystemCalc,
  };

  return {
    group,
    isLoading,
    error,
    isLoadingGroupDetails,
    isLoadingPropertyDetails,
  };
}
