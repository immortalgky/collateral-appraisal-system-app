import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { NodeHealth } from '../types';
import QueueHealthPanel from './QueueHealthPanel';

// Echo the key plus the interpolated time — the time text is what is under test.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'time' in opts ? `${key}|${opts.time}` : key,
    i18n: { language: 'en' },
  }),
}));

const node: NodeHealth = {
  node: 'APP-NODE-01',
  collectedAt: '2026-09-27T14:03:22',
  managementStatus: 'Ok',
  queues: [],
};

const renderPanel = (now: Date | null) =>
  render(
    <QueueHealthPanel
      nodes={[node]}
      isLoading={false}
      isError={false}
      onRetry={vi.fn()}
      now={now}
      onQueueSelect={vi.fn()}
    />,
  );

describe('QueueHealthPanel "as of" badge', () => {
  it('shows only the clock time for a snapshot from today', () => {
    renderPanel(new Date('2026-09-27T14:04:00'));

    expect(screen.getByText('queueHealth.dataAsOf|14:03:22')).toBeInTheDocument();
  });

  it('includes the date for a snapshot from an earlier day', () => {
    renderPanel(new Date('2026-09-28T09:00:00'));

    const text = screen.getByText(/^queueHealth\.dataAsOf\|/).textContent ?? '';
    expect(text).toContain('27/09/2026');
    expect(text).toContain('14:03');
  });

  it('includes the date while the server clock is unknown', () => {
    renderPanel(null);

    expect(screen.getByText(/^queueHealth\.dataAsOf\|27\/09\/2026/)).toBeInTheDocument();
  });
});
