import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { errorHandlers } from '@/test/mocks/handlers';
import { queryClient } from '@app/queryClient';
import { hopToCanonicalOrigin, redirectToLogin } from '../utils/auth';
import { useAuthStore } from '../store';
import { AuthInitializer } from './AuthInitializer';

vi.mock('../utils/auth', () => ({ redirectToLogin: vi.fn(), hopToCanonicalOrigin: vi.fn() }));

describe('AuthInitializer', () => {
  beforeEach(() => {
    queryClient.clear();
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
