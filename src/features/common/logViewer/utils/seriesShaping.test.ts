import { describe, it, expect } from 'vitest';
import {
  shapeSeries,
  hasAnyMetricData,
  isIsolatedPoint,
  nearestBucketStart,
  dedupeRestartMarkers,
} from './seriesShaping';
import type { MachineSeries, MetricPoint } from '../types/metrics';

// The real API omits a metric key entirely rather than sending null — an empty bucket is just
// `{ start }`. `point()` mirrors that: only `overrides` end up as real keys.
const point = (
  start: string,
  overrides: Partial<Omit<MetricPoint, 'start'>> = {},
): MetricPoint => ({
  start,
  ...overrides,
});

const machines: MachineSeries[] = [
  {
    machineName: 'CAS-APP02',
    points: [point('2026-09-26T10:00:00', { cpuPercent: 40 }), point('2026-09-26T10:01:00')],
  },
  {
    machineName: 'CAS-APP01',
    points: [
      point('2026-09-26T10:00:00', { cpuPercent: 20 }),
      point('2026-09-26T10:01:00', { cpuPercent: 22 }),
    ],
  },
];

describe('shapeSeries', () => {
  it('zips machines by bucket index, sorted by machine name', () => {
    const rows = shapeSeries(machines, 'cpuPercent');
    expect(rows).toEqual([
      { start: '2026-09-26T10:00:00', 'CAS-APP01': 20, 'CAS-APP02': 40 },
      { start: '2026-09-26T10:01:00', 'CAS-APP01': 22, 'CAS-APP02': null },
    ]);
  });

  it('keeps a missing key as null rather than 0 — a gap, not a dip', () => {
    const rows = shapeSeries(machines, 'cpuPercent');
    expect(rows[1]['CAS-APP02']).toBeNull();
  });

  it('handles a bucket that is only `{ start }`, with every metric key missing', () => {
    const bareBucket: MachineSeries[] = [
      { machineName: 'CAS-APP01', points: [point('2026-09-26T10:00:00')] },
    ];
    const rows = shapeSeries(bareBucket, 'p95Ms');
    expect(rows).toEqual([{ start: '2026-09-26T10:00:00', 'CAS-APP01': null }]);
  });

  it('returns an empty array with no machines', () => {
    expect(shapeSeries([], 'cpuPercent')).toEqual([]);
  });
});

describe('hasAnyMetricData', () => {
  it('is true when any bucket on any machine has a value', () => {
    expect(hasAnyMetricData(machines)).toBe(true);
  });

  it('is false when every point is just `{ start }`', () => {
    const empty: MachineSeries[] = [
      { machineName: 'CAS-APP01', points: [point('2026-09-26T10:00:00')] },
    ];
    expect(hasAnyMetricData(empty)).toBe(false);
  });

  it('is false with no machines at all', () => {
    expect(hasAnyMetricData([])).toBe(false);
  });
});

describe('nearestBucketStart', () => {
  const rows = shapeSeries(machines, 'cpuPercent');

  it('snaps to the closest bucket start', () => {
    expect(nearestBucketStart(rows, '2026-09-26T10:00:20')).toBe('2026-09-26T10:00:00');
    expect(nearestBucketStart(rows, '2026-09-26T10:00:50')).toBe('2026-09-26T10:01:00');
  });

  it('places a restart inside the LAST bucket at the right edge of the range, not the left', () => {
    // 48 half-hour buckets — a restart in the final bucket must snap to the last `start`, never
    // fall back to the first one.
    const longRange = Array.from({ length: 48 }, (_, i) => ({
      start: new Date(Date.UTC(2026, 8, 27) + i * 1_800_000).toISOString(),
    }));
    const longMachine: MachineSeries[] = [{ machineName: 'CAS-APP01', points: longRange }];
    const longRows = shapeSeries(longMachine, 'cpuPercent');
    const lastBucketStart = longRows[longRows.length - 1].start;
    const restartAt = new Date(new Date(lastBucketStart).getTime() + 60_000).toISOString();
    expect(nearestBucketStart(longRows, restartAt)).toBe(lastBucketStart);
  });

  it('returns null with no rows', () => {
    expect(nearestBucketStart([], '2026-09-26T10:00:20')).toBeNull();
  });
});

describe('isIsolatedPoint', () => {
  it('is true for a lone sample with gaps on both sides', () => {
    const rows = shapeSeries(
      [
        {
          machineName: 'CAS-APP01',
          points: [
            point('2026-09-26T10:00:00'),
            point('2026-09-26T10:01:00', { cpuPercent: 42 }),
            point('2026-09-26T10:02:00'),
          ],
        },
      ],
      'cpuPercent',
    );
    expect(isIsolatedPoint(rows, 1, 'CAS-APP01')).toBe(true);
  });

  it('is false when either neighbour also has a value', () => {
    const rows = shapeSeries(
      [
        {
          machineName: 'CAS-APP01',
          points: [
            point('2026-09-26T10:00:00', { cpuPercent: 20 }),
            point('2026-09-26T10:01:00', { cpuPercent: 22 }),
            point('2026-09-26T10:02:00'),
          ],
        },
      ],
      'cpuPercent',
    );
    expect(isIsolatedPoint(rows, 0, 'CAS-APP01')).toBe(false);
    expect(isIsolatedPoint(rows, 1, 'CAS-APP01')).toBe(false);
  });

  it('is false for a gap itself — nothing to draw a dot for', () => {
    const rows = shapeSeries(
      [{ machineName: 'CAS-APP01', points: [point('2026-09-26T10:00:00')] }],
      'cpuPercent',
    );
    expect(isIsolatedPoint(rows, 0, 'CAS-APP01')).toBe(false);
  });

  it('treats a value at either edge of the range as isolated when its one neighbour is a gap', () => {
    const rows = shapeSeries(
      [
        {
          machineName: 'CAS-APP01',
          points: [point('2026-09-26T10:00:00', { cpuPercent: 5 }), point('2026-09-26T10:01:00')],
        },
      ],
      'cpuPercent',
    );
    expect(isIsolatedPoint(rows, 0, 'CAS-APP01')).toBe(true);
  });
});

describe('dedupeRestartMarkers', () => {
  const rows = shapeSeries(machines, 'cpuPercent'); // buckets at 10:00:00 and 10:01:00

  it('folds two restarts of the SAME machine in the same bucket into one marker', () => {
    const markers = dedupeRestartMarkers(rows, [
      { machineName: 'CAS-APP01', at: '2026-09-26T10:00:05' },
      { machineName: 'CAS-APP01', at: '2026-09-26T10:00:20' },
    ]);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({ start: '2026-09-26T10:00:00', machineName: 'CAS-APP01' });
    expect(markers[0].times).toEqual(['2026-09-26T10:00:05', '2026-09-26T10:00:20']);
  });

  it('gives two DIFFERENT machines restarting in the same bucket separate markers with unique keys', () => {
    const markers = dedupeRestartMarkers(rows, [
      { machineName: 'CAS-APP01', at: '2026-09-26T10:00:05' },
      { machineName: 'CAS-APP02', at: '2026-09-26T10:00:10' },
    ]);
    expect(markers).toHaveLength(2);
    const keys = markers.map(m => m.key);
    expect(new Set(keys).size).toBe(2);
    expect(markers.map(m => m.machineName).sort()).toEqual(['CAS-APP01', 'CAS-APP02']);
  });

  it('keeps restarts in different buckets as separate markers', () => {
    const markers = dedupeRestartMarkers(rows, [
      { machineName: 'CAS-APP01', at: '2026-09-26T10:00:05' },
      { machineName: 'CAS-APP01', at: '2026-09-26T10:01:05' },
    ]);
    expect(markers).toHaveLength(2);
    expect(markers.map(m => m.start)).toEqual(['2026-09-26T10:00:00', '2026-09-26T10:01:00']);
  });

  it('skips a restart that falls outside the rows entirely', () => {
    expect(
      dedupeRestartMarkers([], [{ machineName: 'CAS-APP01', at: '2026-09-26T10:00:05' }]),
    ).toEqual([]);
  });
});
