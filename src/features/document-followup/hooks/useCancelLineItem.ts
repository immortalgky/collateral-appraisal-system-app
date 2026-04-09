import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cancelLineItem, followupKeys } from '../api/followup';

interface CancelLineItemParams {
  followupId: string;
  lineItemId: string;
  raisingTaskId: string;
  reason: string;
}

export function useCancelLineItem() {
  const queryClient = useQueryClient();

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
      toast.success('Line item cancelled');
    },
    onError: (error: any) => {
      const msg =
        error?.apiError?.detail ??
        error?.apiError?.message ??
        'Failed to cancel line item';
      toast.error(msg);
    },
  });
}
