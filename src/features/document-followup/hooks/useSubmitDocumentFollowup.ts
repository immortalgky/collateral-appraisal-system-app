import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitDocumentFollowup, followupKeys } from '../api/followup';

export function useSubmitDocumentFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (followupId: string) => submitDocumentFollowup(followupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followupKeys.all });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
    },
    onError: () => {
      // Handled at call site
    },
  });
}
