import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { fetchCurrentUser } from './api';
import { useAuthStore } from './store';

const me = (extra: Record<string, unknown> = {}) =>
  http.get('*/api/auth/me', () =>
    HttpResponse.json({ username: 'ann', firstName: 'Ann', lastName: 'Lee', roles: [], ...extra }),
  );

describe('fetchCurrentUser', () => {
  beforeEach(() => useAuthStore.setState({ user: null, isAuthenticated: false }));

  it('signs the user in', async () => {
    server.use(me());
    await fetchCurrentUser();
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      user: { name: 'Ann Lee' },
    });
  });

  it('keeps the same user object when nothing changed, so subscribers do not re-render', async () => {
    server.use(me());
    await fetchCurrentUser();
    const before = useAuthStore.getState().user;
    let updates = 0;
    const unsubscribe = useAuthStore.subscribe(() => updates++);

    const again = await fetchCurrentUser();
    unsubscribe();
    expect(useAuthStore.getState().user).toBe(before);
    expect(again).toBe(before);
    expect(updates).toBe(0);
  });

  it('replaces the user when something changed', async () => {
    server.use(me());
    await fetchCurrentUser();
    const before = useAuthStore.getState().user;

    server.use(me({ accessExpiresAt: '2026-10-10T18:00:00' }));
    await fetchCurrentUser();
    const after = useAuthStore.getState().user;
    expect(after).not.toBe(before);
    expect(after?.accessExpiresAt).toBe('2026-10-10T18:00:00');
  });

  it('signs the user back in when the data is unchanged but the store says signed out', async () => {
    server.use(me());
    await fetchCurrentUser();
    useAuthStore.setState({ isAuthenticated: false });
    await fetchCurrentUser();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('goes home, and does not publish the other user, when the session changed hands', async () => {
    const replace = vi.fn();
    vi.stubGlobal('location', { ...window.location, origin: 'https://app.example.com', replace });
    vi.stubEnv('VITE_APP_URL', 'https://app.example.com');
    server.use(me({ id: 'u1' }));
    await fetchCurrentUser();
    expect(replace).not.toHaveBeenCalled();
    server.use(me({ id: 'u2' }));
    await expect(fetchCurrentUser()).rejects.toThrow();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('https://app.example.com/');
    // A cancelled navigation leaves the tab on u1; the next check must refuse (and go home) again.
    expect(useAuthStore.getState().user?.id).toBe('u1');
    await expect(fetchCurrentUser()).rejects.toThrow();
    expect(replace).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
