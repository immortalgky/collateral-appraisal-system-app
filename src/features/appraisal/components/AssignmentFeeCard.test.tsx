import { describe, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import { http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { createTestQueryClient, render, screen, waitFor } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import type { FeeBaseSource, FeePreview, FeePreviewItem } from '../types/feePreview';
import AssignmentFeeCard from './AssignmentFeeCard';

/**
 * The admin-side fee estimate. The test i18n returns keys, so texts are asserted by key.
 */

const source = (over: Partial<FeeBaseSource> = {}): FeeBaseSource => ({
  kind: 'None',
  appraisalNumber: null,
  quotationNumber: null,
  winnerCompanyName: null,
  sellingPrice: null,
  tierMin: null,
  tierMax: null,
  ...over,
});

const item = (over: Partial<FeePreviewItem> = {}): FeePreviewItem => ({
  id: null,
  feeCode: '01',
  description: 'Appraisal fee',
  amount: 3000,
  source: 'System',
  ...over,
});

const preview = (over: Partial<FeePreview> = {}): FeePreview => ({
  feeId: null,
  systemBaseAmount: 3000,
  baseSource: source({ kind: 'ConstructionInspectionFee', appraisalNumber: '69105522' }),
  adminOverrideAmount: null,
  items: [item()],
  subtotal: 3000,
  vatRate: 7,
  vat: 210,
  total: 3210,
  ...over,
});

const serve = (p: FeePreview, fees: unknown[] = []) =>
  server.use(
    http.get('*/appraisals/:id/fee-preview', () => HttpResponse.json(p)),
    http.get('*/appraisals/:id/fees', () => HttpResponse.json({ fees })),
  );

const renderCard = (editable = true) =>
  render(<AssignmentFeeCard appraisalId="A1" params={{}} editable={editable} />);

// Resolves once the estimate is on screen: the base row's edit button. (The totals are not on this
// card any more; the assignment slip shows them.)
const loaded = () => screen.findByLabelText('feePreview.aria.editBase');

const adminPreview = () =>
  preview({
    items: [
      item({ id: 'i-base', amount: 3500, source: 'Admin' }),
      item({ id: 'i-x', feeCode: '99', description: 'Travel', amount: 500, source: 'Admin' }),
      item({ id: 'i-u', feeCode: '99', description: 'By user', amount: 100, source: 'User' }),
    ],
    adminOverrideAmount: 3500,
  });

describe('AssignmentFeeCard', () => {
  it('shows the base and where it came from, but no totals', async () => {
    serve(preview());
    renderCard();

    await loaded();
    expect(screen.getByText('feePreview.source.ConstructionInspectionFee')).toBeInTheDocument();
    expect(screen.queryByText('fee.subtotal')).not.toBeInTheDocument();
    expect(screen.queryByText('fee.total')).not.toBeInTheDocument();
  });

  it('is a table with headers, the base row named by its type and the amount right-aligned', async () => {
    serve(preview());
    renderCard();

    await loaded();
    for (const key of ['item', 'source', 'amount']) {
      expect(screen.getByRole('columnheader', { name: `feePreview.columns.${key}` })).toBeVisible();
    }
    const row = screen.getByText('feePreview.type.01').closest('tr')!;
    // The row says what the fee is by type, not by the stored description.
    expect(screen.queryByText('Appraisal fee')).not.toBeInTheDocument();
    expect(screen.getByText('3,000.00').closest('td')).toHaveClass('text-right', 'tabular-nums');
    expect(row).toContainElement(screen.getByText('3,000.00'));
    expect(screen.getByRole('columnheader', { name: 'feePreview.columns.amount' })).toHaveClass(
      'text-right',
    );
  });

  it.each(['Quotation', 'Tier', 'None'] as const)('names the %s source', async kind => {
    // "None" means no base exists to show (a base would end the note), so it has no item.
    serve(preview({ baseSource: source({ kind }), items: kind === 'None' ? [] : [item()] }));
    renderCard();

    expect(await screen.findByText(`feePreview.source.${kind}`)).toBeInTheDocument();
  });

  it('uses the generic no-source wording, not the construction-inspection one, when no prior is named', async () => {
    serve(preview({ baseSource: source({ kind: 'None' }), items: [], systemBaseAmount: null }));
    renderCard();

    expect(await screen.findByText('feePreview.source.None')).toBeInTheDocument();
    expect(screen.queryByText('feePreview.source.NoneFromPrior')).not.toBeInTheDocument();
  });

  it('explains a prior with no keyed inspection fee, with a dash for the base and no 0.00', async () => {
    serve(
      preview({
        systemBaseAmount: null,
        baseSource: source({ kind: 'None', appraisalNumber: '69105522' }),
        items: [],
        subtotal: 0,
        vat: 0,
        total: 0,
      }),
    );
    renderCard();

    expect(await screen.findByText('feePreview.source.NoneFromPrior')).toHaveClass(
      'bg-(--palette-warn-wash)',
    );
    expect(screen.queryByText('feePreview.source.None')).not.toBeInTheDocument();
    const row = screen.getByText('feePreview.type.01').closest('tr')!;
    expect(row).toHaveTextContent('—');
    expect(row).not.toHaveTextContent('0.00');
  });

  it('hides the prior-with-no-fee note once an admin has set the base', async () => {
    serve(
      preview({
        systemBaseAmount: null,
        baseSource: source({ kind: 'None', appraisalNumber: '69105522' }),
        items: [item({ id: 'i-base', feeCode: '01', amount: 3500, source: 'Admin' })],
        adminOverrideAmount: 3500,
      }),
    );
    renderCard();

    await loaded();
    expect(screen.queryByText('feePreview.source.NoneFromPrior')).not.toBeInTheDocument();
    expect(screen.queryByText('feePreview.source.None')).not.toBeInTheDocument();
    expect(screen.getByText('3,500.00')).toBeInTheDocument();
    expect(screen.getByLabelText('feePreview.aria.resetBase')).toBeInTheDocument();
  });

  it.each(['Tier', 'ConstructionInspectionFee'] as const)(
    'offers "Set amount" when a %s source gave no 01 line, so the base can still be satisfied',
    async kind => {
      serve(preview({ baseSource: source({ kind }), systemBaseAmount: null, items: [] }));
      renderCard();

      expect(await screen.findByLabelText('feePreview.aria.setBase')).toBeEnabled();
      expect(screen.queryByLabelText('feePreview.aria.editBase')).not.toBeInTheDocument();
    },
  );

  it('waits for a quotation winner instead of showing an amount, with the controls still there', async () => {
    serve(preview({ baseSource: source({ kind: 'QuotationPending' }), items: [], total: 0 }));
    renderCard();

    expect(await screen.findByText('feePreview.pending.title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ fee.addFee' })).toBeEnabled();
    expect(screen.getByLabelText('feePreview.aria.setBase')).toBeEnabled();
  });

  it('has nothing to estimate until a type is selected, and asks the server nothing', async () => {
    const requests: string[] = [];
    server.use(
      http.get('*/appraisals/:id/fee-preview', ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json(preview());
      }),
    );
    render(<AssignmentFeeCard appraisalId="A1" params={null} editable />);

    expect(screen.getByText('feePreview.selectTypeFirst')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    // No params would mean "the stored assignment", which is not what an empty form is about.
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(requests).toEqual([]);
  });

  it('says there is no data, not "select a type", when it is read-only with nothing to estimate', () => {
    render(<AssignmentFeeCard appraisalId="A1" params={null} editable={false} />);

    expect(screen.getByText('administration.noData')).toBeInTheDocument();
    expect(screen.queryByText('feePreview.selectTypeFirst')).not.toBeInTheDocument();
  });

  it('marks what the admin set, with its edit and delete actions', async () => {
    serve(adminPreview());
    renderCard();

    await screen.findByText('Travel', { exact: false });
    // The base row and the extra row each carry the chip; the user's own item does not.
    expect(screen.getAllByText('fee.adminChip')).toHaveLength(2);
    expect(screen.getByText('fee.systemAmount')).toBeInTheDocument();
    expect(screen.getByLabelText('feePreview.aria.resetBase')).toBeInTheDocument();
    expect(screen.getByLabelText('feePreview.aria.editItem')).toBeInTheDocument();
    expect(screen.getByLabelText('feePreview.aria.deleteItem')).toBeInTheDocument();
    expect(screen.getAllByLabelText('feePreview.aria.editItem')).toHaveLength(1);
  });

  it('is read-only when the page is', async () => {
    serve(adminPreview());
    renderCard(false);

    await screen.findByText('Travel', { exact: false });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers to set a base when nothing gives one, and adds through the no-fee-row route', async () => {
    serve(preview({ baseSource: source({ kind: 'None' }), items: [], total: 0 }), []);
    let posted: { body: unknown } | null = null;
    server.use(
      http.post('*/appraisals/A1/fees/items', async ({ request }) => {
        posted = { body: await request.json() };
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByLabelText('feePreview.aria.setBase'));
    await user.type(screen.getByLabelText(/fee\.addFeeModal\.amountLabel/), '100');
    await user.click(screen.getByRole('button', { name: 'common:actions.add', hidden: true }));

    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toMatchObject({ body: { feeCode: '01', feeAmount: 100 } });
  });

  const serveStoredBase = (baseSource: FeePreviewItem['source']) => {
    serve(
      preview({
        feeId: 'fee-1',
        items: [item({ id: 'i-base', amount: 3200, source: baseSource })],
      }),
    );
    const calls: string[] = [];
    server.use(
      http.put('*/appraisals/A1/fees/:feeId/items/:itemId', ({ request, params }) => {
        calls.push(`${request.method} ${params.feeId}/${params.itemId}`);
        return new HttpResponse(null, { status: 204 });
      }),
      http.post('*/appraisals/A1/fees/*', () => {
        calls.push('POST');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    return calls;
  };

  it('editing a stored User base updates that item on the fee row, it does not add another', async () => {
    const calls = serveStoredBase('User');
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByLabelText('feePreview.aria.editBase'));
    await user.click(screen.getByRole('button', { name: 'common:actions.save', hidden: true }));

    await waitFor(() => expect(calls).toEqual(['PUT fee-1/i-base']));
  });

  it('saving a stored System base unchanged writes nothing, so it is not flipped to Admin', async () => {
    const calls = serveStoredBase('System');
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByLabelText('feePreview.aria.editBase'));
    const save = () => screen.queryByRole('button', { name: 'common:actions.save', hidden: true });
    await user.click(save()!);

    await waitFor(() => expect(save()).toBeNull());
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(calls).toEqual([]);
  });

  it('changing a stored System base updates that item', async () => {
    const calls = serveStoredBase('System');
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByLabelText('feePreview.aria.editBase'));
    const amount = screen.getByLabelText(/fee\.addFeeModal\.amountLabel/);
    // (user.clear leaves "0.00" in this input and typing after it adds nothing: it would stay unchanged.)
    fireEvent.change(amount, { target: { value: '3300' } });
    await user.click(screen.getByRole('button', { name: 'common:actions.save', hidden: true }));

    await waitFor(() => expect(calls).toEqual(['PUT fee-1/i-base']));
  });

  it('confirming the system base unchanged writes nothing (no permanent override) and closes', async () => {
    serve(preview());
    const calls: string[] = [];
    server.use(
      http.post('*/appraisals/A1/fees/*', () => {
        calls.push('POST');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByLabelText('feePreview.aria.editBase'));
    const add = () => screen.queryByRole('button', { name: 'common:actions.add', hidden: true });
    await user.click(add()!);

    await waitFor(() => expect(add()).toBeNull());
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(calls).toEqual([]);
  });

  it('changing the system base does create the admin item', async () => {
    serve(preview());
    const calls: string[] = [];
    server.use(
      http.post('*/appraisals/A1/fees/items', () => {
        calls.push('POST');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByLabelText('feePreview.aria.editBase'));
    const amount = screen.getByLabelText(/fee\.addFeeModal\.amountLabel/);
    // (user.clear leaves "0.00" in this input and typing after it adds nothing.)
    fireEvent.change(amount, { target: { value: '3100' } });
    await user.click(screen.getByRole('button', { name: 'common:actions.add', hidden: true }));

    await waitFor(() => expect(calls).toEqual(['POST']));
  });

  it('saving the add-fee modal does not submit the form the card sits in', async () => {
    serve(preview({ baseSource: source({ kind: 'None' }), items: [], total: 0 }), []);
    server.use(
      http.post('*/appraisals/A1/fees/items', () => new HttpResponse(null, { status: 204 })),
    );
    const pageSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={pageSubmit}>
        <AssignmentFeeCard appraisalId="A1" params={{}} editable />
      </form>,
    );

    await user.click(await screen.findByLabelText('feePreview.aria.setBase'));
    await user.type(screen.getByLabelText(/fee\.addFeeModal\.amountLabel/), '100');
    await user.click(screen.getByRole('button', { name: 'common:actions.add', hidden: true }));

    // The modal closes after a successful save; give a stray submit time to land first.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'common:actions.add', hidden: true })).toBeNull(),
    );
    expect(pageSubmit).not.toHaveBeenCalled();
  });

  it('resets an admin base by deleting that item on the real fee row', async () => {
    serve({ ...adminPreview(), feeId: 'fee-1' });
    let deleted: string | null = null;
    server.use(
      http.delete('*/appraisals/A1/fees/:feeId/items/:itemId', ({ params }) => {
        deleted = `${params.feeId}/${params.itemId}`;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByLabelText('feePreview.aria.resetBase'));
    await user.click(screen.getByText('feePreview.resetDialog.confirm'));

    await waitFor(() => expect(deleted).toBe('fee-1/i-base'));
  });

  it('shows no made-up system figure when an admin base has no system amount', async () => {
    const p = adminPreview();
    serve({ ...p, systemBaseAmount: null }, [{ id: 'fee-1', items: [] }]);
    const user = userEvent.setup();
    renderCard();

    await screen.findByText('Travel', { exact: false });
    expect(screen.queryByText('fee.systemAmount')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('feePreview.aria.resetBase'));
    expect(screen.getByText('feePreview.resetDialog.messageNoSystem')).toBeInTheDocument();
    expect(screen.queryByText('feePreview.resetDialog.message')).not.toBeInTheDocument();
  });
  it('shows a fee code it does not know as it is, not as "other"', async () => {
    serve(
      preview({
        items: [item(), item({ id: 'i-z', feeCode: '07', description: 'Odd', source: 'Admin' })],
      }),
    );
    renderCard();
    await loaded();

    expect(screen.getByText('(07)')).toBeInTheDocument();
    expect(screen.queryByText('(feePreview.type.99)')).not.toBeInTheDocument();
  });

  it("disables every fee action while the previous selection's figures are still on screen", async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => (release = resolve));
    server.use(
      http.get('*/appraisals/:id/fee-preview', async ({ request }) => {
        // The first selection answers at once; the second only when released.
        if (new URL(request.url).searchParams.get('assignmentType') === 'internal') await gate;
        return HttpResponse.json({ ...adminPreview(), feeId: 'fee-1' });
      }),
    );
    const { rerender } = render(
      <AssignmentFeeCard appraisalId="A1" params={{ assignmentType: 'external' }} editable />,
    );
    const actions = () => [
      screen.getByLabelText('feePreview.aria.editBase'),
      screen.getByLabelText('feePreview.aria.resetBase'),
      screen.getByLabelText('feePreview.aria.editItem'),
      screen.getByLabelText('feePreview.aria.deleteItem'),
      screen.getByRole('button', { name: '+ fee.addFee' }),
    ];
    await loaded();
    await waitFor(() => expect(actions()[0]).toBeEnabled());
    for (const button of actions()) expect(button).toBeEnabled();

    rerender(
      <AssignmentFeeCard appraisalId="A1" params={{ assignmentType: 'internal' }} editable />,
    );

    // The old rows are still drawn (placeholder), but nothing may be edited against them.
    await waitFor(() => expect(actions()[0]).toBeDisabled());
    for (const button of actions()) expect(button).toBeDisabled();

    release();
    await waitFor(() => expect(actions()[0]).toBeEnabled());
    for (const button of actions()) expect(button).toBeEnabled();
  });

  it('disables every fee action while the refetch after the first write is pending: the fee row has no id yet', async () => {
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>(resolve => (release = resolve));
    server.use(
      http.get('*/appraisals/:id/fee-preview', async () => {
        // The first read answers at once; every later one only when released. Both say the fee
        // row does not exist (feeId null), as the preview does until the refetch lands.
        if (++calls > 1) await gate;
        return HttpResponse.json(preview({ baseSource: source({ kind: 'None' }), items: [] }));
      }),
      http.post('*/appraisals/A1/fees/items', () => new HttpResponse(null, { status: 204 })),
    );
    const toastSuccess = vi.spyOn(toast, 'success').mockImplementation(() => '');
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByLabelText('feePreview.aria.setBase'));
    await user.type(screen.getByLabelText(/fee\.addFeeModal\.amountLabel/), '100');
    await user.click(screen.getByRole('button', { name: 'common:actions.add', hidden: true }));
    // The write is done (nothing in flight) and its refetch of the same query is still pending.
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    await waitFor(() => expect(calls).toBeGreaterThan(1));
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(screen.getByLabelText('feePreview.aria.setBase')).toBeDisabled();
    expect(screen.getByRole('button', { name: '+ fee.addFee' })).toBeDisabled();

    release();
    await waitFor(() => expect(screen.getByLabelText('feePreview.aria.setBase')).toBeEnabled());
  });

  it('keeps the actions usable during a background refetch once the fee row has an id', async () => {
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>(resolve => (release = resolve));
    server.use(
      http.get('*/appraisals/:id/fee-preview', async () => {
        if (++calls > 1) await gate;
        return HttpResponse.json({ ...adminPreview(), feeId: 'fee-1' });
      }),
    );
    const queryClient = createTestQueryClient();
    render(<AssignmentFeeCard appraisalId="A1" params={{}} editable />, { queryClient });
    await loaded();
    await waitFor(() => expect(screen.getByLabelText('feePreview.aria.editBase')).toBeEnabled());

    void queryClient.invalidateQueries();
    await waitFor(() => expect(calls).toBeGreaterThan(1));

    expect(screen.getByLabelText('feePreview.aria.editBase')).toBeEnabled();
    expect(screen.getByRole('button', { name: '+ fee.addFee' })).toBeEnabled();
    release();
  });

  describe('writes', () => {
    const save = () => screen.queryByRole('button', { name: 'common:actions.add', hidden: true });

    it('keeps the add modal open, with its input, when the save fails', async () => {
      const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
      serve(preview({ baseSource: source({ kind: 'None' }), items: [], total: 0 }), []);
      let attempts = 0;
      server.use(
        http.post('*/appraisals/A1/fees/items', () => {
          attempts += 1;
          return attempts === 1
            ? HttpResponse.json({ detail: 'nope' }, { status: 500 })
            : new HttpResponse(null, { status: 204 });
        }),
      );
      const user = userEvent.setup();
      renderCard();

      await user.click(await screen.findByLabelText('feePreview.aria.setBase'));
      await user.type(screen.getByLabelText(/fee\.addFeeModal\.amountLabel/), '100');
      await user.click(save()!);

      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(attempts).toBe(1);
      expect(save()).toBeInTheDocument();
      expect(screen.getByDisplayValue('feePreview.type.01')).toBeInTheDocument();

      // Another try goes through and closes it.
      await user.click(save()!);
      await waitFor(() => expect(save()).toBeNull());
      expect(attempts).toBe(2);
    });

    it('a second save while a write is in flight is refused with a toast and sends nothing', async () => {
      const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
      serve(preview({ baseSource: source({ kind: 'None' }), items: [], total: 0 }), []);
      let posts = 0;
      let release!: () => void;
      const gate = new Promise<void>(resolve => (release = resolve));
      server.use(
        http.post('*/appraisals/A1/fees/items', async () => {
          posts += 1;
          await gate;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const user = userEvent.setup();
      renderCard();

      await user.click(await screen.findByLabelText('feePreview.aria.setBase'));
      await user.type(screen.getByLabelText(/fee\.addFeeModal\.amountLabel/), '100');
      await user.click(save()!);
      await waitFor(() => expect(posts).toBe(1));
      // The button is disabled meanwhile, so submit the form directly (Enter in a field would).
      await waitFor(() => expect(save()).toBeDisabled());
      fireEvent.submit(save()!.closest('form')!);

      await waitFor(() => expect(toastError).toHaveBeenCalledWith('fee.toasts.changeInProgress'));
      expect(posts).toBe(1);

      release();
      await waitFor(() => expect(save()).toBeNull());
      expect(posts).toBe(1);
    });

    it('disables every fee action while one write is in flight, then enables them again', async () => {
      serve({ ...adminPreview(), feeId: 'fee-1' });
      let release!: () => void;
      const gate = new Promise<void>(resolve => (release = resolve));
      server.use(
        http.delete('*/appraisals/A1/fees/:feeId/items/:itemId', async () => {
          await gate;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const user = userEvent.setup();
      renderCard();

      await user.click(await screen.findByLabelText('feePreview.aria.deleteItem'));
      await user.click(screen.getByText('fee.deleteFeeDialog.confirm'));

      const actions = () => [
        screen.getByLabelText('feePreview.aria.editBase'),
        screen.getByLabelText('feePreview.aria.resetBase'),
        screen.getByLabelText('feePreview.aria.editItem'),
        screen.getByLabelText('feePreview.aria.deleteItem'),
        screen.getByRole('button', { name: '+ fee.addFee' }),
      ];
      await waitFor(() => expect(actions()[0]).toBeDisabled());
      for (const button of actions()) expect(button).toBeDisabled();

      release();
      await waitFor(() => expect(actions()[0]).toBeEnabled());
      for (const button of actions()) expect(button).toBeEnabled();
    });
  });
});
