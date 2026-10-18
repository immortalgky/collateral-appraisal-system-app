import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import axios from '@shared/api/axiosInstance';
import type { GetFailedMessagesParams } from '../types';
import { GONE_POLL_INTERVAL_MS, POLL_INTERVAL_MS } from './detailPolling';
import {
  failedMessageKeys,
  useGetFailedMessages,
  useGetFailedMessagesSummary,
} from './failedMessages';
import {
  createQueryWrapper,
  currentRefetchInterval,
  httpError,
  networkError,
} from './queryTestUtils';

vi.mock('@shared/api/axiosInstance', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('summary and list polling (useGetFailedMessagesSummary / useGetFailedMessages)', () => {
  const queries = [
    {
      name: 'summary',
      key: failedMessageKeys.summary(),
      useIt: () => useGetFailedMessagesSummary(),
    },
    {
      name: 'list',
      key: failedMessageKeys.list({}),
      useIt: () => useGetFailedMessages({}),
    },
  ];

  describe.each(queries)('$name query', ({ key, useIt }) => {
    const mountAfterFailure = async (error: Error) => {
      vi.mocked(axios.get).mockRejectedValue(error);
      const { queryClient, wrapper } = createQueryWrapper();
      renderHook(() => useIt(), { wrapper });
      await waitFor(() => expect(queryClient.getQueryState(key)?.status).toBe('error'));
      return queryClient;
    };

    it.each([403, 404])('backs off to 60s after a %i instead of stopping', async status => {
      const queryClient = await mountAfterFailure(httpError(status));

      expect(currentRefetchInterval(queryClient, key)).toBe(GONE_POLL_INTERVAL_MS);
    });

    it('keeps polling through a 502', async () => {
      const queryClient = await mountAfterFailure(httpError(502));

      expect(currentRefetchInterval(queryClient, key)).toBe(POLL_INTERVAL_MS);
    });

    it('keeps polling through a network error with no response', async () => {
      const queryClient = await mountAfterFailure(networkError());

      expect(currentRefetchInterval(queryClient, key)).toBe(POLL_INTERVAL_MS);
    });

    it('refetches when the tab regains focus (the app-wide default is off)', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: {} } as never);
      const { queryClient, wrapper } = createQueryWrapper();
      renderHook(() => useIt(), { wrapper });
      await waitFor(() => expect(queryClient.getQueryState(key)?.status).toBe('success'));

      const { options } = queryClient.getQueryCache().find({ queryKey: key })!.observers[0];
      expect(options.refetchOnWindowFocus).toBe(true);
    });

    it('polls on a plain success', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: {} } as never);
      const { queryClient, wrapper } = createQueryWrapper();
      renderHook(() => useIt(), { wrapper });
      await waitFor(() => expect(queryClient.getQueryState(key)?.status).toBe('success'));

      expect(currentRefetchInterval(queryClient, key)).toBe(POLL_INTERVAL_MS);
    });
  });
});

describe('useGetFailedMessages page change', () => {
  it('keeps the previous page as placeholder data while the next page loads', async () => {
    let resolvePage2!: (v: unknown) => void;
    vi.mocked(axios.get).mockImplementation((_url, config) =>
      config?.params.pageNumber === 2
        ? (new Promise(resolve => {
            resolvePage2 = resolve;
          }) as never)
        : (Promise.resolve({ data: { items: [], count: 45 } }) as never),
    );
    const { wrapper } = createQueryWrapper();
    const { result, rerender } = renderHook(
      ({ pageNumber }) => useGetFailedMessages({ pageNumber }),
      { wrapper, initialProps: { pageNumber: 1 } },
    );
    await waitFor(() => expect(result.current.data?.count).toBe(45));

    rerender({ pageNumber: 2 });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.count).toBe(45);

    resolvePage2({ data: { items: [], count: 44 } });
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data?.count).toBe(44);
  });

  it('does NOT keep the previous data on a tab change — it drops to the loading state', async () => {
    vi.mocked(axios.get).mockImplementation((_url, config) =>
      config?.params.status === 'Retried'
        ? (new Promise(() => undefined) as never)
        : (Promise.resolve({ data: { items: [], count: 45 } }) as never),
    );
    const { wrapper } = createQueryWrapper();
    const { result, rerender } = renderHook(
      (params: GetFailedMessagesParams) => useGetFailedMessages(params),
      { wrapper, initialProps: { status: 'Pending', pageNumber: 1 } as GetFailedMessagesParams },
    );
    await waitFor(() => expect(result.current.data?.count).toBe(45));

    rerender({ status: 'Retried', pageNumber: 1 });

    expect(result.current.isPlaceholderData).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });
});
