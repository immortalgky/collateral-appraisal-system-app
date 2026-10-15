interface LiveLogLike {
  id: number;
}

/** The highest id in a batch — computed directly rather than trusted from array position, since
 * a batch's row order depends on the request's own `sortDir` and isn't something this code
 * should have to assume. Returns null for an empty batch. */
export function maxId(items: LiveLogLike[]): number | null {
  if (items.length === 0) return null;
  return items.reduce((max, item) => Math.max(max, item.id), items[0].id);
}

export interface DrainStep {
  /** The cursor to poll from next — unchanged from `currentCursor` when this batch was empty. */
  cursor: number | null;
  /** Whether to fetch again immediately this tick (bounded by `maxCalls`), rather than wait for
   * the next scheduled tick. */
  shouldContinue: boolean;
}

/**
 * One step of the Live-tail poll: given a batch just fetched (+ whether more exists beyond it),
 * decides the next cursor and whether to fetch again this tick. Never continues past `maxCalls`,
 * so a very chatty range can't turn one 5s tick into an unbounded fetch storm. Also used for the
 * initial "quiet window" seed search by passing `hasMore: false` — it never continues, but still
 * computes the right cursor (the batch's max id, or null if the batch was empty).
 */
export function nextDrainStep(
  items: LiveLogLike[],
  hasMore: boolean,
  currentCursor: number | null,
  callsMadeSoFar: number,
  maxCalls: number,
): DrainStep {
  const cursor = items.length > 0 ? maxId(items) : currentCursor;
  return { cursor, shouldContinue: hasMore && callsMadeSoFar < maxCalls };
}

/** Prepends the fresh (deduped) items to the buffer and caps it at `cap` — an all-day Live
 * session on a chatty range would otherwise grow this buffer unbounded; the cap is far more than
 * anyone scrolls through in the live view, and the full history is always still one preset click
 * away. `fresh` is NOT trusted to already be newest-first: a multi-batch drain tick collects
 * batches in fetch order, which is oldest-batch-first whenever traffic keeps outpacing pageSize —
 * sorting here (rather than trusting caller order) guarantees the cap always drops the OLDEST
 * rows, never the newest, regardless of how `fresh` or `prev` arrived. */
export function mergeLiveBuffer<T extends LiveLogLike>(prev: T[], fresh: T[], cap: number): T[] {
  if (fresh.length === 0) return prev;
  const known = new Set(prev.map(i => i.id));
  const deduped = fresh.filter(i => !known.has(i.id));
  if (deduped.length === 0) return prev;
  return [...deduped, ...prev].sort((a, b) => b.id - a.id).slice(0, cap);
}
