import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export type UnsavedChangesGuard = { when: boolean; skipRef: { current: boolean } };

export function useUnsavedChangesWarning(isDirty: boolean) {
  const skipRef = useRef(false);
  const { pathname } = useLocation();

  // No useBlocker here. The router honours only its last-registered blocker, so a clean page that
  // still held one could swallow every navigation with no dialog to answer. UnsavedChangesDialog
  // registers the blocker itself, and only while the form is dirty.
  const blocker: UnsavedChangesGuard = { when: isDirty, skipRef };

  const skipWarning = useCallback(() => {
    skipRef.current = true;
  }, []);

  // skipWarning() is for the navigation that follows a save, and has to lift when the form is next
  // edited. After create → navigate(`…/${id}`) React keeps the same page mounted, so a flag that
  // stayed set left the guard off for the rest of the visit and any later edit was lost without a
  // prompt. (A few callers skip after a save that does not navigate; for them this is what turns
  // the guard back on.)
  useEffect(() => {
    if (isDirty) skipRef.current = false;
  }, [isDirty]);

  // A pass for ONE navigation: once the location has changed, the skip is spent. A page instance
  // that outlives the navigation (a reused route element) is guarded again, router and
  // beforeunload alike. The blocker reads the flag before the location changes, so the navigation
  // the skip was meant for still goes through.
  useEffect(() => {
    skipRef.current = false;
  }, [pathname]);

  // Browser tab close / refresh. Honours skipWarning() like the router blocker does: after a save
  // that is about to leave the page, closing the tab must not ask about changes that were saved.
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      if (skipRef.current) return;
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return { blocker, skipWarning };
}
