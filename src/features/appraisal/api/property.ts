import type {
  CreateBuildingPropertyRequestType,
  CreateBuildingPropertyResponseType,
  CreateCondoPropertyRequestType,
  CreateCondoPropertyResponseType,
  CreateLandBuildingRequestType,
  CreateLandBuildingResponseType,
  CreateLandPropertyRequestType,
  CreateLandPropertyResponseType,
  GetBuildingPropertyResponseType,
  GetCondoPropertyResponseType,
  GetLandAndBuildingPropertyResponseType,
  GetLandPropertyResponseType,
  UpdateBuildingPropertyRequestType,
  UpdateCondoPropertyRequestType,
  UpdateLandAndBuildingPropertyRequestType,
  UpdateLandPropertyRequestType,
} from '@shared/schemas/v1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { isAxiosError } from 'axios';
import { propertyGroupKeys } from './propertyGroup';
import { data } from 'react-router-dom';

// ─── Create Hooks ────────────────────────────────────────────────

export const useCreateLandProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId?: string;
      data: CreateLandPropertyRequestType;
    }): Promise<CreateLandPropertyResponseType> => {
      const url = `/appraisals/${params.appraisalId}/land-properties${params.groupId ? `?groupId=${params.groupId}` : ''}`;
      const { data } = await axios.post(url, params.data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
    },
  });
};

export const useCreateBuildingProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId?: string;
      data: CreateBuildingPropertyRequestType;
    }): Promise<CreateBuildingPropertyResponseType> => {
      const url = `/appraisals/${params.appraisalId}/building-properties${params.groupId ? `?groupId=${params.groupId}` : ''}`;
      const { data } = await axios.post(url, params.data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
    },
  });
};

export const useCreateCondoProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId?: string;
      data: CreateCondoPropertyRequestType;
    }): Promise<CreateCondoPropertyResponseType> => {
      const url = `/appraisals/${params.appraisalId}/condo-properties${params.groupId ? `?groupId=${params.groupId}` : ''}`;
      const { data } = await axios.post(url, params.data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
    },
  });
};

export const useCreateLandAndBuildingProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId?: string;
      data: CreateLandBuildingRequestType;
    }): Promise<CreateLandBuildingResponseType> => {
      const url = `/appraisals/${params.appraisalId}/land-and-building-properties${params.groupId ? `?groupId=${params.groupId}` : ''}`;
      const { data } = await axios.post(url, params.data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
    },
  });
};

// ─── Get Hooks ───────────────────────────────────────────────────

export const useGetLandPropertyById = (appraisalId: string, propertyId?: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'land-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetLandPropertyResponseType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/land-detail`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useGetBuildingPropertyById = (appraisalId: string, propertyId?: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'building-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetBuildingPropertyResponseType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/building-detail`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useGetCondoPropertyById = (appraisalId: string, propertyId?: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'condo-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetCondoPropertyResponseType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/condo-detail`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useGetLandAndBuildingPropertyById = (appraisalId: string, propertyId?: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'land-and-building-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetLandAndBuildingPropertyResponseType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/land-and-building-detail`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

// ─── Update Hooks ────────────────────────────────────────────────

export const useUpdateLandProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      data: UpdateLandPropertyRequestType;
    }): Promise<any> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/land-detail`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.propertyDetail(variables.appraisalId, variables.propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: ['appraisals', variables.appraisalId, 'land-properties', variables.propertyId],
      });
    },
  });
};

export const useUpdateBuildingProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      data: UpdateBuildingPropertyRequestType;
    }): Promise<any> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/building-detail`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.propertyDetail(variables.appraisalId, variables.propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: [
          'appraisals',
          variables.appraisalId,
          'building-properties',
          variables.propertyId,
        ],
      });
    },
  });
};

export const useUpdateCondoProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      data: UpdateCondoPropertyRequestType;
    }): Promise<any> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/condo-detail`,
        params.data,
      );
      console.log(data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.propertyDetail(variables.appraisalId, variables.propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: ['appraisals', variables.appraisalId, 'condo-properties', variables.propertyId],
      });
    },
  });
};

export const useUpdateLandAndBuildingProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      data: UpdateLandAndBuildingPropertyRequestType;
    }): Promise<any> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/land-and-building-detail`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.propertyDetail(variables.appraisalId, variables.propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: [
          'appraisals',
          variables.appraisalId,
          'land-and-building-properties',
          variables.propertyId,
        ],
      });
    },
  });
};
