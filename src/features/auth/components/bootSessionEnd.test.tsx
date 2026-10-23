import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { queryClient } from '@app/queryClient';
import LoginPage from '../pages/LoginPage';
import { useAuthStore } from '../store';
import { AuthInitializer } from './AuthInitializer';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@shared/components/LanguageSwitcher', () => ({ default: () => null }));

// The common real case: the laptop slept, the user comes back and reloads. The boot check gets the
// 401 (with the API's reason), and the sign-in page it ends up on must know why.
describe('a session that ended before the page booted', () => {
  let location: { origin: string; pathname: string; search: string; hash: string; href: string };

  const boot = (header?: string) => {
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json({}, { status: 401, headers: header ? { 'X-Session-End': header } : {} }),
      ),
    );
    render(
      <AuthInitializer>
        <div>app</div>
      </AuthInitializer>,
    );
  };

  beforeEach(() => {
    vi.stubEnv('VITE_APP_URL', 'https://app.example.com');
    queryClient.clear();
    sessionStorage.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false });
    location = {
      origin: 'https://app.example.com',
      pathname: '/tasks',
      search: '?x=1',
      hash: '',
      href: 'https://app.example.com/tasks?x=1',
    };
    vi.stubGlobal('location', location);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const signInPageFor = (url: string) => {
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );
    return screen.getByRole('heading', { level: 1 });
  };

  it('shows the idle state when the API said it idled out', async () => {
    boot('idle');
    await vi.waitFor(() => expect(location.href).toContain('/login?'));
    expect(location.href).toBe('/login?returnUrl=%2Ftasks&reason=idle');
    expect(signInPageFor(location.href)).toHaveTextContent('interstitial.idle.title');
  });

  it('keeps the spinner until the browser leaves, so ProtectedRoute cannot navigate over the redirect', async () => {
    boot('idle');
    await vi.waitFor(() => expect(location.href).toContain('reason=idle'));
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    try {
      await vi.advanceTimersByTimeAsync(60_000);
      expect(screen.queryByText('app')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the ended state for any other reason', async () => {
    boot('ended');
    await vi.waitFor(() => expect(location.href).toContain('reason=ended'));
    expect(signInPageFor(location.href)).toHaveTextContent('interstitial.ended.title');
  });

  it('claims nothing without the header: it renders as signed out and leaves the page to ProtectedRoute', async () => {
    boot();
    expect(await screen.findByText('app')).toBeInTheDocument();
    expect(location.href).toBe('https://app.example.com/tasks?x=1');
  });

  it('does not redirect from the sign-in page itself, so it cannot loop', async () => {
    location.pathname = '/login';
    location.search = '?returnUrl=%2Ftasks&reason=idle';
    boot('idle');
    expect(await screen.findByText('app')).toBeInTheDocument();
    expect(location.href).toBe('https://app.example.com/tasks?x=1');
  });
});
