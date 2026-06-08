import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
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
 * Get the active appointment for an appraisal
 * GET /appraisals/{appraisalId}/appointments
 */
export const useGetAppointment = (appraisalId: string) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId, 'appointments'],
    queryFn: async (): Promise<AppointmentDto2Type | null> => {
      try {
        const { data } = await axios.get(`/appraisals/${appraisalId}/appointments`);
        return data.appointment ?? null;
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      }
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
    }: CreateAppointmentRequestType & {
      appraisalId: string;
    }): Promise<CreateAppointmentResponseType> => {
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
        body,
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
      await axios.patch(`/appraisals/${appraisalId}/appointments/${appointmentId}/cancel`, body);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'appointments'],
      });
    },
  });
};

/**
 * Cancel a pending reschedule (draft state), reverting to the previous date.
 * PATCH /appraisals/{appraisalId}/appointments/{appointmentId}/cancel-reschedule
 */
export const useCancelRescheduleAppointment = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('appraisal');

  return useMutation({
    mutationFn: async ({
      appraisalId,
      appointmentId,
      ...body
    }: {
      appraisalId: string;
      appointmentId: string;
      changedBy: string;
      reason?: string | null;
    }): Promise<void> => {
      await axios.patch(
        `/appraisals/${appraisalId}/appointments/${appointmentId}/cancel-reschedule`,
        body,
      );
    },
    onSuccess: (_, variables) => {
      toast.success(t('approval.toasts.rescheduleCancelled'));
      queryClient.invalidateQueries({ queryKey: ['appraisal', variables.appraisalId, 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appraisal', variables.appraisalId, 'fees'] });
    },
    onError: (error: unknown) => {
      const apiError = error as { apiError?: { detail?: string }; message?: string };
      const message =
        apiError?.apiError?.detail ?? apiError?.message ?? t('approval.toasts.rescheduleCancelFailed');
      toast.error(message);
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
      await axios.patch(`/appraisals/${appraisalId}/appointments/${appointmentId}/approve`, body);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'appointments'],
      });
    },
  });
};
