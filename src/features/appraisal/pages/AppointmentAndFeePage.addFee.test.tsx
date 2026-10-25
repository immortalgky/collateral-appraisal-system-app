import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import { render, screen, waitFor } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import AppointmentAndFeePage from './AppointmentAndFeePage';

/**
 * Adding a fee item posts to the stored fee row's items endpoint. A fee row with no id must send
 * nothing: an empty feeId would fall through to the admin-stage create endpoint.
 */

const state = vi.hoisted(() => ({
  posts: [] as string[],
  fees: [] as unknown[],
  feesReads: 0,
  previewReads: 0,
  returned: undefined as unknown,
}));

vi.mock('../context/AppraisalContext', () => ({
  useAppraisalContext: () => ({ appraisal: { appraisalId: 'A1' } }),
}));
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: { user: null }) => unknown) => selector({ user: null }),
}));
// Only the add-item hand-off is under test; the sections are stubs.
vi.mock('../components/FeeInformationSection', async importOriginal => ({
  ...(await importOriginal<typeof import('../components/FeeInformationSection')>()),
  default: ({
    onAddFeeItem,
  }: {
    onAddFeeItem: (d: {
      feeCode: string;
      feeDescription: string;
      feeAmount: number;
    }) => Promise<unknown>;
  }) => (
    <button
      type="button"
      onClick={async () => {
        state.returned = await onAddFeeItem({
          feeCode: '02',
          feeDescription: 'x',
          feeAmount: 10,
        });
      }}
    >
      add-fee-item
    </button>
  ),
}));
vi.mock('../components/PaymentInformationSection', () => ({ default: () => null }));
vi.mock('../components/AppointmentInfoCard', () => ({ default: () => null }));
vi.mock('../components/AppointmentHistoryDrawer', () => ({ default: () => null }));
vi.mock('../components/RescheduleModal', () => ({ default: () => null }));

beforeEach(() => {
  state.posts = [];
  state.feesReads = 0;
  state.previewReads = 0;
  state.returned = undefined;
  server.use(
    http.get('*/appraisals/:id/fees', () => {
      state.feesReads += 1;
      return HttpResponse.json({ fees: state.fees });
    }),
    http.get('*/appraisals/:id/fee-preview', () => {
      state.previewReads += 1;
      return HttpResponse.json({ items: [] });
    }),
    http.get('*/appraisals/:id/appointment', () => new HttpResponse(null, { status: 404 })),
    http.post('*/appraisals/:id/fees/*', ({ request }) => {
      state.posts.push(new URL(request.url).pathname);
      return HttpResponse.json({});
    }),
  );
});

describe('AppointmentAndFeePage: add fee item', () => {
  it('makes no request when the fee row has no id, says so, and tells the modal it was not saved', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
    state.fees = [{ assignmentId: 'as-1', items: [] }];
    const { user } = render(<AppointmentAndFeePage />);

    await screen.findByText('add-fee-item');
    // The fee row must be loaded, or the click would be a no-op for the wrong reason.
    await waitFor(() => expect(state.feesReads).toBe(1));
    await new Promise(r => setTimeout(r, 100));
    await user.click(screen.getByText('add-fee-item'));
    // Let any (wrong) request go out before asserting there was none.
    await new Promise(r => setTimeout(r, 100));

    expect(state.posts).toEqual([]);
    expect(toastError).toHaveBeenCalledWith('fee.toasts.feeAddFailed');
    // false is what keeps the modal open and silences the "added" toast.
    expect(state.returned).toBe(false);
  });

  it('posts to that fee row when it has an id', async () => {
    state.fees = [{ id: 'f-1', assignmentId: 'as-1', items: [] }];
    const { user } = render(<AppointmentAndFeePage />);
    await screen.findByText('add-fee-item');
    await waitFor(() => expect(state.feesReads).toBe(1));
    await new Promise(r => setTimeout(r, 100));

    await user.click(screen.getByText('add-fee-item'));

    await waitFor(() => expect(state.posts).toHaveLength(1));
    expect(state.posts[0]).toMatch(/\/appraisals\/A1\/fees\/f-1\/items$/);
    expect(state.returned).not.toBe(false);
  });

  it('never requests a fee preview (the page shows the stored fee only)', async () => {
    state.fees = [{ id: 'f-1', assignmentId: 'as-1', items: [] }];
    render(<AppointmentAndFeePage />);
    await screen.findByText('add-fee-item');
    await waitFor(() => expect(state.feesReads).toBe(1));
    // Let any (wrong) request go out before asserting there was none.
    await new Promise(r => setTimeout(r, 200));

    expect(state.previewReads).toBe(0);
  });
});
