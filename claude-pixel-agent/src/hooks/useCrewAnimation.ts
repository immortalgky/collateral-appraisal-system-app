import { useEffect } from 'react';
import { usePixelAgentStore } from '../store';

const TICK_INTERVAL_MS = 1000;

/**
 * Runs the animation tick loop.
 * Handles: walking → arrival, celebrating → idle, idle → kitchen, kitchen → sleep
 */
export function useCrewAnimation() {
  const tick = usePixelAgentStore((s) => s.tick);

  useEffect(() => {
    const interval = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tick]);
}
