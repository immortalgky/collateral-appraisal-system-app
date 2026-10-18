import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import axios from '@shared/api/axiosInstance';
import { uploadForm } from '@shared/api/blobTransfer';
import {
  projectUnitPriceKeys,
  useCalculateProjectUnitPrices,
  useImportUnitPrices,
  useSaveProjectUnitPrices,
} from './projectUnitPrice';

// No network: the one POST the mutation makes.
vi.mock('@shared/api/axiosInstance', () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn() },
}));

vi.mock('@shared/api/blobTransfer', () => ({ uploadForm: vi.fn(), downloadBlob: vi.fn() }));

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('invalidation after a price write', () => {
  it('also refreshes the approval lists, whose tier depends on the appraised total', async () => {
    vi.mocked(axios.post).mockResolvedValue({});
    const client = new QueryClient();
    const approvalList = ['workflow', 'wf1', 'activity', 'act1', 'approval-list'];
    const unrelated = ['workflow', 'wf1', 'activity', 'act1', 'something-else'];
    client.setQueryData(approvalList, { members: [] });
    client.setQueryData(unrelated, {});
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCalculateProjectUnitPrices(), { wrapper });
    result.current.mutate({ appraisalId: 'a1' });

    await waitFor(() => expect(client.getQueryState(approvalList)?.isInvalidated).toBe(true));
    expect(client.getQueryState(unrelated)?.isInvalidated).toBe(false);
  });

  it('keeps a flags save pending until the refetched prices have landed', async () => {
    vi.mocked(axios.put).mockResolvedValue({});
    const client = new QueryClient();
    // An active unit-prices query whose refetch we release by hand.
    let release: (rows: unknown[]) => void = () => {};
    const slowRefetch = new Promise<unknown[]>(resolve => (release = resolve));
    const { result: prices } = renderHook(
      () =>
        useQuery({
          queryKey: projectUnitPriceKeys.all('a1'),
          queryFn: () => slowRefetch,
          initialData: [],
        }),
      { wrapper: wrapperFor(client) },
    );
    const { result } = renderHook(() => useSaveProjectUnitPrices(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate({ appraisalId: 'a1', flags: [] });

    // The PUT is done, the refetch is still in flight: the mutation has not settled.
    await waitFor(() => expect(prices.current.isFetching).toBe(true));
    expect(axios.put).toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);

    release([{ projectUnitId: 'u1' }]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(prices.current.isFetching).toBe(false);
  });

  // A write the server may have committed although the client saw it fail (a dropped connection).
  const seededClient = () => {
    const client = new QueryClient();
    client.setQueryData(projectUnitPriceKeys.all('a1'), []);
    client.setQueryData(projectUnitPriceKeys.source('a1'), { source: 'Imported' });
    return client;
  };
  const expectRefreshed = (client: QueryClient) => {
    expect(client.getQueryState(projectUnitPriceKeys.all('a1'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(projectUnitPriceKeys.source('a1'))?.isInvalidated).toBe(true);
  };

  it('a failed import still refreshes the prices and the source', async () => {
    vi.mocked(uploadForm).mockRejectedValue(new Error('Network Error'));
    const client = seededClient();
    const { result } = renderHook(() => useImportUnitPrices(), { wrapper: wrapperFor(client) });

    result.current.mutate({ appraisalId: 'a1', file: new File(['x'], 'prices.xlsx') });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expectRefreshed(client);
  });

  it('gives the calculate request its own longer timeout than the shared 10 s cap', async () => {
    vi.mocked(axios.post).mockResolvedValue({});
    const { result } = renderHook(() => useCalculateProjectUnitPrices(), {
      wrapper: wrapperFor(new QueryClient()),
    });

    result.current.mutate({ appraisalId: 'a1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(axios.post).toHaveBeenCalledWith(
      '/appraisals/a1/project/unit-prices/calculate',
      undefined,
      { timeout: 120_000 },
    );
  });

  it('does not hold a save busy on approval lists: only the prices, source, summary and appraisal are awaited', async () => {
    vi.mocked(axios.post).mockResolvedValue({});
    const client = new QueryClient();
    // An active approval-list query whose refetch never finishes.
    const approvalList = ['workflow', 'wf1', 'activity', 'act1', 'approval-list'];
    renderHook(
      () =>
        useQuery({ queryKey: approvalList, queryFn: () => new Promise(() => {}), initialData: {} }),
      { wrapper: wrapperFor(client) },
    );
    const { result } = renderHook(() => useCalculateProjectUnitPrices(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate({ appraisalId: 'a1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryState(approvalList)?.isInvalidated).toBe(true);
  });

  it('a failed calculate still refreshes the prices and the source', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('Network Error'));
    const client = seededClient();
    const { result } = renderHook(() => useCalculateProjectUnitPrices(), {
      wrapper: wrapperFor(client),
    });

    result.current.mutate({ appraisalId: 'a1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expectRefreshed(client);
  });
});
