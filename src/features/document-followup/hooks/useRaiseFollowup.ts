import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { raiseFollowup, followupKeys } from '../api/followup';
import type { RaiseFollowupRequest } from '../types/followup';

export function useRaiseFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: RaiseFollowupRequest) => raiseFollowup(body),
    onSuccess: (_data, variables) => {
      // Invalidate open followups for this task so the banner refreshes
      queryClient.invalidateQueries({
        queryKey: followupKeys.byTask(variables.raisingTaskId),
      });
      queryClient.invalidateQueries({ queryKey: followupKeys.all });
      toast.success('Document request raised successfully');
    },
    onError: (error: any) => {
      const msg =
        error?.apiError?.detail ??
        error?.apiError?.message ??
        'Failed to raise document request';
      toast.error(msg);
    },
  });
}
