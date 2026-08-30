import { useEffect, useState } from 'react';

/**
 * Mirrors `active`, but only turns true once it has stayed true for `delayMs`.
 *
 * Use it to gate loading indicators. A spinner or skeleton that appears and disappears inside a
 * few hundred milliseconds does not read as "loading" — it reads as the screen glitching. Holding
 * it back means a fast response updates the view directly, and the indicator is reserved for
 * requests slow enough that a person would otherwise wonder whether their click registered.
 *
 * Turning false is immediate: once the work is done there is nothing left to report.
 */
export function useDelayedFlag(active: boolean, delayMs = 250): boolean {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (!active) {
      setDelayed(false);
      return;
    }

    const timer = setTimeout(() => setDelayed(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return delayed;
}
