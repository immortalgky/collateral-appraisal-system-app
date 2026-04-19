import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  listActivities,
  getActivityOverrides,
  updateActivityOverrides,
} from '../api/menus';
import type {
  ActivitySummary,
  ActivityOverridesResponse,
  UpdateActivityOverridesRequest,
} from '../types';

export const ACTIVITY_OVERRIDE_KEYS = {
  all: ['activity-overrides'] as const,
  activities: ['activities'] as const,
  byActivity: (activityId: string) => ['activity-overrides', activityId] as const,
};

export function useActivitiesList() {
  return useQuery<ActivitySummary[]>({
    queryKey: ACTIVITY_OVERRIDE_KEYS.activities,
    queryFn: listActivities,
  });
}

export function useActivityOverrides(activityId: string | null) {
  return useQuery<ActivityOverridesResponse>({
    queryKey: ACTIVITY_OVERRIDE_KEYS.byActivity(activityId ?? ''),
    queryFn: () => getActivityOverrides(activityId!),
    enabled: !!activityId,
  });
}

export function useUpdateActivityOverrides() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      activityId,
      body,
    }: {
      activityId: string;
      body: UpdateActivityOverridesRequest;
    }) => updateActivityOverrides(activityId, body),
    onSuccess: (_data, { activityId }) => {
      queryClient.invalidateQueries({ queryKey: ACTIVITY_OVERRIDE_KEYS.byActivity(activityId) });
      toast.success('Activity overrides saved');
    },
    onError: () => {
      toast.error('Failed to save activity overrides');
    },
  });
}
