/**
 * Counts an integer up to its value on mount, and animates between values on change.
 *
 * Deliberately tiny and dependency-free — the app has no animation library, and a KPI
 * count-up doesn't justify adding one. Falls back to rendering the plain number when
 * `animate` is false (reduced-motion preference).
 */
import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 600;

interface CountUpValueProps {
  value: number;
  animate?: boolean;
}

const CountUpValue = ({ value, animate = true }: CountUpValueProps) => {
  const [display, setDisplay] = useState(animate ? 0 : value);
  const frameRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      // easeOutCubic — fast start, gentle settle
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + delta * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = value;
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      // Keep the ending point accurate even if we were interrupted mid-flight, so the next
      // run tweens from what the user actually sees rather than snapping.
      fromRef.current = value;
    };
  }, [value, animate]);

  return <>{display.toLocaleString()}</>;
};

export default CountUpValue;
