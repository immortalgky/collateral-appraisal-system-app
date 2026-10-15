import type { MachineSeries, MetricPoint } from '../types/metrics';
import { sortMachineNames } from './machineColors';

/** One row per bucket, one column per machine — the shape recharts wants for a multi-line chart. */
export interface ChartRow {
  start: string;
  [machineName: string]: number | string | null;
}

/**
 * Zips every machine's series into rows keyed by machine name, for one metric field at a time.
 * Machines are aligned by bucket INDEX (the contract guarantees each machine has exactly
 * `buckets` points in the same order), not by re-matching timestamps. A null point stays null —
 * recharts' <Line connectNulls={false}> then draws it as a gap rather than a dip to zero.
 */
export function shapeSeries(machines: MachineSeries[], field: keyof MetricPoint): ChartRow[] {
  if (machines.length === 0) return [];
  const order = sortMachineNames(machines.map(m => m.machineName));
  const sorted = order.map(name => machines.find(m => m.machineName === name)!);
  const length = sorted[0].points.length;
  return Array.from({ length }, (_, i) => {
    const row: ChartRow = { start: sorted[0].points[i]?.start ?? '' };
    for (const machine of sorted) {
      const value = machine.points[i]?.[field] ?? null;
      row[machine.machineName] = typeof value === 'number' ? value : null;
    }
    return row;
  });
}

/** True once at least one bucket, on at least one machine, has a real (non-null) value —
 * the strip and health charts hide themselves entirely otherwise. */
export function hasAnyMetricData(machines: MachineSeries[]): boolean {
  return machines.some(m =>
    m.points.some(
      p =>
        p.cpuPercent != null ||
        p.machineMemoryPercent != null ||
        p.threadPoolQueue != null ||
        p.p95Ms != null ||
        p.requestsPerMin != null ||
        p.http5xxPerMin != null,
    ),
  );
}

/**
 * True when a bucket has a real value for this machine but BOTH neighbours are gaps (or it's at
 * either edge of the range) — a lone sample `<Line connectNulls={false}>` can never draw as a
 * line segment, so it would otherwise be entirely invisible. Real samples arrive in short
 * clusters (an app pool that only wakes up occasionally, a gap after an outage), so this is a
 * routine case, not an edge case.
 */
export function isIsolatedPoint(rows: ChartRow[], index: number, machineName: string): boolean {
  const value = rows[index]?.[machineName];
  if (typeof value !== 'number') return false;
  const prev = rows[index - 1]?.[machineName];
  const next = rows[index + 1]?.[machineName];
  return typeof prev !== 'number' && typeof next !== 'number';
}

/** The `start` value in `rows` closest to `at` — used to place a restart's ReferenceLine on a
 * category x-axis, which can only be positioned at one of the axis's actual tick values. */
export function nearestBucketStart(rows: ChartRow[], at: string): string | null {
  if (rows.length === 0) return null;
  const target = new Date(at).getTime();
  let best = rows[0];
  let bestDiff = Math.abs(new Date(rows[0].start).getTime() - target);
  for (const row of rows) {
    const diff = Math.abs(new Date(row.start).getTime() - target);
    if (diff < bestDiff) {
      best = row;
      bestDiff = diff;
    }
  }
  return best.start;
}

export interface RestartMarker {
  /** Unique per (snapped bucket, machine) — safe as a React key even when several restarts land
   * in the same bucket. */
  key: string;
  start: string;
  machineName: string;
  /** Every restart timestamp folded into this marker, for a title listing them. */
  times: string[];
}

/**
 * Groups restarts by (snapped bucket, machine) so a chart draws exactly one ReferenceLine per
 * bucket per machine — not one per restart. Rendering one line per restart produced duplicate
 * React keys (same snapped `start`) whenever a machine restarted more than once inside a single
 * bucket, or whenever two machines restarted within the same bucket.
 */
export function dedupeRestartMarkers(
  rows: ChartRow[],
  restarts: { machineName: string; at: string }[],
): RestartMarker[] {
  const byKey = new Map<string, RestartMarker>();
  for (const restart of restarts) {
    const start = nearestBucketStart(rows, restart.at);
    if (start == null) continue;
    const key = `${start}__${restart.machineName}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.times.push(restart.at);
    } else {
      byKey.set(key, { key, start, machineName: restart.machineName, times: [restart.at] });
    }
  }
  return [...byKey.values()];
}
