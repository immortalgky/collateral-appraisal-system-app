import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitDocumentFollowup, followupKeys } from '../api/followup';
import type { SubmitFollowupAttachmentInput } from '../types/followup';

export interface SubmitFollowupVariables {
  followupId: string;
  attachments: SubmitFollowupAttachmentInput[];
}

export function useSubmitDocumentFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ followupId, attachments }: SubmitFollowupVariables) =>
      submitDocumentFollowup(followupId, { attachments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followupKeys.all });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-counts'] });
    },
    onError: () => {
      // Handled at call site
    },
  });
}
