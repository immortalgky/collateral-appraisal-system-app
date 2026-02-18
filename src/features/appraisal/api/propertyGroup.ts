import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { schemas } from '@shared/schemas/v1';
import type { z } from 'zod';
import type { PropertyType } from '../types';

// ==================== Type Definitions ====================

export type PropertyGroupDto = z.infer<typeof schemas.PropertyGroupDto>;
export type GetPropertyGroupsResponse = z.infer<typeof schemas.GetPropertyGroupsResponse>;
export type PropertyGroupItemDto = z.infer<typeof schemas.PropertyGroupItemDto>;
export type GetPropertyGroupByIdResponse = z.infer<typeof schemas.GetPropertyGroupByIdResponse>;

// ==================== Query Keys ====================

export const propertyGroupKeys = {
  all: (appraisalId: string) => ['appraisal', appraisalId, 'property-groups'] as const,
  detail: (appraisalId: string, groupId: string) =>
    ['appraisal', appraisalId, 'property-groups', groupId] as const,
  propertyDetail: (appraisalId: string, propertyId: string) =>
    ['appraisal', appraisalId, 'property', propertyId, 'detail'] as const,
};

// ==================== Type-to-Endpoint Mapping ====================

const typeToDetailEndpoint: Record<string, string> = {
  'Lands': 'land-detail',
  'Lease Agreement Lands': 'land-detail',
  'Building': 'building-detail',
  'Lease Agreement Building': 'building-detail',
  'Land and building': 'land-and-building-detail',
  'Lease Agreement Land and building': 'land-and-building-detail',
  'Condominium': 'condo-detail',
  'Machine': 'machinery-detail',
  'Vehicle': 'vehicle-detail',
  'Vessel': 'vessel-detail',
};

// ==================== Property Group CRUD ====================

/**
 * List all property groups for an appraisal
 * GET /appraisals/{appraisalId}/property-groups
 */
export const useGetPropertyGroups = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: propertyGroupKeys.all(appraisalId!),
    queryFn: async (): Promise<GetPropertyGroupsResponse> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/property-groups`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Get a single property group by ID (includes property list with types)
 * GET /appraisals/{appraisalId}/property-groups/{groupId}
 */
export const useGetPropertyGroupById = (
  appraisalId: string | undefined,
  groupId: string | undefined,
) => {
  return useQuery({
    queryKey: propertyGroupKeys.detail(appraisalId!, groupId!),
    queryFn: async (): Promise<GetPropertyGroupByIdResponse> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/property-groups/${groupId}`,
      );
      return data;
    },
    enabled: !!appraisalId && !!groupId,
  });
};

/**
 * Create a new property group
 * POST /appraisals/{appraisalId}/property-groups
 */
export const useCreatePropertyGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupName: string;
      description?: string | null;
    }) => {
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/property-groups`,
        { groupName: params.groupName, description: params.description ?? null },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Update a property group
 * PUT /appraisals/{appraisalId}/property-groups/{groupId}
 */
export const useUpdatePropertyGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId: string;
      groupName: string;
      description?: string | null;
      useSystemCalc: boolean;
    }) => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/property-groups/${params.groupId}`,
        {
          groupName: params.groupName,
          description: params.description ?? null,
          useSystemCalc: params.useSystemCalc,
        },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.detail(variables.appraisalId, variables.groupId),
      });
    },
  });
};

/**
 * Delete a property group
 * DELETE /appraisals/{appraisalId}/property-groups/{groupId}
 */
export const useDeletePropertyGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId: string;
    }) => {
      const { data } = await axios.delete(
        `/appraisals/${params.appraisalId}/property-groups/${params.groupId}`,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
    },
  });
};

// ==================== Property-in-Group Management ====================

/**
 * Add a property to a group
 * POST /appraisals/{appraisalId}/property-groups/{groupId}/properties
 */
export const useAddPropertyToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId: string;
      propertyId: string;
    }) => {
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/property-groups/${params.groupId}/properties`,
        { propertyId: params.propertyId },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.detail(variables.appraisalId, variables.groupId),
      });
    },
  });
};

/**
 * Remove a property from a group
 * DELETE /appraisals/{appraisalId}/property-groups/{groupId}/properties/{propertyId}
 */
export const useRemovePropertyFromGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId: string;
      propertyId: string;
    }) => {
      const { data } = await axios.delete(
        `/appraisals/${params.appraisalId}/property-groups/${params.groupId}/properties/${params.propertyId}`,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.detail(variables.appraisalId, variables.groupId),
      });
    },
  });
};

// ==================== Reorder & Move ====================

/**
 * Reorder properties within a group
 * PUT /appraisals/{appraisalId}/property-groups/{groupId}/reorder-properties
 */
export const useReorderPropertiesInGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId: string;
      orderedPropertyIds: string[];
    }) => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/property-groups/${params.groupId}/reorder-properties`,
        { orderedPropertyIds: params.orderedPropertyIds },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.detail(variables.appraisalId, variables.groupId),
      });
    },
  });
};

/**
 * Move a property to another group (atomic operation)
 * POST /appraisals/{appraisalId}/properties/{propertyId}/move-to-group
 */
export const useMovePropertyToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      sourceGroupId: string;
      propertyId: string;
      targetGroupId: string;
      targetPosition?: number | null;
    }) => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/move-to-group`,
        {
          targetGroupId: params.targetGroupId,
          targetPosition: params.targetPosition ?? null,
        },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.detail(variables.appraisalId, variables.sourceGroupId),
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.detail(variables.appraisalId, variables.targetGroupId),
      });
    },
  });
};

// ==================== Property Detail ====================

/**
 * Get property detail by type
 * GET /appraisals/{appraisalId}/properties/{propertyId}/{type}-detail
 */
export const useGetPropertyDetail = (
  appraisalId: string | undefined,
  propertyId: string | undefined,
  propertyType: PropertyType | string | undefined,
) => {
  const endpoint = propertyType ? typeToDetailEndpoint[propertyType] : undefined;

  return useQuery({
    queryKey: propertyGroupKeys.propertyDetail(appraisalId!, propertyId!),
    queryFn: async () => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/${endpoint}`,
      );
      return data as Record<string, unknown>;
    },
    enabled: !!appraisalId && !!propertyId && !!endpoint,
  });
};
