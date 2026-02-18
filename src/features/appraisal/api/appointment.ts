import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AppointmentDto2Type,
  CreateAppointmentRequestType,
  CreateAppointmentResponseType,
  RescheduleAppointmentRequestType,
  CancelAppointmentRequestType,
  ApproveAppointmentRequestType,
} from '@shared/schemas/v1';

/**
 * Get appointments for an appraisal
 * GET /appraisals/{appraisalId}/appointments
 */
export const useGetAppointments = (appraisalId: string) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId, 'appointments'],
    queryFn: async (): Promise<AppointmentDto2Type[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/appointments`);
      return data.appointments ?? [];
    },
    enabled: !!appraisalId,
  });
};

/**
 * Create a new appointment
 * POST /appraisals/{appraisalId}/appointments
 */
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      ...body
    }: CreateAppointmentRequestType & { appraisalId: string }): Promise<CreateAppointmentResponseType> => {
      const { data } = await axios.post(`/appraisals/${appraisalId}/appointments`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'appointments'],
      });
    },
  });
};

/**
 * Reschedule an appointment
 * PATCH /appraisals/{appraisalId}/appointments/{appointmentId}/reschedule
 */
export const useRescheduleAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      appointmentId,
      ...body
    }: RescheduleAppointmentRequestType & {
      appraisalId: string;
      appointmentId: string;
    }): Promise<void> => {
      await axios.patch(
        `/appraisals/${appraisalId}/appointments/${appointmentId}/reschedule`,
        body
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'appointments'],
      });
    },
  });
};

/**
 * Cancel an appointment
 * PATCH /appraisals/{appraisalId}/appointments/{appointmentId}/cancel
 */
export const useCancelAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      appointmentId,
      ...body
    }: CancelAppointmentRequestType & {
      appraisalId: string;
      appointmentId: string;
    }): Promise<void> => {
      await axios.patch(
        `/appraisals/${appraisalId}/appointments/${appointmentId}/cancel`,
        body
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'appointments'],
      });
    },
  });
};

/**
 * Approve an appointment
 * PATCH /appraisals/{appraisalId}/appointments/{appointmentId}/approve
 */
export const useApproveAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      appointmentId,
      ...body
    }: ApproveAppointmentRequestType & {
      appraisalId: string;
      appointmentId: string;
    }): Promise<void> => {
      await axios.patch(
        `/appraisals/${appraisalId}/appointments/${appointmentId}/approve`,
        body
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'appointments'],
      });
    },
  });
};
