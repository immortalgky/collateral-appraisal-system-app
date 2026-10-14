import { Suspense, useEffect, useRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { router } from './router';
import { queryClient } from './queryClient';
import { MenuInitializer } from '@features/menuManagement/MenuInitializer';
import ThemeProvider from '@shared/components/ThemeProvider';
import PageLoader from '@shared/components/PageLoader';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import ActivitySubmitLiftoff from '@features/appraisal/components/ActivitySubmitLiftoff';
import { invalidateQueriesFor, useLiftoffStore } from '@features/appraisal/store/liftoffStore';

/** Runs `leave` once when it mounts: the boundary's fallback, so a crashed card still ends the way
 *  a closed one does instead of stranding the user on the page that was submitted. */
const LeaveOnMount = ({ leave }: { leave: () => void }) => {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    leave();
  }, [leave]);
  return null;
};

/** App level, outside the route tree. The card plays over the page that submitted (the decision
 *  page, the request page), which stays on screen but inert; the app navigates to the payload's
 *  `to` ('/tasks', '/requests') only when the card closes: the countdown ends, or OK, Enter, Escape
 *  or a click outside it. That single exit navigates, and the card is cleared only once the
 *  navigation has finished: clearing first would let the page behind (its task already closed)
 *  render one more time, and flash an error, before the route changes. If the location changes
 *  while the card is up by other means (browser Back works under the dialog), the user chose to go
 *  elsewhere: the card is just cleared, with no navigation. It uses the exported `router` rather
 *  than a hook because this component is not inside the RouterProvider.
 *  Plays whatever the liftoff store holds, then clears it. Imported statically (a lazy chunk that
 *  failed once stays failed for the session, and the component is small). A render error does not
 *  show the page-wide error screen: the work is already submitted, so the fallback just leaves as
 *  a closed card would. Keyed by `seq`, so it is fresh for every overlay and one error does not
 *  disable the overlay for the session. */
const LiftoffOverlay = () => {
  const liftoff = useLiftoffStore(s => s.liftoff);
  const seq = useLiftoffStore(s => s.seq);
  const clear = useLiftoffStore(s => s.clear);
  const active = liftoff !== null;

  // The card belongs to the page it opened over: leaving that path any other way drops the card.
  // The user chose to go elsewhere, possibly to a sibling tab of the closed item, so its cached
  // queries are invalidated too: that page then refetches and shows the true state instead of the
  // owner's view from before the submit.
  useEffect(() => {
    if (!active) return;
    const openedAt = router.state.location.pathname;
    return router.subscribe(state => {
      if (state.location.pathname === openedAt) return;
      const closedIds = useLiftoffStore.getState().liftoff?.closedIds;
      clear();
      if (closedIds) void invalidateQueriesFor(queryClient, closedIds);
    });
  }, [active, seq, clear]);

  if (!liftoff) return null;
  const { to, beforeLeave, ...card } = liftoff;
  const leave = () => {
    // The page's unsaved-changes guard is lifted right now, not when the card was shown.
    beforeLeave?.();
    // Cleared on success (the location listener above) and on a failed or blocked navigation.
    void router.navigate(to).then(clear, clear);
  };
  return (
    <ErrorBoundary key={seq} fallback={<LeaveOnMount leave={leave} />}>
      {/* useTranslation may suspend while a lazily loaded namespace arrives. */}
      <Suspense fallback={null}>
        <ActivitySubmitLiftoff {...card} onDone={leave} />
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * App root. Wrapped by AuthInitializer + AuthProvider in main.tsx.
 * MenuInitializer fetches /auth/me/menu once after authentication and
 * populates useMenuStore before the router renders layout/sidebar.
 */
function App() {
  return (
    <>
      <ThemeProvider />
      <MenuInitializer>
        <Suspense fallback={<PageLoader />}>
          <RouterProvider router={router} />
        </Suspense>
      </MenuInitializer>
      <LiftoffOverlay />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#fff', color: '#363636' },
          success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      >
        {t => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                {message}
                {t.type !== 'loading' && (
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    aria-label="Dismiss"
                    className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
    </>
  );
}

export default App;
