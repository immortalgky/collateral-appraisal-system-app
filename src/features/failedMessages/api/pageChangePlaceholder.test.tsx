import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import axios from '@shared/api/axiosInstance';
import { useGetFailedMessages } from './failedMessages';
import { useGetOutboxMessages } from './outboxMessages';
import { createQueryWrapper } from './queryTestUtils';

vi.mock('@shared/api/axiosInstance', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

type Params = { pageNumber?: number; status?: string };
const hooks: [string, (p: Params) => ReturnType<typeof useGetFailedMessages>][] = [
  ['useGetFailedMessages', p => useGetFailedMessages(p as never)],
  ['useGetOutboxMessages', p => useGetOutboxMessages(p as never) as never],
];

describe.each(hooks)('%s page change', (_name, useIt) => {
  const mount = (page1: unknown) => {
    let resolvePage2!: (v: unknown) => void;
    vi.mocked(axios.get).mockImplementation((_url, config) =>
      config?.params.pageNumber === 2
        ? (new Promise(resolve => {
            resolvePage2 = resolve;
          }) as never)
        : config?.params.status === 'Other'
          ? (new Promise(() => undefined) as never)
          : (Promise.resolve({ data: page1 }) as never),
    );
    const { wrapper } = createQueryWrapper();
    const hook = renderHook((p: Params) => useIt(p), {
      wrapper,
      initialProps: { pageNumber: 1 } as Params,
    });
    return { ...hook, resolvePage2: (v: unknown) => resolvePage2(v) };
  };

  it('keeps the previous page as placeholder data while the next page loads', async () => {
    const { result, rerender, resolvePage2 } = mount({ items: [], count: 45 });
    await waitFor(() => expect(result.current.data?.count).toBe(45));

    rerender({ pageNumber: 2 });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.count).toBe(45);

    resolvePage2({ data: { items: [], count: 44 } });
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data?.count).toBe(44);
  });

  it('keeps an emptied page and an empty list too: these pages step back on their own, before paint', async () => {
    for (const page1 of [
      { items: [], count: 45 },
      { items: [], count: 0 },
    ]) {
      const { result, rerender, unmount } = mount(page1);
      await waitFor(() => expect(result.current.data?.count).toBe(page1.count));
      rerender({ pageNumber: 2 });
      expect(result.current.isPlaceholderData).toBe(true);
      unmount();
    }
  });

  it('does NOT keep the previous data on a tab change: it drops to the loading state', async () => {
    const { result, rerender } = mount({ items: [], count: 45 });
    await waitFor(() => expect(result.current.data?.count).toBe(45));

    rerender({ status: 'Other', pageNumber: 1 });

    expect(result.current.isPlaceholderData).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });
});
