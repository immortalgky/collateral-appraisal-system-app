import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import { render, screen, waitFor, within } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { useAuthStore } from '@/features/auth/store';
import type { User } from '@/features/auth/types';
import type { Quotation } from '../types/administration';
import type {
  CompanyQuotationDto,
  CompanyQuotationItemDto,
  InvitedCompanyDto,
  QuotationRequestDetailDto,
} from '@/features/quotation/schemas/quotation';
import i18n from '@/i18n';
import QuotationSection from './QuotationSection';

/**
 * The quotation card on the appraisal page. Texts are looked up in the real locale files, so the
 * assertions follow copy changes (e.g. a('newQuotation') is "New Quotation" in en).
 */
const a = (key: string): string => String(i18n.t(`appraisal:quotation.${key}` as never));
const q = (key: string): string => String(i18n.t(`quotation:${key}` as never));

const HOUR = 36e5;
const inHours = (h: number) => new Date(Date.now() + h * HOUR).toISOString();

const listRow = (over: Partial<Quotation> = {}): Quotation => ({
  id: 'Q1',
  quotationNumber: 'QT-0001',
  requestDate: '2026-10-01T00:00:00Z',
  cutOffTime: inHours(100),
  status: 'Sent',
  requestedByName: 'Owner Name',
  totalAppraisals: 1,
  totalCompaniesInvited: 2,
  totalQuotationsReceived: 1,
  ...over,
});

const item = (over: Partial<CompanyQuotationItemDto> = {}): CompanyQuotationItemDto => ({
  id: 'ITEM1',
  companyQuotationId: 'CQ1',
  quotationRequestItemId: 'QRI1',
  appraisalId: 'AP1',
  itemNumber: 1,
  quotedPrice: 0,
  feeAmount: 1000,
  discount: 0,
  negotiatedDiscount: null,
  vatPercent: 7,
  estimatedDays: 5,
  ...over,
});

const companyQuotation = (over: Partial<CompanyQuotationDto> = {}): CompanyQuotationDto => ({
  id: 'CQ1',
  companyId: 'C1',
  companyName: 'Alpha Co',
  status: 'Submitted',
  isShortlisted: false,
  totalQuotedPrice: 1070,
  negotiationRounds: 0,
  submittedAt: '2026-10-02T03:00:00Z',
  items: [item()],
  negotiations: [],
  ...over,
});

const invited = (companyId: string, companyName: string): InvitedCompanyDto => ({
  companyId,
  companyName,
  loanTypes: [],
  missingSegments: [],
});

const detail = (over: Partial<QuotationRequestDetailDto> = {}): QuotationRequestDetailDto => ({
  id: 'Q1',
  quotationNumber: 'QT-0001',
  requestDate: '2026-10-01T00:00:00Z',
  cutOffTime: inHours(100),
  status: 'Sent',
  requestedBy: 'owner',
  totalAppraisals: 1,
  totalCompaniesInvited: 2,
  totalQuotationsReceived: 1,
  appraisals: [{ appraisalId: 'AP1', appraisalNumber: '69-0001', titles: [] }],
  bankingSegment: [],
  companyQuotations: [],
  invitedCompanies: [invited('C1', 'Alpha Co'), invited('C2', 'Beta Co')],
  sharedDocuments: [],
  canEdit: false,
  canPickWinner: false,
  ...over,
});

/** Serves GET /quotations (the appraisal's list) and GET /quotations/:id from `details`. */
const serve = (list: Quotation[], details: QuotationRequestDetailDto[] = []) => {
  server.use(
    http.get('*/quotations', () => HttpResponse.json({ items: list })),
    http.get('*/quotations/:id', ({ params }) => {
      const d = details.find(x => x.id === params.id);
      return d ? HttpResponse.json(d) : new HttpResponse(null, { status: 404 });
    }),
  );
};

const user = (username: string): User => ({
  id: 'U1',
  name: username,
  firstName: username,
  lastName: 'Test',
  email: `${username}@example.com`,
  username,
  avatarUrl: '',
  position: '',
  department: '',
  roles: [],
  groups: [],
  teams: [],
  permissions: [],
});

const renderSection = (onCreateNew = vi.fn(), pageReadOnly = false) =>
  render(
    <PageReadOnlyContext.Provider value={pageReadOnly}>
      <QuotationSection appraisalId="AP1" onCreateNew={onCreateNew} />
    </PageReadOnlyContext.Provider>,
  );

/** Resolves when the card has left its loading state. */
const settled = () => waitFor(() => expect(screen.queryByText(a('loading'))).toBeNull());

beforeEach(() => useAuthStore.setState({ user: user('owner'), isAuthenticated: true }));
afterEach(() => useAuthStore.setState({ user: null, isAuthenticated: false }));

describe('QuotationSection - which quotation is shown', () => {
  it('shows the older open quotation, not the newer Cancelled one', async () => {
    serve(
      [
        listRow({
          id: 'Q-CANC',
          quotationNumber: 'QT-CANC',
          status: 'Cancelled',
          requestDate: '2026-10-20T00:00:00Z',
        }),
        listRow({
          id: 'Q-SENT',
          quotationNumber: 'QT-SENT',
          status: 'Sent',
          requestDate: '2026-10-01T00:00:00Z',
        }),
      ],
      [
        detail({ id: 'Q-CANC', quotationNumber: 'QT-CANC', status: 'Cancelled' }),
        detail({ id: 'Q-SENT', quotationNumber: 'QT-SENT', status: 'Sent' }),
      ],
    );
    renderSection();

    expect(await screen.findByText('QT-SENT')).toBeInTheDocument();
    expect(screen.queryByText('QT-CANC')).not.toBeInTheDocument();
    expect(screen.queryByText(a('newQuotation'))).not.toBeInTheDocument();
  });

  it('shows the older Finalized card plus a cancelled note and the new-quotation button when a newer one was cancelled', async () => {
    serve(
      [
        listRow({
          id: 'Q-CANC',
          quotationNumber: 'QT-CANC',
          status: 'Cancelled',
          requestDate: '2026-10-20T00:00:00Z',
        }),
        listRow({
          id: 'Q-FIN',
          quotationNumber: 'QT-FIN',
          status: 'Finalized',
          requestDate: '2026-10-01T00:00:00Z',
          selectedAt: '2026-10-05T00:00:00Z',
        }),
      ],
      [
        detail({ id: 'Q-CANC', quotationNumber: 'QT-CANC', status: 'Cancelled' }),
        detail({ id: 'Q-FIN', quotationNumber: 'QT-FIN', status: 'Finalized' }),
      ],
    );
    const onCreateNew = vi.fn();
    const { user: ui } = renderSection(onCreateNew);

    // Finalized card (number in the header, finalized hint) ...
    expect(await screen.findByText('QT-FIN')).toBeInTheDocument();
    expect(screen.getByText(a('finalizedHint'))).toBeInTheDocument();
    // ... plus the note naming the cancelled newer quotation, with the new-quotation action
    // (QT-CANC appears nowhere else: the header carries the shown quotation's number, QT-FIN)
    expect(screen.getByText(/QT-CANC/)).toBeInTheDocument();
    expect(screen.queryByText(a('cancelledHint'))).not.toBeInTheDocument();
    await ui.click(screen.getByRole('button', { name: a('newQuotation') }));
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('on a read-only page the cancelled note stays, without the new-quotation button', async () => {
    serve(
      [
        listRow({
          id: 'Q-CANC',
          quotationNumber: 'QT-CANC',
          status: 'Cancelled',
          requestDate: '2026-10-20T00:00:00Z',
        }),
        listRow({
          id: 'Q-FIN',
          quotationNumber: 'QT-FIN',
          status: 'Finalized',
          requestDate: '2026-10-01T00:00:00Z',
          selectedAt: '2026-10-05T00:00:00Z',
        }),
      ],
      [
        detail({ id: 'Q-CANC', quotationNumber: 'QT-CANC', status: 'Cancelled' }),
        detail({ id: 'Q-FIN', quotationNumber: 'QT-FIN', status: 'Finalized' }),
      ],
    );
    renderSection(vi.fn(), true);

    expect(await screen.findByText('QT-FIN')).toBeInTheDocument();
    expect(screen.getByText(/QT-CANC/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: a('newQuotation') })).not.toBeInTheDocument();
  });

  it('shows no cancelled note when the Finalized one is the newest', async () => {
    serve(
      [listRow({ id: 'Q-FIN', quotationNumber: 'QT-FIN', status: 'Finalized' })],
      [detail({ id: 'Q-FIN', quotationNumber: 'QT-FIN', status: 'Finalized' })],
    );
    renderSection();

    expect(await screen.findByText('QT-FIN')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: a('newQuotation') })).not.toBeInTheDocument();
  });

  it('shows the Cancelled one, with the new-quotation button, when it is the only one', async () => {
    serve(
      [listRow({ id: 'Q-CANC', quotationNumber: 'QT-CANC', status: 'Cancelled' })],
      [
        detail({
          id: 'Q-CANC',
          quotationNumber: 'QT-CANC',
          status: 'Cancelled',
          cancellationReason: 'Duplicate',
        }),
      ],
    );
    const onCreateNew = vi.fn();
    const { user: ui } = renderSection(onCreateNew);

    expect(await screen.findByText('QT-CANC')).toBeInTheDocument();
    expect(screen.getByText(a('cancelledHint'))).toBeInTheDocument();
    expect(screen.getByText(/Duplicate/)).toBeInTheDocument();
    await ui.click(screen.getByRole('button', { name: a('newQuotation') }));
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });
});

describe('QuotationSection - none', () => {
  it('offers "request quotation" and calls onCreateNew', async () => {
    serve([]);
    const onCreateNew = vi.fn();
    const { user: ui } = renderSection(onCreateNew);

    await ui.click(await screen.findByRole('button', { name: a('requestQuotation') }));
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('hides the button on a read-only page', async () => {
    serve([]);
    renderSection(vi.fn(), true);

    expect(await screen.findByText(a('noQuotation'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: a('requestQuotation') })).not.toBeInTheDocument();
  });
});

describe('QuotationSection - Sent', () => {
  const sent = (cutOffHours: number, companyQuotations: CompanyQuotationDto[] = []) => {
    const cutOffTime = inHours(cutOffHours);
    serve([listRow({ cutOffTime })], [detail({ cutOffTime, companyQuotations })]);
  };

  it('shows "—" in the money cells of a company that has not replied, never 0.00', async () => {
    const cutOffTime = inHours(100);
    // Beta Co has no CompanyQuotation; Gamma Co has only its own working draft; Delta Co's bid is in
    // its internal maker/checker review: none of them has replied to the bank.
    serve(
      [listRow({ cutOffTime })],
      [
        detail({
          cutOffTime,
          invitedCompanies: [
            invited('C1', 'Alpha Co'),
            invited('C2', 'Beta Co'),
            invited('C3', 'Gamma Co'),
            invited('C4', 'Delta Co'),
          ],
          companyQuotations: [
            companyQuotation(),
            companyQuotation({
              id: 'CQ3',
              companyId: 'C3',
              companyName: 'Gamma Co',
              status: 'Draft',
              totalQuotedPrice: 500,
              items: [item({ id: 'ITEM3', companyQuotationId: 'CQ3', feeAmount: 500 })],
            }),
            companyQuotation({
              id: 'CQ4',
              companyId: 'C4',
              companyName: 'Delta Co',
              status: 'PendingCheckerReview',
              totalQuotedPrice: 700,
              items: [item({ id: 'ITEM4', companyQuotationId: 'CQ4', feeAmount: 700 })],
            }),
          ],
        }),
      ],
    );
    renderSection();

    const rowOf = async (name: string) => (await screen.findByText(name)).closest('tr')!;

    const alpha = await rowOf('Alpha Co');
    expect(alpha).toHaveTextContent('1,070.00');

    for (const name of ['Beta Co', 'Gamma Co', 'Delta Co']) {
      const row = await rowOf(name);
      const cells = within(row).getAllByRole('cell');
      // fee, discount, net, manday, submittedAt are all "—"
      for (const cell of cells.slice(1, 6)) expect(cell).toHaveTextContent('—');
      expect(row).not.toHaveTextContent('0.00');
      expect(row).not.toHaveTextContent('500');
      expect(row).not.toHaveTextContent('700');
      // neutral badge; the company's internal review state is not exposed
      expect(within(row).getByText(q('vendorStatus.Pending'))).toBeInTheDocument();
      expect(within(row).queryByText(q('status.PendingCheckerReview'))).not.toBeInTheDocument();
    }
  });

  describe('dates follow the language, in the table as in the cut-off', () => {
    afterEach(() => i18n.changeLanguage('en'));

    const sentWithReply = () => {
      const cutOffTime = '2026-12-24T09:00:00Z';
      serve(
        [listRow({ cutOffTime })],
        [
          detail({
            cutOffTime,
            companyQuotations: [companyQuotation({ submittedAt: '2026-10-02T03:00:00Z' })],
          }),
        ],
      );
    };
    const cutOffCell = () => screen.getByText(a('closes'));

    it('Thai: the submitted date uses the Buddhist calendar like the cut-off', async () => {
      await i18n.changeLanguage('th');
      sentWithReply();
      renderSection();

      const row = (await screen.findByText('Alpha Co')).closest('tr')!;
      const submitted = within(row).getAllByRole('cell')[5];
      expect(submitted).toHaveTextContent('2569');
      expect(submitted).not.toHaveTextContent('2026');
      expect(cutOffCell()).toHaveTextContent('2569');
    });

    it('English: both are dd/MM/yyyy in the Gregorian year', async () => {
      sentWithReply();
      renderSection();

      const row = (await screen.findByText('Alpha Co')).closest('tr')!;
      expect(within(row).getAllByRole('cell')[5]).toHaveTextContent('02/10/2026');
      expect(cutOffCell()).toHaveTextContent('24/12/2026');
    });
  });

  it('shows 0.00 as the discount of a company that replied with no discount', async () => {
    sent(100, [companyQuotation({ items: [item({ discount: 0, negotiatedDiscount: null })] })]);
    renderSection();

    const alpha = (await screen.findByText('Alpha Co')).closest('tr')!;
    const cells = within(alpha).getAllByRole('cell');
    // columns: company, fee, discount, net, ...
    expect(cells[2]).toHaveTextContent('0.00');
    expect(cells[2]).not.toHaveTextContent('—');
  });

  it('shows the countdown when under 48h', async () => {
    sent(30);
    renderSection();

    expect(await screen.findByText(/\dh remaining/)).toBeInTheDocument();
  });

  it('hides the countdown at 48h or more', async () => {
    sent(100);
    renderSection();

    await settled();
    expect(await screen.findByText(a('closes'))).toBeInTheDocument();
    expect(screen.queryByText(/\dh remaining/)).not.toBeInTheDocument();
  });
});

describe('QuotationSection - WinnerTentative', () => {
  const tentative = (rounds: number) => {
    const winner = companyQuotation({
      id: 'CQW',
      isShortlisted: true,
      status: 'Tentative',
      negotiationRounds: rounds,
    });
    serve(
      [listRow({ status: 'WinnerTentative' })],
      [
        detail({
          status: 'WinnerTentative',
          companyQuotations: [winner],
          tentativeWinnerQuotationId: 'CQW',
        }),
      ],
    );
  };

  it('offers finalize, open negotiation and reject-winner', async () => {
    tentative(1);
    renderSection();

    expect(await screen.findByRole('button', { name: a('finalize') })).toBeEnabled();
    expect(screen.getByRole('button', { name: a('openNegotiation') })).toBeEnabled();
    expect(screen.getByRole('button', { name: a('rejectWinner') })).toBeEnabled();
  });

  it('disables open negotiation after 3 rounds, with the reason', async () => {
    tentative(3);
    renderSection();

    const negotiate = await screen.findByRole('button', { name: a('openNegotiation') });
    expect(negotiate).toBeDisabled();
    expect(negotiate).toHaveAttribute('title', a('maximumNegotiationRounds'));
    expect(screen.getByRole('button', { name: a('finalize') })).toBeEnabled();
  });

  it('hides every action on a read-only page', async () => {
    tentative(1);
    renderSection(vi.fn(), true);

    await screen.findAllByText('QT-0001');
    await settled();
    for (const name of ['finalize', 'openNegotiation', 'rejectWinner', 'cancelQuotation']) {
      expect(screen.queryByRole('button', { name: a(name) })).not.toBeInTheDocument();
    }
  });
});

describe('QuotationSection - Draft', () => {
  const draft = (over: Partial<QuotationRequestDetailDto> = {}, cutOffTime = inHours(100)) =>
    serve(
      [listRow({ status: 'Draft', cutOffTime })],
      [
        detail({
          status: 'Draft',
          cutOffTime,
          totalAppraisals: 1,
          totalCompaniesInvited: 2,
          ...over,
        }),
      ],
    );

  it('enables send when the draft is complete', async () => {
    draft();
    renderSection();

    const send = await screen.findByRole('button', { name: a('sendQuotation') });
    expect(send).toBeEnabled();
    expect(send).not.toHaveAttribute('title');
  });

  it('disables send with the reason when there is no cut-off time', async () => {
    draft({}, '');
    renderSection();

    const send = await screen.findByRole('button', { name: a('sendQuotation') });
    expect(send).toBeDisabled();
    expect(send).toHaveAttribute('title', a('sendRequirementsHint'));
    expect(screen.getByText(a('stats.cutOffTime')).closest('.min-w-0')).toHaveTextContent(
      a('notSet'),
    );
  });

  it('offers edit to the owner (requestedBy)', async () => {
    draft({ requestedBy: 'owner' });
    renderSection();

    expect(await screen.findByRole('button', { name: a('edit') })).toBeInTheDocument();
  });

  it('hides edit from anyone else', async () => {
    useAuthStore.setState({ user: user('someone-else') });
    draft({ requestedBy: 'owner' });
    renderSection();

    await screen.findByRole('button', { name: a('sendQuotation') });
    expect(screen.queryByRole('button', { name: a('edit') })).not.toBeInTheDocument();
  });
});

describe('QuotationSection - Draft edit failure', () => {
  const failEdit = async (body: { title?: string; detail?: string }) => {
    serve([listRow({ status: 'Draft' })], [detail({ status: 'Draft', requestedBy: 'owner' })]);
    server.use(http.patch('*/quotations/Q1/draft', () => HttpResponse.json(body, { status: 400 })));
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
    const { user: ui } = renderSection();

    await ui.click(await screen.findByRole('button', { name: a('edit') }));
    await ui.click(await screen.findByRole('button', { name: a('save') }));
    return toastError;
  };

  afterEach(() => vi.restoreAllMocks());

  it("shows the server's reason when saving the draft fails", async () => {
    const toastError = await failEdit({
      title: 'Bad Request',
      detail: 'Cut-off time is in the past',
    });

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Cut-off time is in the past'));
  });

  it('falls back to the generic message when the server gives no reason', async () => {
    const toastError = await failEdit({});

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(a('toasts.draftUpdateFailed')));
  });
});

describe('QuotationSection - Finalized', () => {
  it('shows the final price of this appraisal from the winner', async () => {
    const winner = companyQuotation({
      id: 'CQW',
      status: 'Accepted',
      items: [
        item({ feeAmount: 10000, discount: 1000, negotiatedDiscount: null, vatPercent: 7 }),
        // another appraisal of the same quotation: must not leak into this card
        item({ id: 'ITEM2', appraisalId: 'AP2', feeAmount: 99999 }),
      ],
    });
    serve(
      [listRow({ status: 'Finalized' })],
      [
        detail({
          status: 'Finalized',
          companyQuotations: [winner],
          tentativeWinnerQuotationId: 'CQW',
        }),
      ],
    );
    renderSection();

    expect(await screen.findByText(a('finalPrice'))).toBeInTheDocument();
    // (10000 - 1000) + 7% VAT
    expect(screen.getByText(/9,630\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/99,999/)).not.toBeInTheDocument();
  });
});

describe('QuotationSection - a status the card does not know', () => {
  const unknown = (status: string) => {
    serve(
      [listRow({ status: status as Quotation['status'] })],
      [detail({ status: status as QuotationRequestDetailDto['status'] })],
    );
  };

  it('on a read-only page says what the status is, with no new-quotation button', async () => {
    unknown('SomethingNew');
    renderSection(vi.fn(), true);

    expect(await screen.findByText('SomethingNew', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: a('newQuotation') })).not.toBeInTheDocument();
  });

  it('on a read-only page with no status at all says there is no data, not an empty body', async () => {
    unknown('');
    renderSection(vi.fn(), true);

    expect(
      await screen.findByText(String(i18n.t('appraisal:administration.noData' as never))),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: a('newQuotation') })).not.toBeInTheDocument();
  });

  it('on an editable page still offers a new quotation', async () => {
    unknown('SomethingNew');
    renderSection();

    expect(await screen.findByRole('button', { name: a('newQuotation') })).toBeInTheDocument();
    expect(screen.queryByText('SomethingNew', { selector: 'p' })).not.toBeInTheDocument();
  });
});
