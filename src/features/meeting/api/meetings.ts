/**
 * React Query hooks for the Workflow `/meetings` API.
 *
 * Mirrors the pattern in `features/appraisal/api/decisionSummary.ts`:
 * - axios via `@shared/api/axiosInstance`
 * - typed query keys exported as a `meetingKeys` factory
 * - mutations invalidate `['meetings']`, the affected `['meeting', id]`,
 *   and the `['meetingQueue']` cache as appropriate.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AddMeetingItemsRequest,
  CancelMeetingRequest,
  CreateMeetingRequest,
  CreateMeetingResponse,
  GetMeetingQueueParams,
  GetMeetingsParams,
  MeetingDetailDto,
  MeetingListItemDto,
  MeetingQueueItemDto,
  PaginatedResult,
  ScheduleMeetingRequest,
  UpdateMeetingRequest,
} from './types';

// ==================== Query Keys ====================

export const meetingKeys = {
  all: ['meetings'] as const,
  list: (params: GetMeetingsParams) =>
    [
      'meetings',
      {
        pageNumber: params.pageNumber ?? 0,
        pageSize: params.pageSize ?? 20,
        ...(params.status && { status: params.status }),
      },
    ] as const,
  detail: (id: string) => ['meeting', id] as const,
  queue: (params: GetMeetingQueueParams) =>
    [
      'meetingQueue',
      {
        pageNumber: params.pageNumber ?? 0,
        pageSize: params.pageSize ?? 20,
        status: params.status ?? 'Queued',
      },
    ] as const,
  queueAll: ['meetingQueue'] as const,
};

// ==================== Queries ====================

/** GET /meetings */
export const useGetMeetings = (params: GetMeetingsParams = {}) => {
  return useQuery({
    queryKey: meetingKeys.list(params),
    queryFn: async (): Promise<PaginatedResult<MeetingListItemDto>> => {
      const { data } = await axios.get('/meetings', {
        params: {
          PageNumber: params.pageNumber ?? 0,
          PageSize: params.pageSize ?? 20,
          ...(params.status && { Status: params.status }),
        },
      });
      return data;
    },
  });
};

/** GET /meetings/{id} */
export const useGetMeetingDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: meetingKeys.detail(id!),
    queryFn: async (): Promise<MeetingDetailDto> => {
      const { data } = await axios.get(`/meetings/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

/** GET /meetings/queue */
export const useGetMeetingQueue = (params: GetMeetingQueueParams = {}) => {
  return useQuery({
    queryKey: meetingKeys.queue(params),
    queryFn: async (): Promise<PaginatedResult<MeetingQueueItemDto>> => {
      const { data } = await axios.get('/meetings/queue', {
        params: {
          PageNumber: params.pageNumber ?? 0,
          PageSize: params.pageSize ?? 20,
          Status: params.status ?? 'Queued',
        },
      });
      return data;
    },
  });
};

// ==================== Mutations ====================

/** POST /meetings */
export const useCreateMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateMeetingRequest): Promise<CreateMeetingResponse> => {
      const { data } = await axios.post('/meetings', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
};

/** PUT /meetings/{id} */
export const useUpdateMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateMeetingRequest }) => {
      await axios.put(`/meetings/${id}`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
};

/** POST /meetings/{id}/schedule */
export const useScheduleMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ScheduleMeetingRequest }) => {
      await axios.post(`/meetings/${id}/schedule`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
};

/** POST /meetings/{id}/items */
export const useAddMeetingItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: AddMeetingItemsRequest }) => {
      await axios.post(`/meetings/${id}/items`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.queueAll });
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
};

/** DELETE /meetings/{id}/items/{appraisalId} */
export const useRemoveMeetingItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, appraisalId }: { id: string; appraisalId: string }) => {
      await axios.delete(`/meetings/${id}/items/${appraisalId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.queueAll });
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
};

/** POST /meetings/{id}/cancel */
export const useCancelMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: CancelMeetingRequest }) => {
      await axios.post(`/meetings/${id}/cancel`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.queueAll });
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
};

/** POST /meetings/{id}/end */
export const useEndMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await axios.post(`/meetings/${id}/end`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.queueAll });
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
};
