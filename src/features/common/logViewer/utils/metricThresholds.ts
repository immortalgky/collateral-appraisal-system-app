import type { ThresholdMetricKey } from '../types/metrics';

export type MetricLevel = 'ok' | 'warn' | 'bad';

interface ThresholdDef {
  warn: number;
  bad: number;
}

/** FE-only constants (per plan section F) — not yet configurable server-side. */
export const METRIC_THRESHOLDS: Record<ThresholdMetricKey, ThresholdDef> = {
  cpu: { warn: 70, bad: 85 },
  memory: { warn: 80, bad: 90 },
  queue: { warn: 10, bad: 50 },
  p95: { warn: 1500, bad: 5000 },
  http5xx: { warn: 3, bad: 10 },
};

/** A missing value (no samples in this bucket — the API omits the key rather than sending
 * null) is never "bad": there's nothing to warn about. */
export function levelFor(
  metric: ThresholdMetricKey,
  value: number | null | undefined,
): MetricLevel {
  if (value == null) return 'ok';
  const t = METRIC_THRESHOLDS[metric];
  if (value >= t.bad) return 'bad';
  if (value >= t.warn) return 'warn';
  return 'ok';
}

/** Worst (highest-severity) level among several — used for a machine card's overall status pill. */
export function worstLevel(levels: MetricLevel[]): MetricLevel {
  if (levels.includes('bad')) return 'bad';
  if (levels.includes('warn')) return 'warn';
  return 'ok';
}
