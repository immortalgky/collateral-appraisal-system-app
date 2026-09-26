import { useCallback, useEffect, useRef } from 'react';

export type UnsavedChangesGuard = { when: boolean; skipRef: { current: boolean } };

export function useUnsavedChangesWarning(isDirty: boolean) {
  const skipRef = useRef(false);

  // No useBlocker here. The router honours only its last-registered blocker, so a clean page that
  // still held one could swallow every navigation with no dialog to answer. UnsavedChangesDialog
  // registers the blocker itself, and only while the form is dirty.
  const blocker: UnsavedChangesGuard = { when: isDirty, skipRef };

  const skipWarning = useCallback(() => {
    skipRef.current = true;
  }, []);

  // skipWarning() covers the one navigation that follows it; every caller calls navigate() next.
  // It has to lift when the form is next edited. After create → navigate(`…/${id}`) React keeps the
  // same page mounted, so a flag that stayed set left the guard off for the rest of the visit and
  // any later edit was lost without a prompt.
  useEffect(() => {
    if (isDirty) skipRef.current = false;
  }, [isDirty]);

  // Browser tab close / refresh
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return { blocker, skipWarning };
}
