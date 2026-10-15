/**
 * Resolves a chart click to the bucket the pointer was actually over, from recharts' chart-level
 * `activeLabel` (the XAxis `start` dataKey value at that X position) — never from a per-series
 * `<Bar onClick>` index. In recharts 3, that per-series index counts only the RENDERED rectangles
 * of that one series (zero-height segments for an empty bucket are skipped), so it drifts by the
 * number of empty buckets before the clicked one and can resolve to the wrong bucket entirely.
 * `activeLabel` is derived from the shared X-axis position instead, so it's correct regardless of
 * which (if any) series has a visible bar there — also true for the tooltip, which already uses
 * this exact same lookup.
 */
export function resolveClickedBucket<T extends { start: string }>(
  buckets: T[],
  activeLabel: unknown,
): T | null {
  if (typeof activeLabel !== 'string') return null;
  return buckets.find(b => b.start === activeLabel) ?? null;
}
