import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConsumerFailuresTable from './ConsumerFailuresTable';

// Echo the interpolated time — the assertion is what the stale body is given to show.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'time' in opts ? `${key}|${opts.time}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('ConsumerFailuresTable stale collector empty state', () => {
  it('shows the date as well as the time, so an outage from yesterday is not read as today', () => {
    render(
      <ConsumerFailuresTable
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
        isDefaultUnfiltered
        collectorState={{ kind: 'stale', nodes: ['APP01'], since: '2026-09-26T23:50:00' }}
      />,
    );
    expect(screen.getByText('empty.staleBody|26/09/2026 23:50')).toBeInTheDocument();
  });
});

describe('ConsumerFailuresTable unknown collector empty state', () => {
  it('says the state cannot be confirmed instead of reporting an all-clear', () => {
    render(
      <ConsumerFailuresTable
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
        isDefaultUnfiltered
        collectorState={{ kind: 'unknown' }}
      />,
    );
    expect(screen.getByText('empty.unknownTitle')).toBeInTheDocument();
    expect(screen.getByText('empty.unknownDesc')).toBeInTheDocument();
    expect(screen.queryByText('table.consumerEmptyTitle')).not.toBeInTheDocument();
  });
});

describe('ConsumerFailuresTable page past the end', () => {
  it('shows neither the all-clear nor a filtered-empty text while the page clamps back', () => {
    const { container } = render(
      <ConsumerFailuresTable
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
        isDefaultUnfiltered
        collectorState={{ kind: 'ok' }}
      />,
    );
    expect(screen.queryByText('table.consumerEmptyTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('table.consumerEmptyDesc')).not.toBeInTheDocument();
    expect(screen.queryByText('table.filteredEmptyTitle')).not.toBeInTheDocument();
    expect(container.querySelector('tbody tr')).not.toBeNull();
  });
});
