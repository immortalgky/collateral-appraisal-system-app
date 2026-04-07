import type {
  CreateBuildingPropertyRequestType,
  CreateBuildingPropertyResponseType,
  CreateCondoPropertyRequestType,
  CreateCondoPropertyResponseType,
  CreateLandBuildingRequestType,
  CreateLandBuildingResponseType,
  CreateLandPropertyRequestType,
  CreateLandPropertyResponseType,
  CreateMachineryPropertyResponseType,
  GetBuildingPropertyResponseType,
  GetCondoPropertyResponseType,
  GetLandAndBuildingPropertyResponseType,
  GetLandPropertyResponseType,
  GetMachineryPropertyResponseType,
  UpdateBuildingPropertyRequestType,
  UpdateCondoPropertyRequestType,
  UpdateLandAndBuildingPropertyRequestType,
  UpdateLandPropertyRequestType,
  UpdateMachineryPropertyRequestType,
} from '@shared/schemas/v1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { isAxiosError } from 'axios';
import { propertyGroupKeys } from './propertyGroup';
import type { createMachineryFormType } from '../schemas/form';

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

export const useCreateMachineryProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId?: string;
      data: createMachineryFormType;
    }): Promise<CreateMachineryPropertyResponseType> => {
      const url = `/appraisals/${params.appraisalId}/machinery-properties${params.groupId ? `?groupId=${params.groupId}` : ''}`;
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

export const useGetLeaseAgreementLandPropertyById = (appraisalId: string, propertyId?: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'lease-agreement-land-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetLandPropertyResponseType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/lease-agreement-land-detail`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useGetLeaseAgreementBuildingPropertyById = (appraisalId: string, propertyId?: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'lease-agreement-building-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetBuildingPropertyResponseType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/lease-agreement-building-detail`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useGetLeaseAgreementLandAndBuildingPropertyById = (appraisalId: string, propertyId?: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'lease-agreement-land-and-building-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetLandAndBuildingPropertyResponseType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/lease-agreement-land-building-detail`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useGetMachineryPropertyById = (appraisalId: string, propertyId?: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'machinery-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetMachineryPropertyResponseType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/machinery-detail`,
      );
      console.log(data);
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

export const useUpdateMachineryProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      data: UpdateMachineryPropertyRequestType;
    }): Promise<any> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/machinery-detail`,
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
          'machinery-properties',
          variables.propertyId,
        ],
      });
    },
  });
};

// ─── Lease Agreement Types ───────────────────────────────────────

export interface LeaseAgreementResponse {
  detailId: string;
  appraisalPropertyId: string;
  lesseeName?: string;
  tenantName?: string;
  leasePeriodAsContract?: string;
  remainingLeaseAsAppraisalDate?: string;
  contractNo?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseRentFee?: number;
  rentAdjust?: number;
  sublease?: string;
  additionalExpenses?: string;
  leaseTimestamp?: string;
  contractRenewal?: string;
  rentalTermsImpactingPropertyUse?: string;
  terminationOfLease?: string;
  remark?: string;
  banking?: string;
}

export interface UpdateLeaseAgreementRequest {
  lesseeName?: string;
  tenantName?: string;
  leasePeriodAsContract?: string;
  remainingLeaseAsAppraisalDate?: string;
  contractNo?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseRentFee?: number;
  rentAdjust?: number;
  sublease?: string;
  additionalExpenses?: string;
  leaseTimestamp?: string;
  contractRenewal?: string;
  rentalTermsImpactingPropertyUse?: string;
  terminationOfLease?: string;
  remark?: string;
  banking?: string;
}

// ─── Rental Info Types ───────────────────────────────────────────

export interface UpFrontEntryDto {
  id: string;
  atYear: string;
  upFrontAmount: number;
}

export interface GrowthPeriodEntryDto {
  id: string;
  fromYear: number;
  toYear: number;
  growthRate: number;
  growthAmount: number;
  totalAmount: number;
}

export interface RentalInfoResponse {
  detailId: string;
  appraisalPropertyId: string;
  numberOfYears: number;
  firstYearStartDate?: string;
  contractRentalFeePerYear: number;
  upFrontTotalAmount: number;
  growthRateType?: string;
  growthRatePercent: number;
  growthIntervalYears: number;
  upFrontEntries: UpFrontEntryDto[];
  growthPeriodEntries: GrowthPeriodEntryDto[];
  scheduleEntries: RentalScheduleRow[];
  scheduleOverrides: { year: number; upFront?: number; contractRentalFee?: number }[];
}

export interface UpdateRentalInfoRequest {
  numberOfYears?: number;
  firstYearStartDate?: string;
  contractRentalFeePerYear?: number;
  upFrontTotalAmount?: number;
  growthRateType?: string;
  growthRatePercent?: number;
  growthIntervalYears?: number;
  upFrontEntries?: { atYear: number; upFrontAmount: number }[];
  growthPeriodEntries?: {
    fromYear: number;
    toYear: number;
    growthRate: number;
    growthAmount: number;
    totalAmount: number;
  }[];
}

// ─── Rental Schedule Types ───────────────────────────────────────

export interface RentalScheduleRow {
  year: number;
  contractStart: string;
  contractEnd: string;
  upFront: number;
  contractRentalFee: number;
  totalAmount: number;
  contractRentalFeeGrowthRatePercent: number;
}

export interface RentalScheduleResponse {
  rows: RentalScheduleRow[];
}

// ─── Lease Agreement Get/Update Hooks ────────────────────────────

export const useGetLeaseAgreement = (appraisalId: string, propertyId?: string) => {
  return useQuery({
    queryKey: propertyGroupKeys.leaseAgreement(appraisalId, propertyId!),
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<LeaseAgreementResponse> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/lease-agreement`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useUpdateLeaseAgreement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      data: UpdateLeaseAgreementRequest;
    }) => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/lease-agreement`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.leaseAgreement(variables.appraisalId, variables.propertyId),
      });
    },
  });
};

// ─── Rental Info Get/Update Hooks ────────────────────────────────

export const useGetRentalInfo = (appraisalId: string, propertyId?: string) => {
  return useQuery({
    queryKey: propertyGroupKeys.rentalInfo(appraisalId, propertyId!),
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<RentalInfoResponse> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/rental-info`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useUpdateRentalInfo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      data: UpdateRentalInfoRequest;
    }) => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/rental-info`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.rentalInfo(variables.appraisalId, variables.propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.rentalSchedule(variables.appraisalId, variables.propertyId),
      });
    },
  });
};

// ─── Rental Schedule Get Hook (read-only) ────────────────────────

export const useGetRentalSchedule = (appraisalId: string, propertyId?: string) => {
  return useQuery({
    queryKey: propertyGroupKeys.rentalSchedule(appraisalId, propertyId!),
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<RentalScheduleResponse> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/rental-schedule`,
      );
      return data;
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};
