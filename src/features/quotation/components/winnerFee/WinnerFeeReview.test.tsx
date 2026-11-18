import { useState } from 'react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import i18n from '@/i18n';
import { server } from '@/test/mocks/server';
import { render, screen } from '@/test/test-utils';
import { useParameterStore } from '@/shared/store';
import type { AppraisalSummaryDto, CompanyQuotationDto } from '../../schemas/quotation';
import type { FeeDraft, FeeDrafts } from '../../hooks/useWinnerFeeDrafts';
import WinnerFeeReview from './WinnerFeeReview';

const appraisal = (n: number) =>
  ({
    appraisalId: `ap-${n}`,
    appraisalNumber: `A-00${n}`,
    customerName: n === 1 ? 'Alice' : 'Bob',
    feeId: `fee-${n}`,
  }) as unknown as AppraisalSummaryDto;

const appraisals = [appraisal(1), appraisal(2)];
const company = { id: 'cq-1', items: [], totalQuotedPrice: 0 } as unknown as CompanyQuotationDto;

const feeType = (code: string, description: string) => ({
  parId: Number(code),
  group: 'FeePaymentMethod',
  country: 'TH',
  language: 'en',
  code,
  description,
  isActive: true,
  seqNo: Number(code),
});

/** Real drafts state, so the Apply / Clear swap follows what the user does. */
function Harness({ onReset }: { onReset?: () => void }) {
  const [drafts, setDrafts] = useState<FeeDrafts>({});
  return (
    <WinnerFeeReview
      appraisals={appraisals}
      company={company}
      drafts={drafts}
      onDraftChange={(id, draft: FeeDraft) => setDrafts(prev => ({ ...prev, [id]: draft }))}
      onReset={() => {
        onReset?.();
        setDrafts({});
      }}
    />
  );
}

async function pickApplyAllType(user: ReturnType<typeof render>['user'], label: string) {
  await user.click(screen.getByRole('button', { name: 'Fee Payment Type' }));
  await user.click(await screen.findByRole('option', { name: new RegExp(label) }));
}

describe('WinnerFeeReview - apply all and clear', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
    useParameterStore
      .getState()
      .setParameters([feeType('01', 'Customer pays'), feeType('04', 'Partial absorb')] as never);
  });

  afterAll(() => {
    useParameterStore.getState().setParameters([]);
  });

  /** Saved fee per appraisal; every appraisal is on type 01 unless named here. */
  function mockSavedFees(types: Record<string, string> = {}) {
    server.use(
      http.get('*/appraisals/:appraisalId/fees', ({ params }) =>
        HttpResponse.json({
          fees: [
            {
              id: `fee-${String(params.appraisalId).slice(3)}`,
              feePaymentType: types[String(params.appraisalId)] ?? '01',
              bankAbsorbAmount: 0,
              totalFeeAfterVAT: 1000,
            },
          ],
        }),
      ),
    );
  }

  beforeEach(() => mockSavedFees());

  it('applies the type only to the appraisals the search shows', async () => {
    const onDraftChange = vi.fn();
    const { user } = render(
      <WinnerFeeReview
        appraisals={appraisals}
        company={company}
        drafts={{}}
        onDraftChange={onDraftChange}
        onReset={vi.fn()}
      />,
    );

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Bob');
    await pickApplyAllType(user, 'Partial absorb');
    await user.click(await screen.findByRole('button', { name: 'Apply (1)' }));

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    expect(onDraftChange).toHaveBeenCalledWith(
      'ap-2',
      expect.objectContaining({ feeId: 'fee-2', feePaymentType: '04' }),
      expect.anything(),
    );
  });

  it('swaps Apply for Clear once there are drafts, and Clear drops them all', async () => {
    const onReset = vi.fn();
    const { user } = render(<Harness onReset={onReset} />);

    await pickApplyAllType(user, 'Partial absorb');
    const apply = await screen.findByRole('button', { name: 'Apply (2)' });
    await user.click(apply);
    await user.unhover(apply);
    await user.click(await screen.findByRole('button', { name: 'Clear (2)' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument();
  });

  it('keeps Apply under the pointer after a click, so a double click does not clear', async () => {
    const onReset = vi.fn();
    const { user } = render(<Harness onReset={onReset} />);

    await pickApplyAllType(user, 'Partial absorb');
    await user.dblClick(await screen.findByRole('button', { name: 'Apply (2)' }));

    expect(onReset).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument();
  });

  it('does not clear what was just applied when Enter is pressed again', async () => {
    const onReset = vi.fn();
    const { user } = render(<Harness onReset={onReset} />);

    await pickApplyAllType(user, 'Partial absorb');
    (await screen.findByRole('button', { name: 'Apply (2)' })).focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('button', { name: 'Clear (2)' });
    await user.keyboard('{Enter}');

    expect(onReset).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Clear (2)' })).toBeInTheDocument();
  });

  it('counts only the appraisals whose type would change, and skips the rest', async () => {
    mockSavedFees({ 'ap-1': '04' });
    const onDraftChange = vi.fn();
    const { user } = render(
      <WinnerFeeReview
        appraisals={appraisals}
        company={company}
        drafts={{}}
        onDraftChange={onDraftChange}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    // Wait for the saved fees, so ap-1 is known to be on 04 already.
    await screen.findByText(/04 - Partial absorb/);
    await pickApplyAllType(user, 'Partial absorb');
    await user.click(await screen.findByRole('button', { name: 'Apply (1)' }));

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    expect(onDraftChange).toHaveBeenCalledWith(
      'ap-2',
      expect.objectContaining({ feePaymentType: '04' }),
      expect.anything(),
    );
  });

  it('reads the fee the quotation points at, not an older one from a cancelled assignment', async () => {
    server.use(
      http.get('*/appraisals/ap-1/fees', () =>
        HttpResponse.json({
          fees: [
            {
              id: 'fee-cancelled',
              feePaymentType: '01',
              bankAbsorbAmount: 0,
              totalFeeAfterVAT: 1000,
            },
            { id: 'fee-1', feePaymentType: '04', bankAbsorbAmount: 0, totalFeeAfterVAT: 1000 },
          ],
        }),
      ),
    );
    const { user } = render(<Harness />);

    await screen.findByText(/04 - Partial absorb/);
    await pickApplyAllType(user, 'Partial absorb');

    // ap-1 is already on 04 in fee-1, so only ap-2 changes.
    expect(await screen.findByRole('button', { name: 'Apply (1)' })).toBeEnabled();
  });

  it('leaves out an appraisal whose saved fee has not loaded yet', async () => {
    server.use(
      http.get('*/appraisals/ap-2/fees', async () => {
        await delay('infinite');
        return HttpResponse.json({ fees: [] });
      }),
    );
    const onDraftChange = vi.fn();
    const { user } = render(
      <WinnerFeeReview
        appraisals={appraisals}
        company={company}
        drafts={{}}
        onDraftChange={onDraftChange}
        onReset={vi.fn()}
      />,
    );

    await screen.findByText(/01 - Customer pays/);
    await pickApplyAllType(user, 'Partial absorb');
    await user.click(await screen.findByRole('button', { name: 'Apply (1)' }));

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    expect(onDraftChange.mock.calls[0][0]).toBe('ap-1');
  });
});
