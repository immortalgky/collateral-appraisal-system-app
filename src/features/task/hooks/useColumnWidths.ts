import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import {
  columnDefs,
  DEFAULT_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
} from '../config/columnDefs';
import type { ColumnKey } from '../config/columnDefs';

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

type ColumnWidthsConfig = { columns: string[] };

export function useColumnWidths(storageKey: string, config: ColumnWidthsConfig) {
  const widthsKey = `${storageKey}-widths`;

  const [stored, setStoredState] = useState<StoredWidths>(() => readStored(widthsKey));

  // Re-read when storageKey changes (ActivityTaskTable swaps activityId without remounting)
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

  /** Resolved widths: stored value → column def default → global default */
  const widths: Record<string, number> = {};
  for (const key of config.columns) {
    widths[key] =
      stored[key] ??
      (columnDefs[key as ColumnKey]?.width ?? DEFAULT_COLUMN_WIDTH);
  }

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

  return { widths, setWidth, resetWidths };
}
