import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

export function useUnsavedChangesWarning(isDirty: boolean) {
  const skipRef = useRef(false);

  const blocker = useBlocker(() => isDirty && !skipRef.current);

  const skipWarning = useCallback(() => {
    skipRef.current = true;
  }, []);

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
