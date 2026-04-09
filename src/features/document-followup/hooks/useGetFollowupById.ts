import { useQuery } from '@tanstack/react-query';
import { getFollowupById, followupKeys } from '../api/followup';

/**
 * Fetches the full followup detail for the request maker's task page.
 */
export function useGetFollowupById(followupId: string | undefined) {
  return useQuery({
    queryKey: followupKeys.detail(followupId ?? ''),
    queryFn: () => getFollowupById(followupId!),
    enabled: !!followupId,
    staleTime: 30 * 1000,
  });
}
