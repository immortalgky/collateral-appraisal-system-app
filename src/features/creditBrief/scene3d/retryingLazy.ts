import { type ComponentType, lazy, type LazyExoticComponent } from 'react';

/**
 * `lazy()` caches its promise, a rejected one included, so one failed chunk request would pin the
 * fallback for the rest of the session. This returns a getter that hands out the SAME lazy
 * component while it works, and drops it when its import fails so the next mount tries again.
 * The mount that hit the failure shows `fallback`.
 */
export function retryingLazy<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
  fallback: ComponentType<P>,
): () => LazyExoticComponent<ComponentType<P>> {
  let current: LazyExoticComponent<ComponentType<P>> | null = null;
  return () => {
    current ??= lazy(() =>
      load().catch(() => {
        current = null;
        return { default: fallback };
      }),
    );
    return current;
  };
}
