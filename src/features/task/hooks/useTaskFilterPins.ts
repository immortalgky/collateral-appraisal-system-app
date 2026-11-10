import { useCallback, useMemo, useState } from 'react';
import type { FilterPinControls } from '@/features/appraisal/components/search/FilterPinPicker';
import type { ActiveTab } from '../config/resolveInitialTab';
import { PINNED_TASK_FILTERS } from '../components/list/taskFilters';

/** Bump to put everyone back on the defaults (a saved choice otherwise always wins). */
const PINS_VERSION = 1;
const storageKey = (tab: ActiveTab) => `task-filter-pins-${tab}@${PINS_VERSION}`;

/** The saved pins of a tab, or null when it has none (absent, corrupt or unreadable storage). */
function readStored(tab: ActiveTab): string[] | null {
  try {
    const item = localStorage.getItem(storageKey(tab));
    if (!item) return null;
    const parsed: unknown = JSON.parse(item);
    return Array.isArray(parsed) && parsed.every(k => typeof k === 'string') ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The pinned filters of each task list tab: the filters whose chip the filter bar always shows,
 * in the order the user chose. Each tab keeps its own, in localStorage; a tab nobody has
 * customised uses PINNED_TASK_FILTERS. A saved filter that no longer exists is left out, and a new
 * filter starts unpinned for anyone who has saved pins.
 *
 * `knownKeys` are the filters that can be pinned (the ones the add-filter menu offers).
 */
export function useTaskFilterPins(tab: ActiveTab, knownKeys: readonly string[]) {
  const [saved, setSaved] = useState<Record<ActiveTab, string[] | null>>(() => ({
    personal: readStored('personal'),
    pool: readStored('pool'),
  }));

  const knownId = knownKeys.join('|');
  const pinned = useMemo(() => {
    const known = new Set(knownId.split('|'));
    return [...new Set(saved[tab] ?? PINNED_TASK_FILTERS[tab])].filter(k => known.has(k));
  }, [saved, tab, knownId]);

  const save = useCallback(
    (chosen: string[] | null) => {
      const defaults = PINNED_TASK_FILTERS[tab];
      let merged = chosen;
      if (chosen) {
        // Filters this page cannot pin (e.g. Task Type on an activity page) keep their slot
        const known = new Set(knownId.split('|'));
        const rest = [...chosen];
        const slots = [...new Set(saved[tab] ?? defaults)].map(k =>
          known.has(k) ? rest.shift() : k,
        );
        merged = [...slots.filter((k): k is string => k !== undefined), ...rest];
      }
      // Back on the defaults is no choice at all: drop the entry, so Reset has nothing to undo
      const next =
        merged && merged.length === defaults.length && merged.every((k, i) => k === defaults[i])
          ? null
          : merged;
      setSaved(s => ({ ...s, [tab]: next }));
      try {
        if (next === null) localStorage.removeItem(storageKey(tab));
        else localStorage.setItem(storageKey(tab), JSON.stringify(next));
      } catch {
        // ignore quota / unavailable-storage errors — in-memory state still updates
      }
    },
    [tab, saved, knownId],
  );

  const controls: FilterPinControls = {
    onTogglePin: key =>
      save(pinned.includes(key) ? pinned.filter(k => k !== key) : [...pinned, key]),
    onReorderPins: (activeKey, overKey) => {
      const from = pinned.indexOf(activeKey);
      const to = pinned.indexOf(overKey);
      if (from === -1 || to === -1 || from === to) return;
      const next = [...pinned];
      next.splice(to, 0, ...next.splice(from, 1));
      save(next);
    },
    onResetPins: () => save(null),
    canReset: saved[tab] !== null,
  };

  return { pinned, controls };
}
