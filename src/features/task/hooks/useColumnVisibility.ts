import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { ActivityColumnConfig, ColumnKey } from '../config/columnDefs';

interface PersistedState {
  hidden: ColumnKey[];
  order: ColumnKey[];
}

function loadState(
  storageKey: string,
  config: ActivityColumnConfig,
): { hidden: Set<ColumnKey>; order: ColumnKey[] } {
  const alwaysVisible = new Set<ColumnKey>([
    config.stickyColumn,
    ...(config.alwaysVisible ?? []),
  ]);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { hidden: new Set(), order: config.columns };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { hidden: new Set(), order: config.columns };
    }
    const p = parsed as Partial<PersistedState>;

    // Restore hidden set — only keep valid, non-always-visible keys
    const validHidden = (p.hidden ?? []).filter(
      (k): k is ColumnKey =>
        (config.columns as string[]).includes(k) && !alwaysVisible.has(k),
    );

    // Restore order — start from saved order, then append any new columns added since save
    const savedOrder = (p.order ?? []).filter((k): k is ColumnKey =>
      (config.columns as string[]).includes(k),
    );
    const missing = config.columns.filter(k => !savedOrder.includes(k));
    const order = [...savedOrder, ...missing];

    return { hidden: new Set(validHidden), order };
  } catch {
    return { hidden: new Set(), order: config.columns };
  }
}

function saveState(storageKey: string, hidden: Set<ColumnKey>, order: ColumnKey[]): void {
  try {
    const state: PersistedState = { hidden: [...hidden], order };
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // ignore write errors (e.g. private browsing quota)
  }
}

export function useColumnVisibility(storageKey: string, config: ActivityColumnConfig) {
  const [hidden, setHidden] = useState<Set<ColumnKey>>(() => loadState(storageKey, config).hidden);
  const [order, setOrder] = useState<ColumnKey[]>(() => loadState(storageKey, config).order);

  const alwaysVisible = new Set<ColumnKey>([
    config.stickyColumn,
    ...(config.alwaysVisible ?? []),
  ]);

  // All columns in user-defined order (for the dropdown list)
  const orderedColumns = order;

  // Columns that are visible, in user-defined order (for the table)
  const visibleColumns = order.filter(k => !hidden.has(k));

  const toggleColumn = useCallback(
    (key: ColumnKey) => {
      const av = new Set<ColumnKey>([
        config.stickyColumn,
        ...(config.alwaysVisible ?? []),
      ]);
      if (av.has(key)) return;
      setHidden(prev => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        saveState(storageKey, next, order);
        return next;
      });
    },
    [storageKey, order, config.stickyColumn, config.alwaysVisible],
  );

  const reorderColumns = useCallback(
    (activeId: ColumnKey, overId: ColumnKey) => {
      if (activeId === overId) return;
      setOrder(prev => {
        const oldIndex = prev.indexOf(activeId);
        const newIndex = prev.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const next = arrayMove(prev, oldIndex, newIndex);
        saveState(storageKey, hidden, next);
        return next;
      });
    },
    [storageKey, hidden],
  );

  const resetToDefault = useCallback(() => {
    setHidden(new Set());
    setOrder(config.columns);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey, config.columns]);

  return {
    visibleColumns,
    orderedColumns,
    hidden,
    alwaysVisible,
    toggleColumn,
    reorderColumns,
    resetToDefault,
  };
}
