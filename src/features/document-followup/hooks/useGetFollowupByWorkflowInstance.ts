import { useQuery } from '@tanstack/react-query';
import { getFollowupByWorkflowInstanceId, followupKeys } from '../api/followup';

/**
 * Finds a followup by the followup workflow instance ID.
 * Used by ProvideDocumentsTaskPage where we only know the task's workflowInstanceId.
 */
export function useGetFollowupByWorkflowInstance(
  followupWorkflowInstanceId: string | undefined,
) {
  return useQuery({
    queryKey: followupKeys.byWorkflowInstance(followupWorkflowInstanceId ?? ''),
    queryFn: () =>
      getFollowupByWorkflowInstanceId(followupWorkflowInstanceId!),
    enabled: !!followupWorkflowInstanceId,
    staleTime: 30 * 1000,
  });
}
