import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from '@shared/api/axiosInstance';
import type {
  GetOutboxMessagesParams,
  OutboxDetail,
  OutboxItemRef,
  OutboxListItem,
  OutboxModule,
  OutboxResendResult,
  PaginatedResult,
} from '../types';
import { OUTBOX_SKIP_REASON_KEY, toastBulkResult } from '../utils/bulkResultToast';
import { detailRefetchInterval, isOutboxDetailLive, pollRefetchInterval } from './detailPolling';
import { isSameFilterOtherPage } from './keepPreviousPage';
import { failedMessageKeys } from './failedMessages';

export const outboxMessageKeys = {
  all: ['outbox-messages'] as const,
  list: (params: GetOutboxMessagesParams) => ['outbox-messages', 'list', params] as const,
  // module is `OutboxModule | ''` so a not-yet-selected id/module can still key a disabled query.
  detail: (module: OutboxModule | '', id: string) =>
    ['outbox-messages', 'detail', module, id] as const,
};

export const useGetOutboxMessages = (
  params: GetOutboxMessagesParams = {},
  options: { enabled?: boolean } = {},
) => {
  return useQuery({
    queryKey: outboxMessageKeys.list(params),
    queryFn: async (): Promise<PaginatedResult<OutboxListItem>> => {
      const { data } = await axios.get<PaginatedResult<OutboxListItem>>('/admin/outbox-messages', {
        params: {
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 20,
          status: params.status || undefined,
          module: params.module || undefined,
          search: params.search || undefined,
        },
      });
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

export const useGetOutboxMessage = (
  module: OutboxModule | null,
  id: string | null,
  options: { open: boolean },
) => {
  return useQuery({
    queryKey: outboxMessageKeys.detail(module ?? '', id ?? ''),
    queryFn: async (): Promise<OutboxDetail> => {
      const { data } = await axios.get<OutboxDetail>(`/admin/outbox-messages/${module}/${id}`);
      return data;
    },
    // Hidden (but still mounted through the close animation) drawers must not keep refetching.
    enabled: !!module && !!id && options.open,
    staleTime: 0,
    // A transient fetch error (5xx, network blip) must NOT stop polling; only a 404/403 (row purged,
    // or no permission) does — see detailRefetchInterval.
    refetchInterval: query =>
      detailRefetchInterval<OutboxDetail>(query.state, options.open, isOutboxDetailLive),
    refetchIntervalInBackground: false,
  });
};

export const useResendOutboxMessages = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('failedMessages');

  return useMutation({
    mutationFn: async ({
      items,
      reason,
    }: {
      items: OutboxItemRef[];
      reason?: string;
    }): Promise<OutboxResendResult> => {
      if (items.length === 0) throw new Error('No resendable items');
      const { data } = await axios.post<OutboxResendResult>('/admin/outbox-messages/resend', {
        items,
        reason: reason?.trim() || undefined,
      });
      return data;
    },
    onSuccess: ({ accepted, skipped }) => {
      toastBulkResult(
        t,
        { acceptedCount: accepted.length, skipped },
        { success: 'toast.resendSuccess', partial: 'toast.resendPartial' },
        OUTBOX_SKIP_REASON_KEY,
      );
      void queryClient.invalidateQueries({ queryKey: outboxMessageKeys.all });
      // Outbox failed/stuck counts live in the same summary payload as the consumer-side ones.
      void queryClient.invalidateQueries({ queryKey: failedMessageKeys.summary() });
    },
    onError: () => {
      toast.error(t('toast.actionError'));
    },
  });
};
