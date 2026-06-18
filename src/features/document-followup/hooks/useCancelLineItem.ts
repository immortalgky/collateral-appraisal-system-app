import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { cancelLineItem, followupKeys } from '../api/followup';

interface CancelLineItemParams {
  followupId: string;
  lineItemId: string;
  raisingTaskId: string;
  reason: string;
}

export function useCancelLineItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('documentFollowup');

  return useMutation({
    mutationFn: ({ followupId, lineItemId, reason }: CancelLineItemParams) =>
      cancelLineItem(followupId, lineItemId, { reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: followupKeys.detail(variables.followupId),
      });
      queryClient.invalidateQueries({
        queryKey: followupKeys.byTask(variables.raisingTaskId),
      });
      toast.success(t('toasts.cancelLineItemSuccess'));
    },
    onError: (error: any) => {
      const msg =
        error?.apiError?.detail ?? error?.apiError?.message ?? t('toasts.cancelLineItemFailed');
      toast.error(msg);
    },
  });
}
