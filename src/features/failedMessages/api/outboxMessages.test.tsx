import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import axios from '@shared/api/axiosInstance';
import { GONE_POLL_INTERVAL_MS, POLL_INTERVAL_MS } from './detailPolling';
import { outboxMessageKeys, useGetOutboxMessages } from './outboxMessages';
import {
  createQueryWrapper,
  currentRefetchInterval,
  httpError,
  networkError,
} from './queryTestUtils';

vi.mock('@shared/api/axiosInstance', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('list polling (useGetOutboxMessages)', () => {
  const key = outboxMessageKeys.list({});

  const mountAfterFailure = async (error: Error) => {
    vi.mocked(axios.get).mockRejectedValue(error);
    const { queryClient, wrapper } = createQueryWrapper();
    renderHook(() => useGetOutboxMessages({}), { wrapper });
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
    renderHook(() => useGetOutboxMessages({}), { wrapper });
    await waitFor(() => expect(queryClient.getQueryState(key)?.status).toBe('success'));

    const { options } = queryClient.getQueryCache().find({ queryKey: key })!.observers[0];
    expect(options.refetchOnWindowFocus).toBe(true);
  });

  it('polls on a plain success', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: {} } as never);
    const { queryClient, wrapper } = createQueryWrapper();
    renderHook(() => useGetOutboxMessages({}), { wrapper });
    await waitFor(() => expect(queryClient.getQueryState(key)?.status).toBe('success'));

    expect(currentRefetchInterval(queryClient, key)).toBe(POLL_INTERVAL_MS);
  });
});
