import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { User } from '../types';
import { useAuthStore } from '../store';
import { ProtectedRoute } from './ProtectedRoute';

const hub = vi.hoisted(() => vi.fn());
const reconciler = vi.hoisted(() => vi.fn());
const hubStop = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@shared/realtime/appHub', () => ({ stop: hubStop }));
vi.mock('../api.ts', () => ({ useCurrentUser: vi.fn() }));
vi.mock('@features/notification/hooks/useNotificationHub', () => ({ useNotificationHub: hub }));
vi.mock('@features/reportGeneration/hooks/useReportJobReconciler', () => ({
  useReportJobReconciler: reconciler,
}));
vi.mock('./ForcedPasswordChange', () => ({ default: () => <div>forced change</div> }));
vi.mock('./AccessWindowNotice', () => ({ AccessWindowNotice: () => null }));

const user = (extra: Partial<User> = {}) => ({ id: '1', ...extra }) as User;

function LoginProbe() {
  const state = useLocation().state as { from?: string } | null;
  return <div>login from {state?.from}</div>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/*" element={<ProtectedRoute component={<div>page</div>} />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    hubStop.mockClear();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('sends a signed-out user to /login, remembering the page they asked for', () => {
    renderAt('/appraisals/7?tab=2#top');
    expect(screen.getByText('login from /appraisals/7?tab=2#top')).toBeInTheDocument();
    expect(hub).not.toHaveBeenCalled();
  });

  it('renders the page and starts the background services for a signed-in user', () => {
    useAuthStore.setState({ user: user(), isAuthenticated: true });
    renderAt('/');
    expect(screen.getByText('page')).toBeInTheDocument();
    expect(hub).toHaveBeenCalled();
    expect(reconciler).toHaveBeenCalled();
  });

  it('holds the hub and the reconciler back until the forced password change is done', () => {
    useAuthStore.setState({ user: user({ mustChangePassword: true }), isAuthenticated: true });
    renderAt('/');
    expect(screen.getByText('forced change')).toBeInTheDocument();
    expect(screen.queryByText('page')).not.toBeInTheDocument();
    expect(hub).not.toHaveBeenCalled();
    expect(reconciler).not.toHaveBeenCalled();

    act(() => useAuthStore.setState({ user: user({ mustChangePassword: false }) }));
    expect(screen.getByText('page')).toBeInTheDocument();
    expect(hub).toHaveBeenCalled();
    expect(reconciler).toHaveBeenCalled();
  });

  it('stops the hub when the gate appears mid-session, and not on a StrictMode remount', async () => {
    vi.useFakeTimers();
    try {
      useAuthStore.setState({ user: user(), isAuthenticated: true });
      const { unmount } = render(
        <StrictMode>
          <MemoryRouter>
            <ProtectedRoute component={<div>page</div>} />
          </MemoryRouter>
        </StrictMode>,
      );
      vi.runAllTimers();
      expect(hubStop).not.toHaveBeenCalled();

      act(() => useAuthStore.setState({ user: user({ mustChangePassword: true }) }));
      vi.runAllTimers();
      expect(hubStop).toHaveBeenCalledTimes(1);
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
