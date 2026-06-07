import { useCallback, useEffect, useState } from 'react';

const SCRIPT_ID = 'google-maps-script';

// How many times to (re-)inject the script before giving up. A connection reset
// to maps.googleapis.com (common behind a corporate proxy/firewall) is usually
// transient, so retrying with backoff recovers most failures automatically.
const MAX_ATTEMPTS = 3;

// `window.google` is declared in src/features/common/historySearch/components/MapView.tsx
// with a stricter shim type — we don't redeclare it here, just cast at the use site.

/**
 * Module-level promise — resolves once the Google Maps JS API is loaded.
 * Creating it once at the module level (not per-hook-instance) is what
 * defeats the race where the script tag finishes loading between the
 * "is google ready?" check and the "addEventListener('load')" attach:
 * everyone awaits the same promise, which is resolved exactly once by
 * whoever first injected the tag (or skipped injection because the tag
 * already existed).
 */
let loadPromise: Promise<void> | null = null;

// Every mounted hook registers a "kick" here. Because all maps share one script
// (and therefore one load outcome), a Retry click from any map must re-attempt
// loading for ALL of them — otherwise a shared failure leaves the other mounted
// maps stuck on `failed` with no way to recover until they remount.
const retryListeners = new Set<() => void>();

function retryAllGoogleMaps() {
  retryListeners.forEach(kick => kick());
}

function loadGoogleMaps(apiKey: string, libraries: string[]): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // If the eventual rejection bubbles out, null out the module-level
    // promise so a later consumer (or the same one after a retry) can try
    // again instead of getting the cached rejection forever.
    const rejectAndReset = (err: Error) => {
      loadPromise = null;
      reject(err);
    };

    if (window.google?.maps) {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // Tag is there but maps isn't ready yet — poll briefly. Polling beats
      // `existing.addEventListener('load')` because the `load` event may have
      // already fired by the time we get here.
      const start = Date.now();
      const poll = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(poll);
          resolve();
        } else if (Date.now() - start > 15_000) {
          clearInterval(poll);
          // Drop the stuck tag so a later retry re-injects a fresh script
          // instead of re-entering this same doomed poll.
          existing.remove();
          rejectAndReset(new Error('Google Maps script timed out (existing tag)'));
        }
      }, 50);
      return;
    }

    const libs = [...new Set(libraries)].sort().join(',');

    const inject = (attempt: number) => {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      // region=TH biases geocoding/behaviour toward Thailand (this is a Thai-only app).
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=${libs}&region=TH`;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener(
        'error',
        () => {
          // Drop the failed tag so the retry (or a later consumer) can re-inject cleanly.
          script.remove();
          if (attempt < MAX_ATTEMPTS) {
            // A connection reset to maps.googleapis.com fires this error event.
            // The reset is usually transient, so back off (with jitter) and retry
            // rather than giving up after a single failure. The timer is deliberately
            // NOT tied to any component's lifecycle: the script is an app-global
            // singleton, so an in-flight load that completes after a consumer
            // unmounts simply warms the cache for the next mount.
            const delay = 800 * 2 ** (attempt - 1) + Math.random() * 300;
            setTimeout(() => inject(attempt + 1), delay);
          } else {
            rejectAndReset(new Error('Google Maps script failed to load'));
          }
        },
        { once: true },
      );
      document.head.appendChild(script);
    };

    inject(1);
  });

  return loadPromise;
}

/**
 * React hook wrapper around the module-level loader.
 *
 * `libraries` is the union of libraries this hook would like loaded. If a
 * previous caller already injected the script with a different subset, the
 * existing tag wins — pass the full superset at every call site (`['marker',
 * 'places']` everywhere in this app).
 *
 * Returns `{ ready, missingKey, failed, retry }`:
 *   - ready=true when `window.google.maps` is available
 *   - missingKey=true when `apiKey` is falsy (caller can render a fallback)
 *   - failed=true when loading was exhausted after all retries (caller can
 *     render a "Retry" fallback)
 *   - retry() re-attempts loading (clears `failed` and re-runs the loader)
 */
export function useGoogleMaps(
  apiKey: string | undefined,
  libraries: string[] = ['marker'],
): { ready: boolean; missingKey: boolean; failed: boolean; retry: () => void } {
  const [ready, setReady] = useState<boolean>(() => Boolean(window.google?.maps));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Retry every mounted map, not just this one — they share a single script load.
  const retry = useCallback(() => retryAllGoogleMaps(), []);

  // Register this hook's local "kick" so a Retry from any map re-attempts here too.
  useEffect(() => {
    const kick = () => {
      setFailed(false);
      setAttempt(a => a + 1);
    };
    retryListeners.add(kick);
    return () => {
      retryListeners.delete(kick);
    };
  }, []);

  useEffect(() => {
    if (!apiKey || ready) return;
    let cancelled = false;
    setFailed(false);
    loadGoogleMaps(apiKey, libraries)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(err => {
        if (!cancelled) {
          setFailed(true);
          // eslint-disable-next-line no-console
          console.error('[useGoogleMaps]', err);
        }
      });
    return () => {
      cancelled = true;
    };
    // libraries intentionally not in deps — caller should pass a stable union.
    // `attempt` is in deps so retry() re-runs the loader (loadPromise is null
    // after a rejection, so it re-injects cleanly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, ready, attempt]);

  return { ready, missingKey: !apiKey, failed, retry };
}
