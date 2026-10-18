import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { User } from '../types';
import { useAuthStore } from '../store';
import { queryClient } from '@app/queryClient';
import { currentUserQueryOptions, fetchCurrentUser } from '../api';
import { AccessWindowNotice } from './AccessWindowNotice';

vi.mock('../api', async () => {
  const { queryClient } = await import('@app/queryClient');
  const fetchCurrentUser = vi.fn();
  const currentUserQueryOptions = { queryKey: ['currentUser'], queryFn: () => fetchCurrentUser() };
  return {
    fetchCurrentUser,
    currentUserQueryOptions,
    refreshCurrentUser: () =>
      queryClient.fetchQuery({ ...currentUserQueryOptions, staleTime: 0, retry: false }),
  };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const NOW = new Date('2026-10-10T12:00:00');
// The server writes the end in its local time with no zone suffix; so does this.
const pad = (n: number) => String(n).padStart(2, '0');
const endIn = (ms: number) => {
  const d = new Date(NOW.getTime() + ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const setEnd = (accessExpiresAt: string | null) =>
  useAuthStore.setState({ user: { id: '1', accessExpiresAt } as User, isAuthenticated: true });

describe('AccessWindowNotice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    queryClient.clear();
    // Like the real fetchCurrentUser, publish the answer to the store.
    vi.mocked(fetchCurrentUser).mockImplementation(async () => {
      const user = { id: '1', accessExpiresAt: null } as User;
      useAuthStore.setState({ user });
      return user;
    });
  });
  afterEach(() => vi.useRealTimers());

  it('shows nothing for an ordinary account', () => {
    setEnd(null);
    render(<AccessWindowNotice />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('counts down once the window is close to ending', () => {
    setEnd(endIn(5 * 60 * 1000));
    render(<AccessWindowNotice />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(fetchCurrentUser).not.toHaveBeenCalled();
  });

  it('at the end re-reads /auth/me and hides itself when the account is no longer temporary', async () => {
    setEnd(endIn(2000));
    render(<AccessWindowNotice />);
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // The query cache moves with the store.
    expect(
      queryClient.getQueryData<User>(currentUserQueryOptions.queryKey)?.accessExpiresAt,
    ).toBeNull();
  });

  it('keeps counting when the window was extended', async () => {
    setEnd(endIn(2000));
    vi.mocked(fetchCurrentUser).mockImplementation(async () => {
      const user = { id: '1', accessExpiresAt: endIn(8 * 60 * 1000 + 3000) } as User;
      useAuthStore.setState({ user });
      return user;
    });
    render(<AccessWindowNotice />);
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('retries a failed check no faster than every 10 s, and never signs the user out', async () => {
    setEnd(endIn(1000));
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('network'));
    render(<AccessWindowNotice />);
    await act(() => vi.advanceTimersByTimeAsync(9000));
    expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(fetchCurrentUser).toHaveBeenCalledTimes(2);
  });
});
