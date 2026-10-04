import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { httpError } from '../api/queryTestUtils';
import type { OutboxDetail } from '../types';
import OutboxMessageDrawer from './OutboxMessageDrawer';

const state = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('@shared/components/SlideOverPanel', () => ({
  default: ({ children, footer }: { children: ReactNode; footer?: ReactNode }) => (
    <div>
      {children}
      {footer}
    </div>
  ),
}));
vi.mock('../api/outboxMessages', () => ({
  useGetOutboxMessage: () => state.query,
}));

const detail: OutboxDetail = {
  module: 'request',
  id: 'o-1',
  eventType: 'Some.Namespace.SomeEvent',
  occurredAt: '2026-09-27T09:00:00',
  retryCount: 3,
  status: 'Failed',
  error: 'boom',
  newerSentCount: 0,
  typeResolvable: true,
  failureClass: null,
  payload: '{"customerName":"John Doe"}',
};

const renderDrawer = (props: { now?: Date | null; stuckTab?: boolean } = {}) =>
  render(
    <OutboxMessageDrawer
      target={{ module: 'request', id: 'o-1' }}
      onClose={vi.fn()}
      canManage
      onRequestResend={vi.fn()}
      now={props.now ?? null}
      stuckTab={props.stuckTab}
    />,
  );

const loaded = (data: OutboxDetail, error: unknown = null) => ({
  data,
  isLoading: false,
  isError: !!error,
  error,
  refetch: vi.fn(),
});

describe('OutboxMessageDrawer after the detail poll fails', () => {
  beforeEach(() => {
    state.query = loaded(detail);
  });

  it('keeps Resend enabled while the row is healthy', () => {
    renderDrawer();

    expect(screen.getByText('outboxDrawer.resend')).toBeEnabled();
  });

  it.each([404, 403])('disables Resend and says so after a %i', status => {
    state.query = loaded(detail, httpError(status));
    renderDrawer();

    expect(screen.getByText('outboxDrawer.resend')).toBeDisabled();
    expect(screen.getByText('drawer.goneOrForbidden')).toBeInTheDocument();
  });

  it('keeps Resend enabled through a transient 502', () => {
    state.query = loaded(detail, httpError(502));
    renderDrawer();

    expect(screen.getByText('outboxDrawer.resend')).toBeEnabled();
  });
});

describe('OutboxMessageDrawer first fetch fails with no cached data', () => {
  const failedFirst = (error: unknown) => ({
    data: undefined,
    isLoading: false,
    isError: true,
    error,
    refetch: vi.fn(),
  });

  it.each([404, 403])('says the item is gone, without a Retry button, after a %i', status => {
    state.query = failedFirst(httpError(status));
    renderDrawer();

    expect(screen.getByText('drawer.goneOrForbidden')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('still offers Retry for a transient failure', () => {
    state.query = failedFirst(httpError(502));
    renderDrawer();

    expect(screen.queryByText('drawer.goneOrForbidden')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('OutboxMessageDrawer newerSentCount callouts', () => {
  it('warns that newer events may have been sent and can not be checked when it is null', () => {
    state.query = loaded({ ...detail, newerSentCount: null });
    renderDrawer();

    expect(screen.getByText('outboxDrawer.newerSentUnknownCalloutTitle')).toBeInTheDocument();
    expect(screen.queryByText('outboxDrawer.noConsumerCalloutTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('outboxDrawer.newerSentCalloutTitle')).not.toBeInTheDocument();
  });

  it('treats an absent newerSentCount the same as null', () => {
    const { newerSentCount: _omit, ...withoutCount } = detail;
    void _omit;
    // The type says required; a stale cached/older response can still lack it at runtime.
    state.query = loaded(withoutCount as typeof detail);
    renderDrawer();

    expect(screen.getByText('outboxDrawer.newerSentUnknownCalloutTitle')).toBeInTheDocument();
    expect(screen.queryByText('outboxDrawer.noConsumerCalloutTitle')).not.toBeInTheDocument();
  });

  it('shows the "no consumer" resend callout only when the count is a known 0', () => {
    state.query = loaded({ ...detail, newerSentCount: 0 });
    renderDrawer();

    expect(screen.getByText('outboxDrawer.noConsumerCalloutTitle')).toBeInTheDocument();
    expect(screen.queryByText('outboxDrawer.newerSentUnknownCalloutTitle')).not.toBeInTheDocument();
  });

  it('shows the known newer-sent callout, not the unknown one, for a positive count', () => {
    state.query = loaded({ ...detail, newerSentCount: 2 });
    renderDrawer();

    expect(screen.getByText('outboxDrawer.newerSentCalloutTitle')).toBeInTheDocument();
    expect(screen.queryByText('outboxDrawer.newerSentUnknownCalloutTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('outboxDrawer.noConsumerCalloutTitle')).not.toBeInTheDocument();
  });
});

describe('OutboxMessageDrawer on the Stuck tab', () => {
  const processing: OutboxDetail = {
    ...detail,
    status: 'Processing',
    error: undefined,
    processingStartedAt: '2026-09-27T09:00:00',
  };

  it('shows Stuck and the callout without a duration while the clock is unknown', () => {
    state.query = loaded(processing);
    renderDrawer({ stuckTab: true });

    expect(screen.getAllByText('outboxStatus.Stuck')).toHaveLength(2); // pill + callout title
    expect(screen.queryByText('outboxStatus.Processing')).not.toBeInTheDocument();
    expect(screen.getByText('outboxDrawer.stuckCalloutBody')).toBeInTheDocument();
    expect(screen.queryByText('outboxDrawer.stuckCalloutTitle')).not.toBeInTheDocument();
  });

  it('shows the duration title once the clock is known', () => {
    state.query = loaded(processing);
    renderDrawer({ stuckTab: true, now: new Date('2026-09-27T10:30:00') });

    expect(screen.getByText('outboxDrawer.stuckCalloutTitle')).toBeInTheDocument();
  });

  it('does not call a row claimed again just now stuck once the clock is known', () => {
    state.query = loaded(processing);
    renderDrawer({ stuckTab: true, now: new Date('2026-09-27T09:00:00') });

    expect(screen.getByText('outboxStatus.Processing')).toBeInTheDocument();
    expect(screen.queryByText('outboxStatus.Stuck')).not.toBeInTheDocument();
    expect(screen.queryByText('outboxDrawer.stuckCalloutBody')).not.toBeInTheDocument();
    expect(screen.queryByText('outboxDrawer.stuckCalloutTitle')).not.toBeInTheDocument();
  });

  it('keeps a Processing row Processing off the Stuck tab', () => {
    state.query = loaded(processing);
    renderDrawer();

    expect(screen.getByText('outboxStatus.Processing')).toBeInTheDocument();
    expect(screen.queryByText('outboxDrawer.stuckCalloutBody')).not.toBeInTheDocument();
  });
});

describe('OutboxMessageDrawer payload rendering', () => {
  it('renders the raw payload and error straight from the detail', () => {
    state.query = loaded(detail);
    renderDrawer();

    expect(screen.getByText('{"customerName":"John Doe"}')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders a non-JSON payload as plain text, unparsed and unformatted', () => {
    const raw = 'not json {oops\n  second line';
    state.query = loaded({ ...detail, payload: raw });
    renderDrawer();

    expect(
      screen.getByText((_, el) => el?.tagName === 'PRE' && el.textContent === raw),
    ).toBeInTheDocument();
  });
});
