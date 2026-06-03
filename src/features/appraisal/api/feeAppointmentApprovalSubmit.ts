import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import axios from '@shared/api/axiosInstance';

interface SubmitFeeAppointmentApprovalBody {
  assignmentId: string;
}

/**
 * POST /appraisals/{appraisalId}/fee-appointment/submit
 * Stamps all draft approval items with ApprovalSubmittedAt and publishes the
 * approval-requested integration event. Backend returns 204.
 */
export function useSubmitFeeAppointmentApproval(appraisalId: string) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('appraisal');

  return useMutation({
    mutationFn: (body: SubmitFeeAppointmentApprovalBody) =>
      axios.post(`/appraisals/${appraisalId}/fee-appointment/submit`, body),
    onSuccess: () => {
      toast.success(t('approval.toasts.submitted'));
      queryClient.invalidateQueries({ queryKey: ['appraisal', appraisalId, 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appraisal', appraisalId, 'fees'] });
    },
    onError: (error: unknown) => {
      const apiError = error as { apiError?: { detail?: string }; message?: string };
      const message =
        apiError?.apiError?.detail ?? apiError?.message ?? t('approval.toasts.submitFailed');
      toast.error(message);
    },
  });
}
