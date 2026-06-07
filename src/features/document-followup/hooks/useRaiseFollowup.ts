import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { raiseFollowup, followupKeys } from '../api/followup';
import type { RaiseFollowupRequest } from '../types/followup';

export function useRaiseFollowup() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('documentFollowup');

  return useMutation({
    mutationFn: (body: RaiseFollowupRequest) => raiseFollowup(body),
    onSuccess: (_data, variables) => {
      // Invalidate open followups for this task so the banner refreshes
      queryClient.invalidateQueries({
        queryKey: followupKeys.byTask(variables.raisingTaskId),
      });
      queryClient.invalidateQueries({ queryKey: followupKeys.all });
      toast.success(t('toasts.raiseSuccess'));
    },
    onError: (error: any) => {
      const msg = error?.apiError?.detail ?? error?.apiError?.message ?? t('toasts.raiseFailed');
      toast.error(msg);
    },
  });
}
