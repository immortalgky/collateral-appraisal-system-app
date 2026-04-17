import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@features/auth/store';
import { fetchMyMenu } from './api/menus';
import { useMenuStore } from './store';

/**
 * Fetches /auth/me/menu once after the user is authenticated.
 * Mounted inside <AuthInitializer> in App.tsx so it only runs post-auth.
 *
 * On success: populates useMenuStore (main + appraisal trees).
 * On failure: sets error state + shows a toast. Sidebar renders empty.
 * No fallback to hardcoded arrays.
 */
export function MenuInitializer({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  // Granular selectors prevent re-renders when unrelated store fields change.
  const setMenu = useMenuStore(state => state.setMenu);
  const setError = useMenuStore(state => state.setError);
  const isLoaded = useMenuStore(state => state.isLoaded);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hasFetched.current) return;

    hasFetched.current = true;

    fetchMyMenu()
      .then(({ main, appraisal }) => {
        setMenu(main, appraisal);
      })
      .catch(() => {
        setError('Failed to load navigation');
        toast.error('Failed to load navigation. The sidebar may be empty.', {
          id: 'menu-load-error',
          duration: 6000,
        });
      });
  }, [isAuthenticated, setMenu, setError]);

  // Reset fetch guard when user logs out so next login re-fetches
  useEffect(() => {
    if (!isAuthenticated) {
      hasFetched.current = false;
      useMenuStore.getState().reset();
    }
  }, [isAuthenticated]);

  // Show a minimal inline spinner only on first load (before isLoaded is true)
  // The router and layout still render so direct-URL navigation keeps working.
  if (isAuthenticated && !isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary"
          role="status"
          aria-label="Loading navigation"
        />
      </div>
    );
  }

  return <>{children}</>;
}
