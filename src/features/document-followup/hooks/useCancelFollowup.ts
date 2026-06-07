import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { cancelFollowup, followupKeys } from '../api/followup';

interface CancelFollowupParams {
  followupId: string;
  raisingTaskId: string;
  reason: string;
}

export function useCancelFollowup() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('documentFollowup');

  return useMutation({
    mutationFn: ({ followupId, reason }: CancelFollowupParams) =>
      cancelFollowup(followupId, { reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: followupKeys.byTask(variables.raisingTaskId),
      });
      queryClient.invalidateQueries({
        queryKey: followupKeys.detail(variables.followupId),
      });
      queryClient.invalidateQueries({ queryKey: followupKeys.all });
      toast.success(t('toasts.cancelSuccess'));
    },
    onError: (error: any) => {
      const msg = error?.apiError?.detail ?? error?.apiError?.message ?? t('toasts.cancelFailed');
      toast.error(msg);
    },
  });
}
