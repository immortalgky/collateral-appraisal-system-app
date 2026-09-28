import { describe, it, expect } from 'vitest';
import { deriveMachineEvents } from './machineEvents';
import type { MachineSeries, MetricPoint } from '../types/metrics';

const point = (
  start: string,
  overrides: Partial<Omit<MetricPoint, 'start'>> = {},
): MetricPoint => ({
  start,
  cpuPercent: 20,
  machineMemoryPercent: 50,
  threadPoolQueue: 1,
  p95Ms: 200,
  requestsPerMin: 100,
  http5xxPerMin: 0,
  ...overrides,
});

/** Drops a key entirely, the way an empty bucket really arrives from the API — not `null`. */
const omit = (p: MetricPoint, key: keyof MetricPoint): MetricPoint => {
  const copy = { ...p };
  delete copy[key];
  return copy;
};

describe('deriveMachineEvents', () => {
  it('produces one restart event, padded ±6 minutes', () => {
    const events = deriveMachineEvents(
      [],
      [{ machineName: 'CAS-APP01', at: '2026-09-26T10:00:00' }],
      60,
    );
    expect(events).toEqual([
      {
        kind: 'restart',
        id: 'restart-CAS-APP01-2026-09-26T10:00:00',
        machineName: 'CAS-APP01',
        ts: '2026-09-26T10:00:00',
        from: '2026-09-26T09:54:00.000',
        to: '2026-09-26T10:06:00.000',
      },
    ]);
  });

  it('collapses a contiguous over-threshold run into a single breach event with its peak', () => {
    const machine: MachineSeries = {
      machineName: 'CAS-APP01',
      points: [
        point('2026-09-26T10:00:00'),
        point('2026-09-26T10:01:00', { threadPoolQueue: 60 }),
        point('2026-09-26T10:02:00', { threadPoolQueue: 230 }),
        point('2026-09-26T10:03:00', { threadPoolQueue: 80 }),
        point('2026-09-26T10:04:00'),
      ],
    };
    const events = deriveMachineEvents([machine], [], 60);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'breach',
      machineName: 'CAS-APP01',
      metric: 'queue',
      peakValue: 230,
      ts: '2026-09-26T10:01:00',
      from: '2026-09-26T10:01:00',
    });
    // `to` is the last breaching bucket's start plus one bucket, so it covers that bucket fully.
    expect(events[0].to).toBe('2026-09-26T10:04:00.000');
  });

  it('does not fire for a warn-level value, only bad', () => {
    const machine: MachineSeries = {
      machineName: 'CAS-APP01',
      points: [point('2026-09-26T10:00:00', { cpuPercent: 75 })],
    };
    expect(deriveMachineEvents([machine], [], 60)).toEqual([]);
  });

  it('ignores buckets where the metric key is missing entirely, only real values count', () => {
    const machine: MachineSeries = {
      machineName: 'CAS-APP01',
      points: [
        omit(point('2026-09-26T10:00:00'), 'p95Ms'),
        omit(point('2026-09-26T10:01:00'), 'p95Ms'),
      ],
    };
    expect(deriveMachineEvents([machine], [], 60)).toEqual([]);
  });

  it('handles a bucket that is only `{ start }`, with every metric key missing', () => {
    const machine: MachineSeries = {
      machineName: 'CAS-APP01',
      points: [{ start: '2026-09-26T10:00:00' }],
    };
    expect(deriveMachineEvents([machine], [], 60)).toEqual([]);
  });

  it('sorts newest first', () => {
    const machine: MachineSeries = {
      machineName: 'CAS-APP01',
      points: [point('2026-09-26T09:00:00', { cpuPercent: 90 })],
    };
    const events = deriveMachineEvents(
      [machine],
      [{ machineName: 'CAS-APP01', at: '2026-09-26T11:00:00' }],
      60,
    );
    expect(events.map(e => e.kind)).toEqual(['restart', 'breach']);
  });
});
