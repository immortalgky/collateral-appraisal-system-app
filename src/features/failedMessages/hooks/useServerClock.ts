import { useEffect, useMemo, useState } from 'react';
import { serverClock, serverOffsetMs } from '../utils/queueHealth';

/**
 * The server's own clock (see serverOffsetMs/serverClock in utils/queueHealth.ts), kept ticking
 * between summary polls without ever reading the browser clock outside this hook.
 *
 * The offset is captured once per summary fetch and held in state so a later failed poll can't lose
 * it ("adjust state during render" pattern — safe because the condition only fires when the derived
 * value actually changes). `clientNow` mirrors `Date.now()` (read only inside a state initialiser or
 * an effect, never bare in render) and drives the returned `useMemo` directly — a 15s interval keeps
 * it advancing, and a second effect resyncs it to the current time the moment the offset changes, so
 * a new offset is reflected immediately rather than waiting for the next tick.
 */
export function useServerClock(
  summaryServerTime: string | undefined,
  dataUpdatedAt: number,
): Date | null {
  const offsetMs = useMemo(
    () => serverOffsetMs(summaryServerTime, dataUpdatedAt),
    [summaryServerTime, dataUpdatedAt],
  );
  const [lastOffsetMs, setLastOffsetMs] = useState<number | null>(null);
  if (offsetMs != null && offsetMs !== lastOffsetMs) setLastOffsetMs(offsetMs);

  const [clientNow, setClientNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setClientNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // A new offset must be reflected right away, not on the next 15s tick.
  useEffect(() => {
    setClientNow(Date.now());
  }, [lastOffsetMs]);

  return useMemo(() => serverClock(lastOffsetMs, clientNow), [lastOffsetMs, clientNow]);
}
