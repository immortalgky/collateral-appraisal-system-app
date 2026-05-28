import { useEffect, useMemo, useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { z } from 'zod';
import type { ActivityColumnConfig, ColumnKey } from '../config/columnDefs';

// ── Zod schema ────────────────────────────────────────────────────────────────

/**
 * The persisted shape for task column config.
 * We use z.string() for individual column keys since the exact union is
 * runtime-dynamic — invalid keys are filtered out during normalization.
 */
const taskColumnsSchema = z.object({
  hidden: z.array(z.string()),
  order: z.array(z.string()),
});

type PersistedState = z.infer<typeof taskColumnsSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeState(
  raw: PersistedState,
  config: ActivityColumnConfig,
): { hidden: Set<ColumnKey>; order: ColumnKey[] } {
  const alwaysVisible = new Set<ColumnKey>([config.stickyColumn, ...(config.alwaysVisible ?? [])]);

  // Filter hidden to only valid, non-always-visible column keys
  const validHidden = raw.hidden.filter(
    (k): k is ColumnKey =>
      (config.columns as string[]).includes(k) && !alwaysVisible.has(k as ColumnKey),
  );

  // Restore order: saved order filtered to valid, unique keys, then append new columns.
  // Deduping guards against a corrupt/hand-edited stored value producing duplicate cells.
  const savedOrder = [
    ...new Set(
      raw.order.filter((k): k is ColumnKey => (config.columns as string[]).includes(k)),
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

function defaultPersistedState(config: ActivityColumnConfig): PersistedState {
  return { hidden: [], order: config.columns };
}

function readStored(storageKey: string, config: ActivityColumnConfig): PersistedState {
  try {
    const item = localStorage.getItem(storageKey);
    if (!item) return defaultPersistedState(config);
    const parsed = taskColumnsSchema.safeParse(JSON.parse(item));
    return parsed.success ? parsed.data : defaultPersistedState(config);
  } catch {
    return defaultPersistedState(config);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useColumnVisibility(storageKey: string, config: ActivityColumnConfig) {
  // Column layout is persisted per-screen in localStorage under the caller's storageKey.
  // Each screen (All Tasks, each activity view) owns its own key, so the views no longer
  // clobber each other — and the layout survives a page refresh.
  const [raw, setRawState] = useState<PersistedState>(() => readStored(storageKey, config));

  // Re-read when the screen changes: the activity table swaps activityId via the URL query
  // without remounting, so storageKey/config can change while the hook stays mounted.
  useEffect(() => {
    setRawState(readStored(storageKey, config));
  }, [storageKey, config]);

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
    () => new Set<ColumnKey>([config.stickyColumn, ...(config.alwaysVisible ?? [])]),
    [config.stickyColumn, config.alwaysVisible],
  );

  const visibleColumns = useMemo(() => order.filter(k => !hidden.has(k)), [order, hidden]);

  const toggleColumn = useCallback(
    (key: ColumnKey) => {
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
    (activeId: ColumnKey, overId: ColumnKey) => {
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
    setRaw(defaultPersistedState(config));
  }, [config, setRaw]);

  return {
    visibleColumns,
    orderedColumns: order,
    hidden,
    alwaysVisible,
    toggleColumn,
    reorderColumns,
    resetToDefault,
  };
}
