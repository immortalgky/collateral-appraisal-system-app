import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { errorHandlers } from '@/test/mocks/handlers';
import { queryClient } from '@app/queryClient';
import { hopToCanonicalOrigin, redirectToLogin } from '../utils/auth';
import { useAuthStore } from '../store';
import { AuthInitializer } from './AuthInitializer';

vi.mock('../utils/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('../utils/auth')>()),
  redirectToLogin: vi.fn(),
  hopToCanonicalOrigin: vi.fn(),
}));

describe('AuthInitializer', () => {
  beforeEach(() => {
    queryClient.clear();
    sessionStorage.clear();
    window.history.pushState(null, '', '/');
    useAuthStore.setState({ user: null, isAuthenticated: false });
    vi.mocked(hopToCanonicalOrigin).mockReturnValue(false);
  });

  it('holds the children back, then signs the user in from /auth/me', async () => {
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json({ firstName: 'Ann', lastName: 'Lee', username: 'ann', roles: [] }),
      ),
    );
    render(
      <AuthInitializer>
        <div>app</div>
      </AuthInitializer>,
    );
    expect(screen.queryByText('app')).not.toBeInTheDocument();
    expect(await screen.findByText('app')).toBeInTheDocument();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.name).toBe('Ann Lee');
  });

  describe('the state the sign-in page saved', () => {
    const me = () =>
      server.use(
        http.get('*/api/auth/me', () =>
          HttpResponse.json({ id: 'u1', username: 'ann', roles: [] }),
        ),
      );
    const saved = { path: '/tasks', label: 'Tasks', userId: 'u0' };
    const boot = async () => {
      render(
        <AuthInitializer>
          <div>app</div>
        </AuthInitializer>,
      );
      await screen.findByText('app');
    };

    it('is forgotten once the user is signed in on an app page', async () => {
      me();
      sessionStorage.setItem('cas-return', JSON.stringify(saved));
      await boot();
      expect(sessionStorage.getItem('cas-return')).toBeNull();
    });

    describe('when somebody else signed in', () => {
      // me() answers as u1; the page was saved for u0.
      const replace = vi.fn();
      beforeEach(() => {
        replace.mockClear();
        vi.stubGlobal('location', { ...window.location, pathname: '/tasks', replace });
      });
      afterEach(() => vi.unstubAllGlobals());

      it("leaves the previous user's page for the home page, once", async () => {
        me();
        sessionStorage.setItem('cas-return', JSON.stringify(saved));
        render(
          <AuthInitializer>
            <div>app</div>
          </AuthInitializer>,
        );
        await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
        // Cleared first, so the page it lands on has nothing left to act on.
        expect(sessionStorage.getItem('cas-return')).toBeNull();
        expect(replace).toHaveBeenCalledTimes(1);
      });

      it('stays when it is the same user', async () => {
        me();
        sessionStorage.setItem('cas-return', JSON.stringify({ ...saved, userId: 'u1' }));
        await boot();
        expect(replace).not.toHaveBeenCalled();
      });

      it('stays on a page that is not the saved one', async () => {
        me();
        sessionStorage.setItem('cas-return', JSON.stringify({ ...saved, path: '/other' }));
        await boot();
        expect(replace).not.toHaveBeenCalled();
      });

      it('does nothing without a saved user id', async () => {
        me();
        sessionStorage.setItem('cas-return', JSON.stringify({ path: '/tasks' }));
        await boot();
        expect(replace).not.toHaveBeenCalled();
      });
    });

    it('survives a boot on /login, where it is still what the page shows', async () => {
      me();
      window.history.pushState(null, '', '/login');
      sessionStorage.setItem('cas-return', JSON.stringify(saved));
      await boot();
      expect(JSON.parse(sessionStorage.getItem('cas-return')!)).toEqual(saved);
    });

    it('is not cleared when there is no session', async () => {
      server.use(errorHandlers.noSession);
      sessionStorage.setItem('cas-return', JSON.stringify(saved));
      await boot();
      expect(sessionStorage.getItem('cas-return')).not.toBeNull();
    });
  });

  it('renders the children as signed out on 401, without redirecting itself', async () => {
    server.use(errorHandlers.noSession);
    render(
      <AuthInitializer>
        <div>app</div>
      </AuthInitializer>,
    );
    expect(await screen.findByText('app')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it.each([500, 503])('shows a retry screen, not the login page, on a %i', async status => {
    server.use(http.get('*/api/auth/me', () => HttpResponse.json({}, { status })));
    render(
      <AuthInitializer>
        <div>app</div>
      </AuthInitializer>,
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('app')).not.toBeInTheDocument();
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it('boots normally once a retry succeeds', async () => {
    server.use(
      http.get('*/api/auth/me', () => HttpResponse.json({}, { status: 500 }), { once: true }),
    );
    render(
      <AuthInitializer>
        <div>app</div>
      </AuthInitializer>,
    );
    await userEvent.click(await screen.findByRole('button'));
    expect(await screen.findByText('app')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('hops to the canonical origin before asking the API anything', async () => {
    vi.mocked(hopToCanonicalOrigin).mockReturnValue(true);
    let asked = false;
    server.use(
      http.get('*/api/auth/me', () => {
        asked = true;
        return HttpResponse.json({});
      }),
    );
    render(
      <AuthInitializer>
        <div>app</div>
      </AuthInitializer>,
    );
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(asked).toBe(false);
    expect(screen.queryByText('app')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
