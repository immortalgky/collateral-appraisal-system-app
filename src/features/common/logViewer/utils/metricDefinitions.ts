import { formatCount, formatP95, formatPercent } from './formatMetric';
import { METRIC_THRESHOLDS } from './metricThresholds';

/**
 * The full metric list for the health tab's 6 charts. The strip under the log histogram shows
 * just the first four (cpu/memory/queue/p95) — rpm/http5xx aren't part of that quick-glance view.
 * Defined once so both stay in sync (label, format, threshold) instead of two hand-copied lists
 * that can drift apart.
 */
export const METRIC_DEFINITIONS = [
  {
    key: 'cpu',
    field: 'cpuPercent',
    domain: [0, 100],
    format: formatPercent,
    threshold: METRIC_THRESHOLDS.cpu.bad,
  },
  {
    key: 'memory',
    field: 'machineMemoryPercent',
    domain: [0, 100],
    format: formatPercent,
    threshold: METRIC_THRESHOLDS.memory.bad,
  },
  {
    key: 'queue',
    field: 'threadPoolQueue',
    domain: [0, 'auto'],
    format: formatCount,
    threshold: METRIC_THRESHOLDS.queue.bad,
  },
  {
    key: 'p95',
    field: 'p95Ms',
    domain: [0, 'auto'],
    format: formatP95,
    threshold: METRIC_THRESHOLDS.p95.bad,
  },
  {
    key: 'rpm',
    field: 'requestsPerMin',
    domain: [0, 'auto'],
    format: formatCount,
    threshold: undefined,
  },
  {
    key: 'http5xx',
    field: 'http5xxPerMin',
    domain: [0, 'auto'],
    format: formatCount,
    threshold: METRIC_THRESHOLDS.http5xx.bad,
  },
] as const;

/** The strip only shows this many — the first N entries above (cpu/memory/queue/p95). */
export const STRIP_METRIC_COUNT = 4;
