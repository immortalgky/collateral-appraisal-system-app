import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AppointmentApprovalRuleDto,
  AppointmentApprovalRuleUpdateRequest,
  FeeApprovalTierCreateRequest,
  FeeApprovalTierDto,
  FeeApprovalTierUpdateRequest,
} from '../types';

// ----- Query key factory -----

export const feeApprovalConfigKeys = {
  tiers: ['fee-approval-tiers'] as const,
  appointmentRule: ['fee-approval-appointment-rule'] as const,
};

// ----- Fee Tiers -----

export function useGetFeeApprovalTiers() {
  return useQuery({
    queryKey: feeApprovalConfigKeys.tiers,
    queryFn: async (): Promise<FeeApprovalTierDto[]> => {
      const { data } = await axios.get<FeeApprovalTierDto[]>('/api/fee-approval/tiers');
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateFeeApprovalTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FeeApprovalTierCreateRequest) =>
      axios.post('/api/fee-approval/tiers', body).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeApprovalConfigKeys.tiers }),
  });
}

export function useUpdateFeeApprovalTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: FeeApprovalTierUpdateRequest & { id: string }) =>
      axios.put(`/api/fee-approval/tiers/${id}`, body).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeApprovalConfigKeys.tiers }),
  });
}

export function useDeleteFeeApprovalTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/fee-approval/tiers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeApprovalConfigKeys.tiers }),
  });
}

// ----- Appointment Rule -----

export function useGetAppointmentApprovalRule() {
  return useQuery({
    queryKey: feeApprovalConfigKeys.appointmentRule,
    queryFn: async (): Promise<AppointmentApprovalRuleDto | null> => {
      try {
        const { data } = await axios.get<AppointmentApprovalRuleDto>(
          '/api/appointment-approval/rule',
        );
        return data;
      } catch (error: unknown) {
        const err = error as { response?: { status?: number } };
        if (err.response?.status === 404) return null;
        throw error;
      }
    },
    staleTime: 60 * 1000,
  });
}

export function useUpsertAppointmentApprovalRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AppointmentApprovalRuleUpdateRequest) =>
      axios.put('/api/appointment-approval/rule', body).then(r => r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: feeApprovalConfigKeys.appointmentRule }),
  });
}
