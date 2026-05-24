import { useEffect, useState } from 'react';

const SCRIPT_ID = 'google-maps-script';

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
          rejectAndReset(new Error('Google Maps script timed out (existing tag)'));
        }
      }, 50);
      return;
    }

    const libs = [...new Set(libraries)].sort().join(',');
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=${libs}`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => {
      // Also drop the tag so the next consumer can re-inject cleanly.
      script.remove();
      rejectAndReset(new Error('Google Maps script failed to load'));
    }, { once: true });
    document.head.appendChild(script);
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
 * Returns `{ ready, missingKey }`:
 *   - ready=true when `window.google.maps` is available
 *   - missingKey=true when `apiKey` is falsy (caller can render a fallback)
 */
export function useGoogleMaps(
  apiKey: string | undefined,
  libraries: string[] = ['marker'],
): { ready: boolean; missingKey: boolean } {
  const [ready, setReady] = useState<boolean>(() => Boolean(window.google?.maps));

  useEffect(() => {
    if (!apiKey || ready) return;
    let cancelled = false;
    loadGoogleMaps(apiKey, libraries)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(err => {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error('[useGoogleMaps]', err);
        }
      });
    return () => {
      cancelled = true;
    };
    // libraries intentionally not in deps — caller should pass a stable union.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, ready]);

  return { ready, missingKey: !apiKey };
}
