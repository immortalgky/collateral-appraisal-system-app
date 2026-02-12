import type {
  CreateBuildingRequestType,
  CreateBuildingResponseType,
  GetBuildingPropertyByIdResultType,
} from '@/shared/forms/typeBuilding';
import type { CreateLandRequestType, CreateLandResponseType } from '@/shared/forms/v2';
import type {
  CreateLandBuildingRequestType,
  CreateLandBuildingResponseType,
  UpdateBuildingPropertyRequestType,
  UpdateBuildingPropertyResponseType,
  UpdateCondoPropertyRequestType,
  UpdateCondoPropertyResponseType,
  UpdateLandAndBuildingPropertyRequestType,
  UpdateLandAndBuildingPropertyResponseType,
} from '@shared/schemas/v1';
import type {
  CreateCondoRequestType,
  CreateCondoResponseType,
  GetCondoPropertyByIdResultType,
} from '../../../shared/forms/typeCondo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { isAxiosError } from 'axios';
import type { GetLandAndBuildingPropertyByIdResultType } from '@shared/forms/typeLandBuilding.ts';

export const useCreateLandRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateLandRequestType): Promise<CreateLandResponseType> => {
      console.log(request);
      const { data } = await axios.post('https://localhost:7111/land-detail', request);
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useCreateBuildingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateBuildingRequestType): Promise<CreateBuildingResponseType> => {
      console.log(request);
      const { data } = await axios.post('https://localhost:7111/building-detail', request);
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useCreateLandBuildingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateLandBuildingRequestType,
    ): Promise<CreateLandBuildingResponseType> => {
      console.log(request);
      const { data } = await axios.post('https://localhost:7111/land-building-detail', request);
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useCreateCondoRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateCondoRequestType): Promise<CreateCondoResponseType> => {
      console.log(request);
      const { data } = await axios.post('https://localhost:7111/condo-detail', request);
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useGetBuildingPropertyById = (appraisalId: string, propertyId: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'building-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetBuildingPropertyByIdResultType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/building-detail`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      // Don't retry 404 errors - they're not recoverable
      if (isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      // Default: retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
};

export const useUpdateBuildingProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UpdateBuildingPropertyRequestType,
    ): Promise<UpdateBuildingPropertyResponseType> => {
      console.log(request);
      const { data } = await axios.put(
        `/appraisals/${request.apprId}/properties/${request.propertyId}/building-detail`,
        request,
      );
      return data;
    },
    onSuccess: data => {
      console.log('Properties building updated successfully', data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useUpdateCondoProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UpdateCondoPropertyRequestType,
    ): Promise<UpdateCondoPropertyResponseType> => {
      console.log(request);
      const { data } = await axios.put(
        `/appraisals/${request.apprId}/properties/${request.propertyId}/condo-detail`,
        request,
      );
      return data;
    },
    onSuccess: data => {
      console.log('Properties condo updated successfully', data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useGetCondoPropertyById = (appraisalId: string, propertyId: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'condo-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetCondoPropertyByIdResultType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/condo-detail`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      // Don't retry 404 errors - they're not recoverable
      if (isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      // Default: retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
};

export const useGetLandAndBuildingPropertyById = (appraisalId: string, propertyId: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'land-and-building-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetLandAndBuildingPropertyByIdResultType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/land-and-building-detail`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      // Don't retry 404 errors - they're not recoverable
      if (isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      // Default: retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
};

export const useUpdateLandAndBuildingProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UpdateLandAndBuildingPropertyRequestType,
    ): Promise<UpdateLandAndBuildingPropertyResponseType> => {
      console.log(request);
      const { data } = await axios.put(
        `/appraisals/${request.apprId}/properties/${request.propertyId}/land-and-building-detail`,
        request,
      );
      return data;
    },
    onSuccess: data => {
      console.log('Properties land and building updated successfully', data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};
