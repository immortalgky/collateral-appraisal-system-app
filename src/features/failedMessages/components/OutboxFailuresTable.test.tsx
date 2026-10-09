import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { OutboxListItem } from '../types';
import { parseLocalDateTime } from '../utils/queueHealth';
import OutboxFailuresTable from './OutboxFailuresTable';

// Echo the key (plus any interpolated values) — the assertion is which key a row reaches for.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'hours' in opts ? `${key}:${opts.hours}h${opts.minutes}m` : key,
    i18n: { language: 'en' },
  }),
}));

const started = '2026-09-27T14:30:00';

const processingRow: OutboxListItem = {
  module: 'request',
  id: 'row-1',
  eventType: 'Some.Namespace.SomeEvent',
  occurredAt: started,
  processingStartedAt: started,
  retryCount: 0,
  status: 'Processing',
  newerSentCount: 0,
  typeResolvable: true,
  failureClass: null,
};

const renderTable = (props: { now: Date | null; stuckTab?: boolean }) =>
  render(
    <OutboxFailuresTable
      items={[processingRow]}
      isLoading={false}
      totalCount={1}
      isError={false}
      onRetry={vi.fn()}
      canManage={false}
      selection={new Map()}
      onToggleRow={vi.fn()}
      onToggleAll={vi.fn()}
      onOpen={vi.fn()}
      hasFilters={false}
      failedTab={!props.stuckTab}
      {...props}
    />,
  );

describe('OutboxFailuresTable Processing row', () => {
  it('on the Stuck tab renders Stuck even though the server clock is not known yet', () => {
    renderTable({ now: null, stuckTab: true });

    // Pill = Stuck, and the "stuck for Xh" duration (needs the clock) stays hidden.
    expect(screen.getAllByText('outboxStatus.Stuck').length).toBeGreaterThan(0);
    expect(screen.queryByText('outboxStatus.Processing')).not.toBeInTheDocument();
    expect(screen.queryByText(/table\.stuckFor/)).not.toBeInTheDocument();
  });

  it('on the Stuck tab shows the stuck-for duration once the clock is known', () => {
    const now = new Date(parseLocalDateTime(started).getTime() + 3 * 3_600_000 + 5 * 60_000);
    renderTable({ now, stuckTab: true });

    expect(screen.getByText('table.stuckFor:3h5m')).toBeInTheDocument();
  });

  it('on the Stuck tab a row claimed again just now reads Processing once the clock is known', () => {
    renderTable({ now: parseLocalDateTime(started), stuckTab: true });

    expect(screen.getAllByText('outboxStatus.Processing').length).toBeGreaterThan(0);
    expect(screen.queryByText('outboxStatus.Stuck')).not.toBeInTheDocument();
    expect(screen.queryByText(/table\.stuckFor/)).not.toBeInTheDocument();
  });

  it('off the Stuck tab still reads Processing while the clock is unknown', () => {
    renderTable({ now: null });

    expect(screen.getAllByText('outboxStatus.Processing').length).toBeGreaterThan(0);
    expect(screen.queryByText('outboxStatus.Stuck')).not.toBeInTheDocument();
  });
});

describe('OutboxFailuresTable default empty state', () => {
  const renderEmpty = (props: {
    outboxFailedCount?: number;
    outboxStuckCount?: number;
    stuckTab?: boolean;
    hasFilters?: boolean;
    failedTab?: boolean;
  }) =>
    render(
      <OutboxFailuresTable
        items={[]}
        isLoading={false}
        totalCount={0}
        isError={false}
        onRetry={vi.fn()}
        canManage={false}
        selection={new Map()}
        onToggleRow={vi.fn()}
        onToggleAll={vi.fn()}
        onOpen={vi.fn()}
        hasFilters={false}
        failedTab
        now={null}
        {...props}
      />,
    );

  it('says all-clear only when the summary reports 0 failed and 0 stuck', () => {
    renderEmpty({ outboxFailedCount: 0, outboxStuckCount: 0 });
    expect(screen.getByText('table.outboxEmptyTitle')).toBeInTheDocument();
    expect(screen.getByText('table.outboxEmptyDesc')).toBeInTheDocument();
  });

  it('points to the Stuck tab instead of claiming all-clear when stuck > 0', () => {
    renderEmpty({ outboxFailedCount: 0, outboxStuckCount: 3 });
    expect(screen.getByText('table.outboxEmptyStuckTitle')).toBeInTheDocument();
    expect(screen.getByText('table.outboxEmptyStuckDesc')).toBeInTheDocument();
    expect(screen.queryByText('table.outboxEmptyTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('table.outboxEmptyDesc')).not.toBeInTheDocument();
  });

  it('is neutral, never all-clear, while the summary is unknown', () => {
    renderEmpty({});
    expect(screen.getByText('table.outboxEmptyNeutralTitle')).toBeInTheDocument();
    expect(screen.queryByText('table.outboxEmptyTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('table.outboxEmptyDesc')).not.toBeInTheDocument();
  });

  it('is neutral on the Stuck tab when failed rows exist elsewhere', () => {
    renderEmpty({ outboxFailedCount: 2, outboxStuckCount: 0, stuckTab: true, failedTab: false });
    expect(screen.getByText('table.outboxEmptyNeutralTitle')).toBeInTheDocument();
    expect(screen.queryByText('table.outboxEmptyTitle')).not.toBeInTheDocument();
  });

  it('is neutral, never a filter message, on an empty Stuck tab with no filters', () => {
    renderEmpty({ outboxFailedCount: 0, outboxStuckCount: 0, stuckTab: true, failedTab: false });
    expect(screen.getByText('table.outboxEmptyNeutralTitle')).toBeInTheDocument();
    expect(screen.getByText('table.outboxEmptyNeutralDesc')).toBeInTheDocument();
    expect(screen.queryByText('table.filteredEmptyTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('table.outboxEmptyTitle')).not.toBeInTheDocument();
  });

  it('is neutral on an empty Resent or All tab with no filters (not a filter message)', () => {
    renderEmpty({ outboxFailedCount: 0, outboxStuckCount: 0, failedTab: false });
    expect(screen.getByText('table.outboxEmptyNeutralTitle')).toBeInTheDocument();
    expect(screen.queryByText('table.filteredEmptyTitle')).not.toBeInTheDocument();
  });

  it('says no rows match the filter on an empty Stuck tab with a filter applied', () => {
    renderEmpty({
      outboxFailedCount: 0,
      outboxStuckCount: 0,
      stuckTab: true,
      failedTab: false,
      hasFilters: true,
    });
    expect(screen.getByText('table.filteredEmptyTitle')).toBeInTheDocument();
    expect(screen.getByText('table.filteredEmptyDesc')).toBeInTheDocument();
    expect(screen.queryByText('table.outboxEmptyNeutralTitle')).not.toBeInTheDocument();
  });
});

describe('OutboxFailuresTable page past the end', () => {
  it('shows no empty/all-clear text while the page clamps back', () => {
    render(
      <OutboxFailuresTable
        items={[]}
        isLoading={false}
        totalCount={45}
        isError={false}
        onRetry={vi.fn()}
        canManage={false}
        selection={new Map()}
        onToggleRow={vi.fn()}
        onToggleAll={vi.fn()}
        onOpen={vi.fn()}
        hasFilters={false}
        failedTab
        now={null}
        outboxFailedCount={0}
        outboxStuckCount={0}
      />,
    );
    expect(screen.queryByText('table.outboxEmptyTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('table.outboxEmptyNeutralTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('table.filteredEmptyTitle')).not.toBeInTheDocument();
  });
});
