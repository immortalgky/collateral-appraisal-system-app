import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { OutboxListItem } from '../types';
import ConfirmActionDialog from './ConfirmActionDialog';
import type { ConfirmRequest, RetryableItem } from './ConfirmActionDialog';

// Echo the key plus its interpolated params, so assertions can see which key and which refs a
// warning was built from.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('@shared/components/ConfirmDialog', () => ({
  // The confirm button deliberately ignores `isLoading`/disabled, so the double-click test proves the
  // dialog's own synchronous guard rather than the real button's disabled state.
  default: ({
    title,
    children,
    onConfirm,
  }: {
    title: string;
    children: ReactNode;
    onConfirm: () => void;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
      <button type="button" onClick={onConfirm}>
        confirm-button
      </button>
    </div>
  ),
}));
const idleMutation = { mutate: vi.fn(), isPending: false };
vi.mock('../api/failedMessages', () => ({
  useRetryFailedMessages: () => idleMutation,
  useDiscardFailedMessages: () => idleMutation,
}));
vi.mock('../api/outboxMessages', () => ({ useResendOutboxMessages: () => idleMutation }));

const retryItem = (over: Partial<RetryableItem> & Pick<RetryableItem, 'id'>): RetryableItem => ({
  sourceQueue: 'appraisal-sync',
  node: 'APP-NODE-01',
  isOrderedQueue: true,
  isNonTransient: false,
  kind: 'Error',
  status: 'Pending',
  ...over,
});

const outboxItem = (
  over: Partial<OutboxListItem> & Pick<OutboxListItem, 'id'>,
): OutboxListItem => ({
  module: 'request',
  eventType: 'Some.Event',
  occurredAt: '2026-09-27T09:00:00',
  retryCount: 1,
  status: 'Failed',
  newerSentCount: null,
  typeResolvable: true,
  failureClass: null,
  ...over,
});

const renderDialog = (request: ConfirmRequest) =>
  render(<ConfirmActionDialog request={request} onClose={vi.fn()} onDone={vi.fn()} now={null} />);

const text = () => document.body.textContent ?? '';

describe('ConfirmActionDialog reference lists', () => {
  it('summarises reference-less items as a count, never "this item, this item"', () => {
    renderDialog({
      kind: 'retry',
      origin: 'bulk',
      items: [retryItem({ id: 'a' }), retryItem({ id: 'b' }), retryItem({ id: 'c' })],
    });

    expect(text()).toContain('confirm.itemsWithoutReference {"count":3}');
    expect(text()).not.toContain('drawer.thisItem');
  });

  it('lists each distinct real reference once, then counts the rest', () => {
    renderDialog({
      kind: 'retry',
      origin: 'bulk',
      items: [
        retryItem({ id: 'a', refType: 'appraisal', refNumber: 'AP-1' }),
        retryItem({ id: 'b', refType: 'appraisal', refNumber: 'AP-1' }),
        retryItem({ id: 'c' }),
        retryItem({ id: 'd' }),
      ],
    });

    const body = text();
    expect(body.match(/AP-1/g)).toHaveLength(1);
    expect(body).toContain('confirm.itemsWithoutReference {"count":2}');
  });
});

describe('ConfirmActionDialog resend newerSentCount', () => {
  it('warns that newer events may have been sent, unverifiably, when newerSentCount is null', () => {
    renderDialog({
      kind: 'resend',
      origin: 'drawer',
      items: [outboxItem({ id: 'o1', newerSentCount: null })],
    });

    expect(text()).toContain('confirm.newerSentUnknownWarning {"count":1}');
    expect(text()).not.toContain('confirm.newerSentWarning ');
  });

  it('treats an absent newerSentCount the same as null — never as 0', () => {
    renderDialog({ kind: 'resend', origin: 'drawer', items: [outboxItem({ id: 'o1' })] });

    expect(text()).toContain('confirm.newerSentUnknownWarning');
  });

  it('shows the known "newer already sent" warning for a positive count, not the unknown one', () => {
    renderDialog({
      kind: 'resend',
      origin: 'drawer',
      items: [outboxItem({ id: 'o1', newerSentCount: 2 })],
    });

    expect(text()).toContain('confirm.newerSentWarning {"count":1}');
    expect(text()).not.toContain('confirm.newerSentUnknownWarning');
  });

  it('shows neither warning when a newer event is known not to exist', () => {
    renderDialog({
      kind: 'resend',
      origin: 'drawer',
      items: [outboxItem({ id: 'o1', newerSentCount: 0 })],
    });

    expect(text()).not.toContain('confirm.newerSentWarning');
    expect(text()).not.toContain('confirm.newerSentUnknownWarning');
  });
});

describe('ConfirmActionDialog double submit', () => {
  beforeEach(() => idleMutation.mutate.mockClear());

  it('sends exactly one mutation for two rapid clicks on Confirm', async () => {
    renderDialog({ kind: 'resend', origin: 'drawer', items: [outboxItem({ id: 'o1' })] });
    const button = screen.getByText('confirm-button');

    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(idleMutation.mutate).toHaveBeenCalledTimes(1));
    await new Promise(r => setTimeout(r, 20));
    expect(idleMutation.mutate).toHaveBeenCalledTimes(1);
  });

  it('lets a failed validation be corrected and resubmitted', async () => {
    renderDialog({ kind: 'discard', origin: 'drawer', items: [retryItem({ id: 'a' })] });
    const button = screen.getByText('confirm-button');

    fireEvent.click(button);
    await screen.findByText('confirm.reasonRequired');
    expect(idleMutation.mutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'duplicate' } });
    fireEvent.click(button);

    await waitFor(() => expect(idleMutation.mutate).toHaveBeenCalledTimes(1));
  });
});

describe('ConfirmActionDialog retry snapshot', () => {
  beforeEach(() => idleMutation.mutate.mockClear());

  it('keeps the sendable set fixed when `now` ticks past a wait window while the dialog is open', async () => {
    const request: ConfirmRequest = {
      kind: 'retry',
      origin: 'bulk',
      items: [
        retryItem({ id: 'ready' }),
        retryItem({ id: 'soon', retryAvailableAt: '2026-09-27T14:35:00' }),
      ],
    };
    const props = { onClose: vi.fn(), onDone: vi.fn() };
    const { rerender } = render(
      <ConfirmActionDialog request={request} now={new Date(2026, 8, 27, 14, 30)} {...props} />,
    );
    expect(screen.getByRole('heading').textContent).toContain('"count":1');

    // 15s tick later the window has passed — the live grouping would now include `soon`.
    rerender(
      <ConfirmActionDialog request={request} now={new Date(2026, 8, 27, 14, 36)} {...props} />,
    );
    expect(screen.getByRole('heading').textContent).toContain('"count":1');

    fireEvent.click(screen.getByText('confirm-button'));
    await waitFor(() => expect(idleMutation.mutate).toHaveBeenCalledTimes(1));
    expect(idleMutation.mutate.mock.calls[0][0].ids).toEqual(['ready']);
  });
});

describe('ConfirmActionDialog nothing sendable', () => {
  it('shows a matching title and no empty breakdown table when every retry item is already waiting', () => {
    renderDialog({
      kind: 'retry',
      origin: 'bulk',
      items: [
        retryItem({ id: 'a', status: 'RetryRequested' }),
        retryItem({ id: 'b', status: 'RetryRequested' }),
      ],
    });

    expect(screen.getByRole('heading').textContent).toBe('confirm.nothingSendableTitle');
    expect(text()).toContain('confirm.nothingSendable');
    expect(document.querySelector('table')).toBeNull();
  });

  it('keeps the count title and the breakdown table when something is sendable', () => {
    renderDialog({ kind: 'retry', origin: 'bulk', items: [retryItem({ id: 'a' })] });

    expect(screen.getByRole('heading').textContent).toContain('confirm.retryTitle');
    expect(document.querySelector('table')).not.toBeNull();
  });
});
