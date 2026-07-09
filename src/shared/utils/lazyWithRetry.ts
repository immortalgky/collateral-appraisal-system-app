import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Drop-in replacement for React.lazy that survives transient chunk-load failures.
 *
 * Dynamic import()s fail as a hard error when a chunk can't be fetched — a slow
 * network dropping the request, the Vite dev server mid-transform, or (in prod) a
 * redeploy that invalidated the old content-hashed chunk names an already-open tab
 * still references. React.lazy has no retry, so a single failed fetch dead-ends in
 * the ErrorBoundary.
 *
 * This wrapper:
 *   1. Retries the import a couple of times with a short backoff (heals slow-network blips).
 *   2. On persistent failure, force-reloads the page ONCE (guarded via sessionStorage)
 *      so the browser fetches a fresh index.html with the new chunk hashes — recovering
 *      from a stale deploy. The guard prevents a reload loop.
 *   3. Clears the guard on any successful load, so a future stale-deploy can reload again.
 */

const RELOAD_GUARD_KEY = 'chunk-reload-once';
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [500, 1200];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Loosely detect a failed dynamic-import / chunk-load error. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /dynamically imported module/i.test(message) ||
    /Failed to fetch/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

// Mirror React.lazy's own signature (ComponentType<any>) so pages that take props
// — e.g. PricingAnalysisPage({ subject }), BlockProjectPage({ projectType }) — type-check.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        const module = await factory();
        // Loaded fine — allow a future stale-deploy event to reload once again.
        try {
          window.sessionStorage.removeItem(RELOAD_GUARD_KEY);
        } catch {
          /* sessionStorage may be unavailable (private mode) — ignore */
        }
        return module;
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_DELAYS_MS[attempt] ?? 1200);
          continue;
        }

        // Out of retries. If this smells like a stale chunk, reload once to pick up
        // fresh hashes. Guard against reload loops.
        if (isChunkLoadError(error)) {
          let alreadyReloaded = false;
          try {
            alreadyReloaded = window.sessionStorage.getItem(RELOAD_GUARD_KEY) === '1';
            if (!alreadyReloaded) {
              window.sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
            }
          } catch {
            /* sessionStorage unavailable — fall through and rethrow */
          }

          if (!alreadyReloaded) {
            window.location.reload();
            // Never resolve; the page is being torn down and reloaded.
            return new Promise<{ default: T }>(() => {});
          }
        }

        // Already reloaded once (or not a chunk error) — let the ErrorBoundary handle it.
        throw error;
      }
    }
  });
}

export default lazyWithRetry;
