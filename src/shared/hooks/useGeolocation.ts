import { useCallback, useState } from 'react';

export interface Coords {
  lat: number;
  lon: number;
}

/**
 * Thin wrapper around the browser Geolocation API.
 *
 * Exposes an imperative `locate()` that resolves to the user's coordinates, or
 * `null` on any failure (unsupported, permission denied, timeout). It never
 * rejects — callers treat `null` as "couldn't locate" and fall back silently.
 * Requires a secure context (HTTPS), which the app already runs under.
 */
export function useGeolocation() {
  const [locating, setLocating] = useState(false);

  const locate = useCallback((): Promise<Coords | null> => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return Promise.resolve(null);
    }
    setLocating(true);
    return new Promise<Coords | null>(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLocating(false);
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          // Denied / position unavailable / timeout — resolve null, never throw.
          setLocating(false);
          resolve(null);
        },
        // City-level accuracy is plenty for a "search near me" default; a cached
        // fix up to 5 min old avoids a slow GPS lock on first open.
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    });
  }, []);

  return { locate, locating };
}
