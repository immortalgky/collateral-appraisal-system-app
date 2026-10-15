import type {
  MachineSeries,
  MetricPoint,
  MetricRestart,
  ThresholdMetricKey,
} from '../types/metrics';
import { METRIC_THRESHOLDS } from './metricThresholds';
import { toApiDateTime } from './range';

export type MachineEvent =
  | { kind: 'restart'; id: string; machineName: string; ts: string; from: string; to: string }
  | {
      kind: 'breach';
      id: string;
      machineName: string;
      metric: ThresholdMetricKey;
      peakValue: number;
      ts: string;
      from: string;
      to: string;
    };

const METRIC_FIELDS: Record<ThresholdMetricKey, keyof MetricPoint> = {
  cpu: 'cpuPercent',
  memory: 'machineMemoryPercent',
  queue: 'threadPoolQueue',
  p95: 'p95Ms',
  http5xx: 'http5xxPerMin',
};

/** Window drawn around a restart so "ดู log ช่วงนี้" lands on logs from just before/after it. */
const RESTART_PADDING_MINUTES = 6;

function deriveBreachEvents(machine: MachineSeries, bucketSeconds: number): MachineEvent[] {
  const events: MachineEvent[] = [];
  for (const metric of Object.keys(METRIC_THRESHOLDS) as ThresholdMetricKey[]) {
    const field = METRIC_FIELDS[metric];
    const bad = METRIC_THRESHOLDS[metric].bad;
    let spanStartIndex: number | null = null;
    let peak = -Infinity;

    const flush = (endIndex: number) => {
      if (spanStartIndex === null) return;
      const startIndex = spanStartIndex;
      const startPoint = machine.points[startIndex];
      const endPoint = machine.points[endIndex] ?? startPoint;
      const to = new Date(new Date(endPoint.start).getTime() + bucketSeconds * 1000);
      events.push({
        kind: 'breach',
        id: `breach-${machine.machineName}-${metric}-${startPoint.start}`,
        machineName: machine.machineName,
        metric,
        peakValue: peak,
        ts: startPoint.start,
        from: startPoint.start,
        to: toApiDateTime(to),
      });
      spanStartIndex = null;
      peak = -Infinity;
    };

    machine.points.forEach((point, index) => {
      const value = point[field];
      if (typeof value === 'number' && value >= bad) {
        if (spanStartIndex === null) spanStartIndex = index;
        peak = Math.max(peak, value);
      } else {
        flush(index - 1);
      }
    });
    flush(machine.points.length - 1);
  }
  return events;
}

/**
 * "เหตุการณ์ในช่วงนี้" — restarts, plus one event per contiguous span where a metric stayed at or
 * above its *bad* threshold (warn-only spans are not events, matching plan section F). Pure and
 * client-side: no BE endpoint for this, it's derived from the same bucketed series and restarts
 * the strip/health charts already fetch. Sorted newest first.
 */
export function deriveMachineEvents(
  machines: MachineSeries[],
  restarts: MetricRestart[],
  bucketSeconds: number,
): MachineEvent[] {
  const events: MachineEvent[] = [];
  for (const restart of restarts) {
    const at = new Date(restart.at);
    events.push({
      kind: 'restart',
      id: `restart-${restart.machineName}-${restart.at}`,
      machineName: restart.machineName,
      ts: restart.at,
      from: toApiDateTime(new Date(at.getTime() - RESTART_PADDING_MINUTES * 60_000)),
      to: toApiDateTime(new Date(at.getTime() + RESTART_PADDING_MINUTES * 60_000)),
    });
  }
  for (const machine of machines) {
    events.push(...deriveBreachEvents(machine, bucketSeconds));
  }
  return events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}
