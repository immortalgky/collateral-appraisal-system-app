import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import { server } from '@/test/mocks/server';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
const guard = vi.hoisted(() => ({
  suspend: vi.fn(),
  stop: vi.fn(),
  stopResult: undefined as Promise<void> | undefined,
}));
vi.mock('@shared/realtime/appHub', () => ({
  stop: () => {
    guard.stop();
    return guard.stopResult ?? Promise.resolve();
  },
}));
vi.mock('@shared/api/axiosInstance', async importOriginal => ({
  ...(await importOriginal<typeof import('@shared/api/axiosInstance')>()),
  suspendLoginRedirect: guard.suspend,
}));

const START = 'http://localhost:3000/';
const location = { href: START, origin: 'http://localhost:3000', replace: vi.fn() };

type Listener = (event: { data: unknown }) => void;
class FakeChannel {
  static instances: FakeChannel[] = [];
  listeners: Listener[] = [];
  postMessage = vi.fn();
  constructor() {
    FakeChannel.instances.push(this);
  }
  addEventListener(_type: string, l: Listener) {
    this.listeners.push(l);
  }
  removeEventListener(_type: string, l: Listener) {
    this.listeners = this.listeners.filter(x => x !== l);
  }
}

const load = async () => {
  vi.resetModules();
  FakeChannel.instances = [];
  vi.stubGlobal('BroadcastChannel', FakeChannel);
  const mod = await import('./logout');
  // After the imports: axios reads window.location while it loads.
  vi.stubGlobal('location', location);
  return mod;
};

describe('logout', () => {
  beforeEach(() => {
    guard.stopResult = undefined;
    location.href = START;
    location.replace = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('ends the session, tells other tabs, and follows the IdP end-session URL', async () => {
    server.use(
      http.post('*/api/auth/logout', () =>
        HttpResponse.json({ url: 'https://idp.example.com/end' }),
      ),
    );
    const { logout } = await load();
    await logout();
    expect(FakeChannel.instances[0].postMessage).toHaveBeenCalledWith({ type: 'logout' });
    expect(location.replace).toHaveBeenCalledWith('https://idp.example.com/end');
  });

  it('leaves a flag for the sign-in page it lands on, set after sessionStorage was cleared', async () => {
    sessionStorage.setItem('cas-return', '{}');
    server.use(http.post('*/api/auth/logout', () => HttpResponse.json({ url: '/idp' })));
    const { logout } = await load();
    await logout();
    expect(sessionStorage.getItem('cas-signed-out')).toBe('1');
    expect(sessionStorage.getItem('cas-return')).toBeNull();
    sessionStorage.clear();
  });

  it('does not leave the flag when the sign-out fails', async () => {
    server.use(http.post('*/api/auth/logout', () => HttpResponse.json({}, { status: 500 })));
    const { logout } = await load();
    await logout();
    expect(sessionStorage.getItem('cas-signed-out')).toBeNull();
  });

  it.each([401, 403, 500])(
    'stays signed in, tells the user and tears nothing down when the API answers %i',
    async status => {
      server.use(http.post('*/api/auth/logout', () => HttpResponse.json({}, { status })));
      const { logout } = await load();
      await logout();
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(location.replace).not.toHaveBeenCalled();
      expect(FakeChannel.instances[0].postMessage).not.toHaveBeenCalled();
    },
  );

  it('holds the sign-in redirect for good and stops the hub once signed out', async () => {
    server.use(http.post('*/api/auth/logout', () => HttpResponse.json({ url: '/idp' })));
    const { logout } = await load();
    await logout();
    expect(guard.suspend).toHaveBeenCalledWith(true);
    expect(guard.suspend).not.toHaveBeenCalledWith(false); // the page is leaving
    expect(guard.stop).toHaveBeenCalledTimes(1);
  });

  it('only gives the redirect guard back when the sign-out fails, leaving the hub alone', async () => {
    server.use(http.post('*/api/auth/logout', () => HttpResponse.json({}, { status: 500 })));
    const { logout } = await load();
    await logout();
    expect(guard.suspend).toHaveBeenLastCalledWith(false);
    expect(guard.stop).not.toHaveBeenCalled();
  });

  it('lets the next 401 sign the user in again if the page did not leave', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    server.use(http.post('*/api/auth/logout', () => HttpResponse.json({ url: '/idp' })));
    const { logout } = await load();
    const { REDIRECT_SETTLE_MS } = await import('@shared/api/forcedNavigation');
    await logout();
    expect(location.replace).toHaveBeenCalledWith('/idp'); // e.g. a "Leave site?" prompt was declined
    expect(guard.suspend).not.toHaveBeenCalledWith(false);

    vi.advanceTimersByTime(REDIRECT_SETTLE_MS);
    expect(guard.suspend).toHaveBeenLastCalledWith(false);
  });

  it('joins a sign-out already in progress instead of starting another', async () => {
    let posts = 0;
    server.use(
      http.post('*/api/auth/logout', () => {
        posts++;
        return HttpResponse.json({ url: '/idp' });
      }),
    );
    const { logout } = await load();
    const first = logout();
    const second = logout(); // a double click
    expect(second).toBe(first);
    await Promise.all([first, second]);
    expect(posts).toBe(1);
    expect(location.replace).toHaveBeenCalledTimes(1);

    await logout(); // the page is still leaving: still the same sign-out
    expect(posts).toBe(1);
  });

  it('can be retried after a failed sign-out', async () => {
    let posts = 0;
    server.use(
      http.post('*/api/auth/logout', () => {
        posts++;
        return posts === 1
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json({ url: '/idp' });
      }),
    );
    const { logout } = await load();
    await logout();
    expect(location.replace).not.toHaveBeenCalled();
    await logout();
    expect(posts).toBe(2);
    expect(location.replace).toHaveBeenCalledWith('/idp');
  });

  it('does not let a hub that is slow to stop hold the sign-out', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    guard.stopResult = new Promise(() => {}); // never settles
    server.use(http.post('*/api/auth/logout', () => HttpResponse.json({ url: '/idp' })));
    const { logout } = await load();
    const { REDIRECT_SETTLE_MS } = await import('@shared/api/forcedNavigation');
    const done = logout();
    await vi.waitFor(() => expect(guard.stop).toHaveBeenCalled());
    expect(location.replace).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(REDIRECT_SETTLE_MS);
    await done;
    expect(location.replace).toHaveBeenCalledWith('/idp');
  });

  it('stays signed in when the API cannot be reached', async () => {
    server.use(http.post('*/api/auth/logout', () => HttpResponse.error()));
    const { logout } = await load();
    await logout();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(location.replace).not.toHaveBeenCalled();
  });

  it('falls back to /login when a 200 carries no end-session URL', async () => {
    server.use(http.post('*/api/auth/logout', () => HttpResponse.json({})));
    const { logout } = await load();
    await logout();
    expect(location.replace).toHaveBeenCalledWith('/login');
  });

  describe('when another tab signs out', () => {
    const here = (pathname: string, search = '') => {
      const tab = { ...location, pathname, search, hash: '', href: START };
      vi.stubGlobal('location', tab);
      return tab;
    };
    const signOutElsewhere = () =>
      FakeChannel.instances[0].listeners.forEach(l => l({ data: { type: 'logout' } }));

    it('sends this tab to sign in saying it was signed out, with no page for the next person', async () => {
      const { listenForRemoteLogout } = await load();
      const tab = here('/tasks', '?x=1');
      sessionStorage.setItem('cas-return', JSON.stringify({ path: '/tasks?x=1', label: 'Tasks' }));
      const stop = listenForRemoteLogout();
      signOutElsewhere();
      expect(tab.href).toBe('/login?reason=signed-out');
      expect(sessionStorage.getItem('cas-return')).toBeNull(); // a bare /login cannot bring the page back
      stop();
      expect(FakeChannel.instances[0].listeners).toHaveLength(0);
    });

    it("goes to the canonical origin's sign-in page when this tab is on another host name", async () => {
      vi.stubEnv('VITE_APP_URL', 'https://app.example.com');
      const { listenForRemoteLogout } = await load();
      const tab = here('/tasks', '?x=1');
      listenForRemoteLogout();
      signOutElsewhere();
      expect(tab.replace).toHaveBeenCalledWith('https://app.example.com/login?reason=signed-out');
      vi.unstubAllEnvs();
    });

    it('keeps the sign-in page where it is', async () => {
      const { listenForRemoteLogout } = await load();
      const tab = here('/login', '?reason=idle');
      listenForRemoteLogout();
      signOutElsewhere();
      expect(tab.href).toBe(START);
    });
  });

  it('ignores other channel messages', async () => {
    const { listenForRemoteLogout } = await load();
    listenForRemoteLogout();
    FakeChannel.instances[0].listeners.forEach(l => l({ data: { type: 'other' } }));
    expect(location.href).toBe(START);
  });

  it('announces the signed-in user, and goes home when another tab signs in as someone else', async () => {
    const replace = vi.fn();
    const { announceUser, listenForRemoteLogout } = await load();
    vi.stubGlobal('location', { ...location, origin: 'https://app.example.com', replace });
    const { useAuthStore } = await import('../store');
    announceUser('u1');
    expect(FakeChannel.instances[0].postMessage).toHaveBeenCalledWith({ type: 'user', id: 'u1' });

    useAuthStore.getState().setUser({ id: 'u1' } as never);
    listenForRemoteLogout();
    const receive = (id: string) =>
      FakeChannel.instances[0].listeners.forEach(l => l({ data: { type: 'user', id } }));
    receive('u1');
    expect(replace).not.toHaveBeenCalled();
    receive('u2');
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('https://app.example.com/');
  });
});
