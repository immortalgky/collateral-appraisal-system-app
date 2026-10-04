import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FailedMessageListItem, TopGroup } from '../types';
import ConsumerFailuresTable from './ConsumerFailuresTable';
import TopGroupChips from './TopGroupChips';

// Echo the key back — the assertion is which key a skipped row reaches for, not its translation.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

// What the collector really stores for a `_skipped` queue row (FaultMessageParser.SkippedExceptionType).
const skippedRow: FailedMessageListItem = {
  id: 'row-1',
  node: 'APP-NODE-01',
  sourceQueue: 'appraisal-sync',
  kind: 'Skipped',
  status: 'Pending',
  exceptionType: 'Skipped',
  exceptionMessage: 'No consumer',
  retryCount: 0,
  faultedAt: '2026-09-27T09:00:00',
  collectedAt: '2026-09-27T09:00:12',
  isOrderedQueue: false,
  isNonTransient: false,
  siblingCount: 0,
};

const errorRow: FailedMessageListItem = {
  ...skippedRow,
  id: 'row-2',
  kind: 'Error',
  exceptionType: 'System.TimeoutException',
  exceptionMessage: 'The operation has timed out.',
};

const renderTable = (items: FailedMessageListItem[]) =>
  render(
    <ConsumerFailuresTable
      items={items}
      isLoading={false}
      totalCount={items.length}
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

describe('ConsumerFailuresTable exception column', () => {
  it('shows the translated "no consumer" label, not the raw stored "Skipped", for a skipped row', () => {
    renderTable([skippedRow]);

    expect(screen.getByText('table.noConsumer')).toBeInTheDocument();
    expect(screen.queryByText('Skipped')).not.toBeInTheDocument();
  });

  it('still shows the short exception type for an error row', () => {
    renderTable([errorRow]);

    expect(screen.getByText('TimeoutException')).toBeInTheDocument();
    expect(screen.queryByText('table.noConsumer')).not.toBeInTheDocument();
  });
});

describe('TopGroupChips', () => {
  const renderChips = (topGroups: TopGroup[]) =>
    render(<TopGroupChips topGroups={topGroups} activeStatus="Pending" onToggle={vi.fn()} />);

  it('shows the translated "no consumer" label for the Skipped group', () => {
    renderChips([{ queue: 'appraisal-sync', exceptionType: 'Skipped', count: 4 }]);

    expect(screen.getByText('table.noConsumer')).toBeInTheDocument();
    expect(screen.queryByText('Skipped')).not.toBeInTheDocument();
  });

  it('keeps the short type name for a real exception group', () => {
    renderChips([{ queue: 'appraisal-sync', exceptionType: 'System.TimeoutException', count: 6 }]);

    expect(screen.getByText('TimeoutException')).toBeInTheDocument();
  });
});
