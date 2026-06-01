import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { declineLineItem, followupKeys } from '../api/followup';

interface DeclineLineItemParams {
  followupId: string;
  lineItemId: string;
  reason: string;
}

export function useDeclineLineItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('documentFollowup');

  return useMutation({
    mutationFn: ({ followupId, lineItemId, reason }: DeclineLineItemParams) =>
      declineLineItem(followupId, lineItemId, { reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: followupKeys.detail(variables.followupId),
      });
      queryClient.invalidateQueries({ queryKey: followupKeys.all });
      toast.success(t('toasts.declineSuccess'));
    },
    onError: (error: any) => {
      const msg = error?.apiError?.detail ?? error?.apiError?.message ?? t('toasts.declineFailed');
      toast.error(msg);
    },
  });
}
