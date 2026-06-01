import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

export interface FeeLineInput {
  feeCode: string;
  feeDescription: string;
  feeAmount: number;
}

export interface SubmitFeeAppointmentChangeRequest {
  assignmentId: string;
  appointmentId?: string;
  newAppointmentDate?: string;
  feeLines?: FeeLineInput[];
}

/**
 * POST /appraisals/{appraisalId}/fee-appointment-change
 * Company-side combined submit: optional appointment reschedule + optional fee lines.
 * Returns 202.
 */
export function useSubmitFeeAppointmentChange(appraisalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SubmitFeeAppointmentChangeRequest) =>
      axios.post(`/appraisals/${appraisalId}/fee-appointment-change`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal', appraisalId, 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appraisal', appraisalId, 'fees'] });
    },
  });
}
