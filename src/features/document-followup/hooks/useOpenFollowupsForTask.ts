import { useQuery } from '@tanstack/react-query';
import { getOpenFollowupsForTask, followupKeys } from '../api/followup';

/**
 * Fetches open followups for a given raising task ID.
 * Used on the checker's task page to show the OpenFollowupBanner.
 */
export function useOpenFollowupsForTask(raisingTaskId: string | undefined) {
  return useQuery({
    queryKey: followupKeys.byTask(raisingTaskId ?? ''),
    queryFn: () => getOpenFollowupsForTask(raisingTaskId!),
    enabled: !!raisingTaskId,
    staleTime: 30 * 1000,
  });
}
