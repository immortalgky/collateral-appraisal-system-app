import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './constants';
import type { ColumnLayoutConfig } from './types';

// ── Zod schema ─────────────────────────────────────────────────────────────────

const columnWidthsSchema = z.record(z.string(), z.number());

type StoredWidths = z.infer<typeof columnWidthsSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function readStored(storageKey: string): StoredWidths {
  try {
    const item = localStorage.getItem(storageKey);
    if (!item) return {};
    const parsed = columnWidthsSchema.safeParse(JSON.parse(item));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Per-column widths, persisted under `${storageKey}-widths`.
 *
 * Defaults come from `config.defaultWidths` rather than from a feature's column registry, so a
 * screen can size its own columns without this hook knowing anything about that screen.
 */
export function useColumnWidths<K extends string>(
  storageKey: string,
  config: ColumnLayoutConfig<K>,
) {
  const widthsKey = `${storageKey}-widths`;

  const [stored, setStoredState] = useState<StoredWidths>(() => readStored(widthsKey));

  // Re-read when storageKey changes (a table can swap views without remounting)
  useEffect(() => {
    setStoredState(readStored(widthsKey));
  }, [widthsKey]);

  const persist = useCallback(
    (next: StoredWidths) => {
      setStoredState(next);
      try {
        localStorage.setItem(widthsKey, JSON.stringify(next));
      } catch {
        // ignore quota / unavailable-storage errors — in-memory state still updates
      }
    },
    [widthsKey],
  );

  /**
   * Resolved widths: stored value → per-column default → global default.
   *
   * Memoized on the identity of the two inputs it reads. Without this the object is rebuilt on
   * every render, and a consumer that feeds it into a dependency array re-runs forever.
   */
  const widths = useMemo(() => {
    const resolved: Record<string, number> = {};
    for (const key of config.columns) {
      resolved[key] = stored[key] ?? config.defaultWidths?.[key] ?? DEFAULT_COLUMN_WIDTH;
    }
    return resolved;
  }, [stored, config.columns, config.defaultWidths]);

  const setWidth = useCallback(
    (key: string, px: number) => {
      const clamped = Math.max(MIN_COLUMN_WIDTH, Math.round(px));
      persist({ ...stored, [key]: clamped });
    },
    [stored, persist],
  );

  const resetWidths = useCallback(() => {
    persist({});
  }, [persist]);

  /** Whether any column has a user-set width, so a caller can enable its own Reset control. */
  const hasCustomWidths = Object.keys(stored).length > 0;

  return { widths, setWidth, resetWidths, hasCustomWidths };
}
