import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { httpError } from '../api/queryTestUtils';
import type { FailedMessageDetail } from '../types';
import FailedMessageDrawer from './FailedMessageDrawer';
import en from '../../../i18n/locales/en/failedMessages.json';
import th from '../../../i18n/locales/th/failedMessages.json';
import zh from '../../../i18n/locales/zh/failedMessages.json';

const state = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Echo the key, plus the interpolated time when there is one — the time text is under test.
    t: (key: string, opts?: Record<string, unknown> | string) =>
      typeof opts === 'object' && 'time' in opts
        ? `${key}|${opts.time}`
        : typeof opts === 'object' && 'reason' in opts
          ? `${key}|${opts.reason}`
          : key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@shared/components/SlideOverPanel', () => ({
  default: ({ children, footer }: { children: ReactNode; footer?: ReactNode }) => (
    <div>
      {children}
      {footer}
    </div>
  ),
}));
vi.mock('../api/failedMessages', () => ({
  useGetFailedMessage: () => state.query,
}));

const detail: FailedMessageDetail = {
  id: 'row-1',
  node: 'APP-NODE-01',
  sourceQueue: 'appraisal-sync',
  kind: 'Error',
  status: 'Pending',
  exceptionType: 'System.TimeoutException',
  retryCount: 0,
  faultedAt: '2026-09-27T09:00:00',
  collectedAt: '2026-09-27T09:00:12',
  isOrderedQueue: false,
  isNonTransient: false,
  body: '{"customerName":"John Doe"}',
  stackTrace: 'System.TimeoutException: at Foo.Bar()',
  headers: { 'MT-Fault-Message': 'The operation has timed out.' },
  siblings: [],
  history: [],
};

const renderDrawer = (now: Date = new Date('2026-09-27T09:10:00')) =>
  render(
    <FailedMessageDrawer
      id="row-1"
      onClose={vi.fn()}
      canManage
      onRequestRetry={vi.fn()}
      onRequestDiscard={vi.fn()}
      onOpenSibling={vi.fn()}
      now={now}
    />,
  );

const loaded = (error: unknown) => ({
  data: detail,
  isLoading: false,
  isError: !!error,
  error,
  refetch: vi.fn(),
});

describe('FailedMessageDrawer after the detail poll fails', () => {
  beforeEach(() => {
    state.query = loaded(null);
  });

  it('keeps Retry and Discard enabled while the row is healthy', () => {
    renderDrawer();

    expect(screen.getByText('drawer.retry')).toBeEnabled();
    expect(screen.getByText('drawer.discard')).toBeEnabled();
  });

  it.each([404, 403])('disables Retry and Discard and says so after a %i', status => {
    state.query = loaded(httpError(status));
    renderDrawer();

    expect(screen.getByText('drawer.retry')).toBeDisabled();
    expect(screen.getByText('drawer.discard')).toBeDisabled();
    expect(screen.getByText('drawer.goneOrForbidden')).toBeInTheDocument();
  });

  it('keeps the actions enabled through a transient 502 (the last good data may still be live)', () => {
    state.query = loaded(httpError(502));
    renderDrawer();

    expect(screen.getByText('drawer.retry')).toBeEnabled();
    expect(screen.getByText('drawer.discard')).toBeEnabled();
    expect(screen.getByText('drawer.refreshFailed')).toBeInTheDocument();
  });
});

describe('FailedMessageDrawer detail rendering', () => {
  it('renders the raw body, stack trace and full headers straight from the detail', () => {
    state.query = loaded(null);
    renderDrawer();

    expect(screen.getByText('{"customerName":"John Doe"}')).toBeInTheDocument();
    expect(screen.getByText('System.TimeoutException: at Foo.Bar()')).toBeInTheDocument();
    expect(screen.getByText('MT-Fault-Message')).toBeInTheDocument();
  });

  it('renders a non-JSON body as plain text, unparsed and unformatted', () => {
    const raw = 'plain text, not json {oops\n  second line';
    state.query = loaded(null);
    state.query = { ...(state.query as object), data: { ...detail, body: raw } };
    renderDrawer();

    const pre = screen.getByText((_, el) => el?.tagName === 'PRE' && el.textContent === raw);
    expect(pre).toBeInTheDocument();
  });
});

describe('FailedMessageDrawer first fetch fails with no cached data', () => {
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

describe('FailedMessageDrawer ordered-queue callout time', () => {
  const ordered = { ...detail, isOrderedQueue: true };

  it('shows only the clock time for a fault from today', () => {
    state.query = { ...loaded(null), data: ordered };
    renderDrawer(new Date('2026-09-27T15:00:00'));

    expect(screen.getByText('drawer.orderedCalloutBody|09:00')).toBeInTheDocument();
  });

  it('includes the date for a fault from an earlier day', () => {
    state.query = { ...loaded(null), data: ordered };
    renderDrawer(new Date('2026-09-30T15:00:00'));

    const text = screen.getByText(/^drawer\.orderedCalloutBody\|/).textContent ?? '';
    expect(text).not.toBe('drawer.orderedCalloutBody|09:00');
    expect(text).toMatch(/2026|2569/);
  });
});

describe('FailedMessageDrawer RetryFailed history entry', () => {
  it('shows a generic headline and the server reason as the detail', () => {
    state.query = {
      ...loaded(null),
      data: {
        ...detail,
        history: [
          { action: 'RetryFailed', at: '2026-09-27T09:05:00', reason: 'Broker nacked the publish' },
        ],
      },
    };
    renderDrawer();
    expect(screen.getByText('history.retryFailed', { exact: false }).textContent).toContain(
      'drawer.timelineReason|Broker nacked the publish',
    );
  });

  it.each([
    ['en', en, /queue|broker/i],
    ['th', th, /คิว|broker/i],
    ['zh', zh, /队列|broker/i],
  ])('does not blame a missing queue in the %s headline', (_lng, bundle, cause) => {
    expect(bundle.history.retryFailed).not.toMatch(cause);
  });
});
