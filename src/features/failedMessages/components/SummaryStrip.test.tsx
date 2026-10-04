import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FailedMessagesSummary } from '../types';
import SummaryStrip from './SummaryStrip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Echo the key, plus the interpolated time when there is one — the time text is under test.
    // (a string 2nd arg is a default value, as DataErrorState passes)
    t: (key: string, opts?: Record<string, unknown> | string) =>
      typeof opts === 'object' && 'time' in opts ? `${key}|${opts.time}` : key,
    i18n: { language: 'en' },
  }),
}));

const summary = (outboxFailedCount: number, outboxStuckCount: number): FailedMessagesSummary => ({
  serverTime: '2026-09-27T09:00:00',
  pendingCount: 0,
  last24h: { total: 0, retried: 0, discarded: 0 },
  topGroups: [],
  outboxFailedCount,
  outboxStuckCount,
  nodes: [],
});

const outboxTile = (s: FailedMessagesSummary) => {
  render(
    <SummaryStrip summary={s} isLoading={false} isError={false} onRetry={vi.fn()} now={null} />,
  );
  return screen.getByText('summary.outboxLabel').parentElement as HTMLElement;
};

describe('SummaryStrip outbox tile tone', () => {
  it.each([
    ['failed only', 2, 0],
    ['stuck only', 0, 3],
    ['both', 1, 1],
  ])('is red for %s', (_name, failed, stuck) => {
    expect(outboxTile(summary(failed, stuck)).className).toContain('from-red-50');
  });

  it('is neutral when nothing failed or stuck', () => {
    expect(outboxTile(summary(0, 0)).className).not.toContain('from-red-50');
  });
});

describe('SummaryStrip outbox big number', () => {
  // Tile children: label, big number, sub-line.
  const bigNumber = (failed: number, stuck: number) =>
    outboxTile(summary(failed, stuck)).children[1] as HTMLElement;

  it('shows failed + stuck, in red, for 0/5', () => {
    const n = bigNumber(0, 5);
    expect(n.textContent).toBe('5');
    expect(n.className).toContain('text-red-600');
  });

  it('shows 3 for 3/0', () => {
    expect(bigNumber(3, 0).textContent).toBe('3');
  });

  it('shows a neutral 0 for 0/0', () => {
    const n = bigNumber(0, 0);
    expect(n.textContent).toBe('0');
    expect(n.className).not.toContain('text-red-600');
  });
});

describe('SummaryStrip collector "last collected" time', () => {
  const withNode = (now: Date | null) => {
    render(
      <SummaryStrip
        summary={{
          ...summary(0, 0),
          nodes: [
            {
              node: 'APP-NODE-01',
              collectedAt: '2026-09-27T09:00:00',
              managementStatus: 'Ok',
              queues: [],
            },
          ],
        }}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        now={now}
      />,
    );
  };

  it('shows only the clock time when the snapshot is from today', () => {
    withNode(new Date('2026-09-27T09:00:30'));

    expect(screen.getByText('summary.collectorFresh|09:00:00')).toBeInTheDocument();
  });

  it('includes the date while the clock is unknown', () => {
    withNode(null);

    expect(screen.getByText(/^summary\.collectorFresh\|27\/09\/2026/)).toBeInTheDocument();
  });
});

describe('SummaryStrip with no summary', () => {
  const renderEmpty = (isError: boolean) =>
    render(
      <SummaryStrip
        summary={undefined}
        isLoading={false}
        isError={isError}
        onRetry={vi.fn()}
        now={null}
      />,
    );

  it('does not show the error state for a paused query (no data, no error)', () => {
    const { container } = renderEmpty(false);
    expect(screen.queryByText('summary.loadFailed')).not.toBeInTheDocument();
    expect(container.querySelector('.grid')).not.toBeNull(); // the loading skeleton
  });

  it('shows the error state only when the query errored', () => {
    renderEmpty(true);
    expect(screen.getByText('summary.loadFailed')).toBeInTheDocument();
  });
});
