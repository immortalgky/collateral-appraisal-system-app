import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { startKeepAlive } from '@shared/api/userActivity';
import * as appHub from '@shared/realtime/appHub';
import { useAuthStore } from '../store.ts';
import { refreshCurrentUser, useCurrentUser } from '../api.ts';
import { useNotificationHub } from '@features/notification/hooks/useNotificationHub';
import { useReportJobReconciler } from '@features/reportGeneration/hooks/useReportJobReconciler';
import ForcedPasswordChange from './ForcedPasswordChange';
import { AccessWindowNotice } from './AccessWindowNotice';
import type { JSX } from 'react';

// A user-driven /auth/me (the keep-alive rule sends it just after input). Going through the query
// cache refreshes the store too, so an extended access window shows up without a reload. A 401
// takes the normal sign-in redirect.
const pingSession = () => {
  refreshCurrentUser().catch(() => {});
};

/**
 * Background services for a signed-in session. Rendered only once the route's gates are passed, so
 * a user stuck on the forced password change does not open a hub connection or make requests the
 * API refuses to answer yet.
 */
function SessionServices() {
  // Single SignalR connection for the entire authenticated session — lives
  // above all layouts so it doesn't tear down on Layout↔AppraisalLayout↔TaskLayout
  // navigation.
  useNotificationHub();
  // The hub belongs to this component: a tab that is gated (must change password) or signed out
  // must not keep a socket open. Stopped on the next tick so React StrictMode's simulated
  // unmount/remount (which re-runs the effect above) cancels it instead of killing the new hub.
  const stopTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(stopTimer.current);
    return () => {
      stopTimer.current = setTimeout(() => void appHub.stop().catch(() => {}), 0);
    };
  }, []);
  // Realtime + reconnect reconciler for async report jobs — zero overhead when
  // no jobs are tracked.
  useReportJobReconciler();
  // Tells the API the user is still here while they work without making requests (see userActivity).
  useEffect(() => startKeepAlive(pingSession), []);
  return null;
}

export function ProtectedRoute({ component }: { component: JSX.Element }) {
  const location = useLocation();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const mustChangePassword = useAuthStore(state => state.user?.mustChangePassword ?? false);
  // Keeps the user fresh: ForcedPasswordChange invalidates this query to release the gate.
  useCurrentUser();

  // AuthInitializer has already asked /auth/me, so "not authenticated" here means no session.
  if (!isAuthenticated) {
    // Remember what was asked for so signing in can bring the user back to it.
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  // Newly created / admin-reset accounts must set a new password before using the app.
  // Block every protected route until the change succeeds (which clears the flag on /auth/me).
  if (mustChangePassword) {
    return <ForcedPasswordChange />;
  }

  // The notice sits above every layout for the same reason the hubs do: a temporary account's
  // window can close on any screen, and the countdown must not restart on navigation.
  return (
    <>
      <SessionServices />
      <AccessWindowNotice />
      {component}
    </>
  );
}
