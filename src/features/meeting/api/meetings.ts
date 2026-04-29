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
  AddMeetingMemberRequest,
  BulkCreateMeetingsRequest,
  BulkCreateMeetingsResponse,
  CancelMeetingRequest,
  CreateAcknowledgementQueueItemRequest,
  CreateMeetingRequest,
  CreateMeetingResponse,
  GetMeetingQueueParams,
  GetMeetingsParams,
  MeetingDetailDto,
  MeetingListItemDto,
  MeetingQueueItemDto,
  PaginatedResult,
  RouteBackItemRequest,
  SendInvitationResponse,
  UpdateMeetingAgendaRequest,
  UpdateMeetingMemberPositionRequest,
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
        ...(params.isHistory !== undefined && { isHistory: params.isHistory }),
        ...(params.search && { search: params.search }),
        ...(params.meetingNo && { meetingNo: params.meetingNo }),
        ...(params.customerName && { customerName: params.customerName }),
        ...(params.fromDate && { fromDate: params.fromDate }),
        ...(params.toDate && { toDate: params.toDate }),
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
          ...(params.isHistory !== undefined && { IsHistory: params.isHistory }),
          ...(params.search && { Search: params.search }),
          ...(params.meetingNo && { MeetingNo: params.meetingNo }),
          ...(params.customerName && { CustomerName: params.customerName }),
          ...(params.fromDate && { FromDate: params.fromDate }),
          ...(params.toDate && { ToDate: params.toDate }),
        },
      });
      return data;
    },
  });
};

/** GET /meetings/{id} */
export const useGetMeetingDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: meetingKeys.detail(id ?? ''),
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

/** POST /meetings/bulk */
export const useBulkCreateMeetings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: BulkCreateMeetingsRequest): Promise<BulkCreateMeetingsResponse> => {
      const { data } = await axios.post('/meetings/bulk', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      queryClient.invalidateQueries({ queryKey: meetingKeys.queueAll });
    },
  });
};

/** POST /meetings/{id}/cut-off */
export const useCutOffMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await axios.post(`/meetings/${id}/cut-off`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.queueAll });
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
};

/** POST /meetings/{id}/send-invitation */
export const useSendInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<SendInvitationResponse> => {
      const { data } = await axios.post(`/meetings/${id}/send-invitation`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
};

/** POST /meetings/{id}/items/{appraisalId}/release */
export const useReleaseMeetingItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, appraisalId }: { meetingId: string; appraisalId: string }) => {
      await axios.post(`/meetings/${meetingId}/items/${appraisalId}/release`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.meetingId) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
};

/** POST /meetings/{id}/items/{appraisalId}/routeback */
export const useRouteBackMeetingItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      appraisalId,
      body,
    }: {
      meetingId: string;
      appraisalId: string;
      body: RouteBackItemRequest;
    }) => {
      await axios.post(`/meetings/${meetingId}/items/${appraisalId}/routeback`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.meetingId) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
};

/** POST /meetings/{id}/members */
export const useAddMeetingMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, body }: { meetingId: string; body: AddMeetingMemberRequest }) => {
      await axios.post(`/meetings/${meetingId}/members`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.meetingId) });
    },
  });
};

/** DELETE /meetings/{id}/members/{memberId} */
export const useRemoveMeetingMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, memberId }: { meetingId: string; memberId: string }) => {
      await axios.delete(`/meetings/${meetingId}/members/${memberId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.meetingId) });
    },
  });
};

/** PATCH /meetings/{id}/members/{memberId} */
export const useUpdateMeetingMemberPosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      memberId,
      body,
    }: {
      meetingId: string;
      memberId: string;
      body: UpdateMeetingMemberPositionRequest;
    }) => {
      await axios.patch(`/meetings/${meetingId}/members/${memberId}`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.meetingId) });
    },
  });
};

/** PATCH /meetings/{id}/agenda */
export const useUpdateMeetingAgenda = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, body }: { meetingId: string; body: UpdateMeetingAgendaRequest }) => {
      await axios.patch(`/meetings/${meetingId}/agenda`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.meetingId) });
    },
  });
};

/** POST /meetings/acknowledgement-queue */
export const useCreateAcknowledgementQueueItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateAcknowledgementQueueItemRequest) => {
      await axios.post('/meetings/acknowledgement-queue', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.queueAll });
    },
  });
};
