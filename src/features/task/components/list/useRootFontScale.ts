import { useEffect, useMemo, useState } from 'react';
import type { ColumnLayoutConfig } from '@/shared/components/columnLayout';

/** The root font size against the 14px the design values are written at (15px from 1920 up). */
const read = () =>
  Math.round(((parseFloat(getComputedStyle(document.documentElement).fontSize) || 14) / 14) * 100) /
  100;

/**
 * How much to scale a default width given in px at the 14px root, so a column holds the same text
 * at 1920 as at 1440. Read at mount and on resize (the root steps up at a viewport width).
 */
export function useRootFontScale() {
  const [scale, setScale] = useState(read);
  useEffect(() => {
    const update = () => setScale(read());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

/**
 * A column config whose default widths (px at the 14px root) are scaled with the root font size.
 * A width the user dragged is stored as is and is not touched.
 */
export function useScaledWidths<K extends string>(config: ColumnLayoutConfig<K>) {
  const scale = useRootFontScale();
  return useMemo(
    () => ({
      ...config,
      defaultWidths: Object.fromEntries(
        (Object.entries(config.defaultWidths ?? {}) as [string, number][]).map(([key, w]) => [
          key,
          Math.round(w * scale),
        ]),
      ) as Partial<Record<K, number>>,
    }),
    [config, scale],
  );
}
