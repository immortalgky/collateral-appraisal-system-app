/**
 * One bucket's values for one machine. The API omits a key entirely rather than sending it as
 * `null` — an empty bucket is just `{ start }` — so every metric is optional here, and every
 * reader (shaping, formatting, thresholds, events) must treat a missing key exactly like null:
 * a gap, not 0.
 */
export interface MetricPoint {
  start: string;
  cpuPercent?: number;
  machineMemoryPercent?: number;
  threadPoolQueue?: number;
  p95Ms?: number;
  requestsPerMin?: number;
  http5xxPerMin?: number;
}

export interface MachineSeries {
  machineName: string;
  points: MetricPoint[];
}

export interface MetricRestart {
  machineName: string;
  at: string;
}

export interface SystemMetricsResult {
  bucketSeconds: number;
  machines: MachineSeries[];
  restarts: MetricRestart[];
}

/** GET /admin/system-metrics/current — only machines that sampled in the last 10 minutes. */
export interface CurrentMachineMetric {
  machineName: string;
  timeStamp: string;
  processStartedAt: string;
  cpuPercent: number;
  machineMemoryPercent: number;
  workingSetMb: number;
  gcHeapMb: number;
  gen2PerHour: number;
  threadCount: number;
  threadPoolQueue: number;
  requestsPerMin: number;
  http5xxPerMin: number;
  /** Omitted entirely (not `null`) when the machine served no requests in the window. */
  p95Ms?: number;
  exceptionsPerMin: number;
}

/** The metrics that carry a warn/bad threshold (see utils/metricThresholds.ts). */
export type ThresholdMetricKey = 'cpu' | 'memory' | 'queue' | 'p95' | 'http5xx';
