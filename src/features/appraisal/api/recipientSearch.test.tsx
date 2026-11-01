import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import { act, renderHook, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { useRecipientSearch } from './recipientSearch';

describe('useRecipientSearch: pending means the term changed', () => {
  it('a refresh of the same term keeps the rows pickable, though a request is out', async () => {
    let slow = false;
    server.use(
      http.get('*/companies', async () => {
        if (slow) await delay(200);
        return HttpResponse.json({ companies: [] });
      }),
      http.get('*/auth/users', async () => {
        if (slow) await delay(200);
        return HttpResponse.json({
          items: [
            {
              id: 'u1',
              username: 'somchai',
              firstName: 'Somchai',
              lastName: 'J',
              email: 'somchai@lhbank.co.th',
              isActive: true,
              isLocked: false,
            },
          ],
        });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useRecipientSearch('so'), { wrapper });
    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));
    await waitFor(() => expect(result.current.waiting).toBe(false));

    slow = true;
    act(() => {
      void client.invalidateQueries({ queryKey: ['recipient-search'] });
      void client.invalidateQueries({ queryKey: ['users'] });
    });

    await waitFor(() => expect(result.current.waiting).toBe(true));
    // The same term is being refreshed: the spinner may show, the rows are current.
    expect(result.current.pending).toBe(false);
    expect(result.current.suggestions).toHaveLength(1);
    await waitFor(() => expect(result.current.waiting).toBe(false));
  });
});
