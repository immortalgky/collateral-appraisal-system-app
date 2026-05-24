import { useMemo, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { z } from 'zod';
import { usePreferences } from '@shared/hooks/usePreferences';
import { PREFERENCE_KEYS } from '@features/menuFavorites/preferenceKeys';
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

  // Restore order: saved order filtered to valid keys, then append new columns
  const savedOrder = raw.order.filter((k): k is ColumnKey =>
    (config.columns as string[]).includes(k),
  );
  const missing = config.columns.filter(k => !savedOrder.includes(k));
  const order = [...savedOrder, ...missing];

  return { hidden: new Set(validHidden), order };
}

function defaultPersistedState(config: ActivityColumnConfig): PersistedState {
  return { hidden: [], order: config.columns };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useColumnVisibility(_storageKey: string, config: ActivityColumnConfig) {
  // _storageKey is kept in the signature for API compatibility but unused —
  // storage has moved to the backend under PREFERENCE_KEYS.taskColumns.
  const defaultValue = useMemo(() => defaultPersistedState(config), [config]);

  const { value: raw, setValue: setRaw } = usePreferences(
    PREFERENCE_KEYS.taskColumns,
    defaultValue,
    taskColumnsSchema,
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
