import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from '@shared/api/axiosInstance';
import type {
  BulkActionResult,
  FailedMessageDetail,
  FailedMessageListItem,
  FailedMessagesSummary,
  GetFailedMessagesParams,
  PaginatedResult,
} from '../types';
import { CONSUMER_SKIP_REASON_KEY, toastBulkResult } from '../utils/bulkResultToast';
import { detailRefetchInterval, isConsumerDetailLive, pollRefetchInterval } from './detailPolling';
import { isSameFilterOtherPage } from './keepPreviousPage';

export const failedMessageKeys = {
  all: ['failed-messages'] as const,
  summary: () => ['failed-messages', 'summary'] as const,
  list: (params: GetFailedMessagesParams) => ['failed-messages', 'list', params] as const,
  detail: (id: string) => ['failed-messages', 'detail', id] as const,
};

export const useGetFailedMessagesSummary = () => {
  return useQuery({
    queryKey: failedMessageKeys.summary(),
    queryFn: async (): Promise<FailedMessagesSummary> => {
      const { data } = await axios.get<FailedMessagesSummary>('/admin/failed-messages/summary');
      return data;
    },
    staleTime: 0,
    // The app-wide default is false; polling pauses while the tab is hidden but the server clock
    // keeps advancing, so returning must refetch at once or stale collectedAt values read as outages.
    refetchOnWindowFocus: true,
    refetchInterval: query => pollRefetchInterval(query.state.error),
    refetchIntervalInBackground: false,
  });
};

export const useGetFailedMessages = (
  params: GetFailedMessagesParams = {},
  options: { enabled?: boolean } = {},
) => {
  return useQuery({
    queryKey: failedMessageKeys.list(params),
    queryFn: async (): Promise<PaginatedResult<FailedMessageListItem>> => {
      const { data } = await axios.get<PaginatedResult<FailedMessageListItem>>(
        '/admin/failed-messages',
        {
          params: {
            pageNumber: params.pageNumber ?? 1,
            pageSize: params.pageSize ?? 20,
            status: params.status || undefined,
            queue: params.queue || undefined,
            node: params.node || undefined,
            exceptionType: params.exceptionType || undefined,
            search: params.search || undefined,
          },
        },
      );
      return data;
    },
    enabled: options.enabled,
    // A PAGE change keeps showing the previous page (flagged `isPlaceholderData`) so the pager stays
    // stable — the page dims it and gates selection/clamping on that flag. A tab/filter change must
    // NOT: it drops to undefined (skeleton) instead of showing the previous tab's rows and total.
    placeholderData: (prev, prevQuery) =>
      isSameFilterOtherPage(prevQuery?.queryKey[2], params) ? prev : undefined,
    staleTime: 0,
    // The app-wide default is false; polling pauses while the tab is hidden but the server clock
    // keeps advancing, so returning must refetch at once or stale collectedAt values read as outages.
    refetchOnWindowFocus: true,
    refetchInterval: query => pollRefetchInterval(query.state.error),
    refetchIntervalInBackground: false,
  });
};

export const useGetFailedMessage = (id: string | null, options: { open: boolean }) => {
  return useQuery({
    queryKey: failedMessageKeys.detail(id ?? ''),
    queryFn: async (): Promise<FailedMessageDetail> => {
      const { data } = await axios.get<FailedMessageDetail>(`/admin/failed-messages/${id}`);
      return data;
    },
    // Hidden (but still mounted through the close animation) drawers must not keep polling/refetching.
    enabled: !!id && options.open,
    staleTime: 0,
    // Live while the row is Pending (another operator may act on it), the owning node's collector is
    // republishing it, or it's still inside its post-fault wait window (`retryAvailableAt`, omitted once it passes) — a transient fetch error
    // (5xx, network blip) must NOT stop polling; only a 404/403 (row purged/forbidden) does, see
    // detailRefetchInterval.
    refetchInterval: query =>
      detailRefetchInterval<FailedMessageDetail>(query.state, options.open, isConsumerDetailLive),
    refetchIntervalInBackground: false,
  });
};

type BulkConsumerActionKind = 'retry' | 'discard';

// Everything that differs between a bulk retry and a bulk discard call — see
// useBulkConsumerAction, which the two exported hooks below are thin wrappers around.
const BULK_CONSUMER_ACTION: Record<
  BulkConsumerActionKind,
  {
    path: string;
    successKey: 'toast.retrySuccess' | 'toast.discardSuccess';
    partialKey: 'toast.retryPartial' | 'toast.discardPartial';
    emptyMessage: string;
  }
> = {
  retry: {
    path: '/admin/failed-messages/retry',
    successKey: 'toast.retrySuccess',
    partialKey: 'toast.retryPartial',
    // The retry dialog can be confirmed with an empty `sendable` bucket (everything selected was
    // RetryRequested or too soon) — never POST an empty ids[], which the API would 400 on anyway.
    emptyMessage: 'No retryable ids to send',
  },
  discard: {
    path: '/admin/failed-messages/discard',
    successKey: 'toast.discardSuccess',
    partialKey: 'toast.discardPartial',
    emptyMessage: 'No discardable ids',
  },
};

/**
 * Shared implementation behind useRetryFailedMessages/useDiscardFailedMessages — same endpoint
 * shape, toast handling and invalidation, differing only in path/toast keys and whether `reason` is
 * required (discard) or optional (retry, omitted entirely once trimmed empty).
 */
function useBulkConsumerAction<V extends { ids: string[]; reason?: string }>(
  kind: BulkConsumerActionKind,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('failedMessages');
  const config = BULK_CONSUMER_ACTION[kind];

  const options: UseMutationOptions<BulkActionResult, Error, V> = {
    mutationFn: async ({ ids, reason }) => {
      if (ids.length === 0) throw new Error(config.emptyMessage);
      const { data } = await axios.post<BulkActionResult>(config.path, {
        ids,
        // Discard's `reason` is required by its own (narrower) variables type, so `reason` is always
        // defined there — trimmed as-is, even down to an empty string, matching the original mutation.
        reason: kind === 'retry' ? reason?.trim() || undefined : reason?.trim(),
      });
      return data;
    },
    onSuccess: ({ accepted, skipped }) => {
      toastBulkResult(
        t,
        { acceptedCount: accepted.length, skipped },
        { success: config.successKey, partial: config.partialKey },
        CONSUMER_SKIP_REASON_KEY,
      );
      void queryClient.invalidateQueries({ queryKey: failedMessageKeys.all });
    },
    onError: () => {
      toast.error(t('toast.actionError'));
    },
  };

  return useMutation(options);
}

export const useRetryFailedMessages = () =>
  useBulkConsumerAction<{ ids: string[]; reason?: string }>('retry');

export const useDiscardFailedMessages = () =>
  useBulkConsumerAction<{ ids: string[]; reason: string }>('discard');
