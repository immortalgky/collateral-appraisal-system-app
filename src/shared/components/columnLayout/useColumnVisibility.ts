import { useEffect, useMemo, useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { z } from 'zod';
import type { ColumnLayoutConfig } from './types';

// ── Zod schema ────────────────────────────────────────────────────────────────

/**
 * The persisted shape for a screen's column config.
 * We use z.string() for individual column keys since the exact union is
 * runtime-dynamic — invalid keys are filtered out during normalization.
 *
 * ⚠️ This schema and normalizeState below are load-bearing for layouts users have already saved.
 * Changing either can silently discard a stored layout, so treat them as a persisted contract.
 */
const columnLayoutSchema = z.object({
  hidden: z.array(z.string()),
  order: z.array(z.string()),
});

type PersistedState = z.infer<typeof columnLayoutSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeState<K extends string>(
  raw: PersistedState | null,
  config: ColumnLayoutConfig<K>,
): { hidden: Set<K>; order: K[] } {
  const alwaysVisible = new Set<K>([config.stickyColumn, ...(config.alwaysVisible ?? [])]);

  // Nothing stored: start from the screen's defaults. Once anything IS stored the user has spoken,
  // and defaultHidden must not creep back in and re-hide a column they turned on.
  const effective: PersistedState = raw ?? { hidden: [...(config.defaultHidden ?? [])], order: [] };

  // Filter hidden to only valid, non-always-visible column keys
  const validHidden = effective.hidden.filter(
    (k): k is K => (config.columns as readonly string[]).includes(k) && !alwaysVisible.has(k as K),
  );

  // Restore order: saved order filtered to valid, unique keys, then append new columns.
  // Deduping guards against a corrupt/hand-edited stored value producing duplicate cells.
  const savedOrder = [
    ...new Set(
      effective.order.filter((k): k is K => (config.columns as readonly string[]).includes(k)),
    ),
  ];
  const missing = config.columns.filter(k => !savedOrder.includes(k));
  const order = [...savedOrder, ...missing];

  // The sticky column must always render first — force it to index 0 so a stale
  // saved order (or a user dragging another column ahead of it) can't unpin it.
  const sticky = config.stickyColumn;
  const ordered = [sticky, ...order.filter(k => k !== sticky)];

  return { hidden: new Set(validHidden), order: ordered };
}

/**
 * Returns null when this screen has no usable stored layout — absent, corrupt, or unreadable
 * storage all mean "never customised", which is what lets normalizeState apply `defaultHidden`
 * exactly once and never again.
 *
 * Deliberately takes no config: see the effect in the hook.
 */
function readStored(storageKey: string): PersistedState | null {
  try {
    const item = localStorage.getItem(storageKey);
    if (!item) return null;
    const parsed = columnLayoutSchema.safeParse(JSON.parse(item));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Per-screen column visibility and order, persisted in localStorage under `storageKey`.
 *
 * Each screen owns its own key, so views do not clobber each other and a layout survives a
 * refresh.
 */
export function useColumnVisibility<K extends string>(
  storageKey: string,
  config: ColumnLayoutConfig<K>,
) {
  const [raw, setRawState] = useState<PersistedState | null>(() => readStored(storageKey));

  // Re-read when the screen changes: a table can swap its storageKey via the URL query without
  // remounting.
  //
  // `config` is deliberately NOT a dependency. It is an object literal in most callers, so a new
  // identity arrives on every render; depending on it would fire this effect every render →
  // setState → re-render → a hang, not a warning. storageKey already identifies the screen, and
  // readStored no longer needs config at all. Fixing it here rather than asking callers to memoize
  // is the point: the trap is invisible from the call site.
  useEffect(() => {
    setRawState(readStored(storageKey));
  }, [storageKey]);

  const setRaw = useCallback(
    (next: PersistedState) => {
      setRawState(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore quota / unavailable-storage errors — in-memory state still updates
      }
    },
    [storageKey],
  );

  const { hidden, order } = useMemo(() => normalizeState(raw, config), [raw, config]);

  const alwaysVisible = useMemo(
    () => new Set<K>([config.stickyColumn, ...(config.alwaysVisible ?? [])]),
    [config.stickyColumn, config.alwaysVisible],
  );

  const visibleColumns = useMemo(() => order.filter(k => !hidden.has(k)), [order, hidden]);

  const toggleColumn = useCallback(
    (key: K) => {
      if (alwaysVisible.has(key)) return;
      const nextHidden = new Set(hidden);
      if (nextHidden.has(key)) {
        nextHidden.delete(key);
      } else {
        nextHidden.add(key);
      }
      setRaw({ hidden: [...nextHidden], order });
    },
    [alwaysVisible, hidden, order, setRaw],
  );

  const reorderColumns = useCallback(
    (activeId: K, overId: K) => {
      if (activeId === overId) return;
      const oldIndex = order.indexOf(activeId);
      const newIndex = order.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const nextOrder = arrayMove(order, oldIndex, newIndex);
      setRaw({ hidden: [...hidden], order: nextOrder });
    },
    [hidden, order, setRaw],
  );

  const resetToDefault = useCallback(() => {
    // Restores defaultHidden, not an empty set: on a screen that starts with columns off, clearing
    // it outright produces a table no default user has ever seen — the opposite of "put it back".
    setRaw({ hidden: [...(config.defaultHidden ?? [])], order: [...config.columns] });
  }, [config.columns, config.defaultHidden, setRaw]);

  /**
   * Columns the user has hidden BEYOND this screen's defaults — what a "you have hidden N" badge
   * should show. Counting `hidden` outright would greet a first-time visitor with a badge claiming
   * they hid three columns they have never seen.
   */
  const hiddenBeyondDefault = useMemo(() => {
    const byDefault = new Set<K>(config.defaultHidden ?? []);
    return [...hidden].filter(k => !byDefault.has(k)).length;
  }, [hidden, config.defaultHidden]);

  return {
    visibleColumns,
    orderedColumns: order,
    hidden,
    hiddenBeyondDefault,
    alwaysVisible,
    toggleColumn,
    reorderColumns,
    resetToDefault,
  };
}
