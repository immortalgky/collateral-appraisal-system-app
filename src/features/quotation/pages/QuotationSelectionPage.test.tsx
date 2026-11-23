import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import toast from 'react-hot-toast';
import { render, screen, waitFor } from '@/test/test-utils';
import type { QuotationRequestDetailDto } from '../schemas/quotation';
import QuotationSelectionPage from './QuotationSelectionPage';

// vi.mock is hoisted above the imports, so the mocks it uses must be hoisted too.
const { pick, saveAll, quotationRef } = vi.hoisted(() => ({
  pick: vi.fn(),
  saveAll: vi.fn(),
  quotationRef: { current: undefined as unknown },
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../api/quotation', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/quotation')>()),
  useGetQuotationById: () => ({ data: quotationRef.current, isLoading: false, isError: false }),
  usePickTentativeWinner: () => ({ mutate: pick, isPending: false }),
  useCancelQuotation: () => ({ mutate: vi.fn(), isPending: false }),
  useSendQuotation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useQuotationIdFromRoute', () => ({ useQuotationIdFromRoute: () => 'q-1' }));

// The fee editor and saving are tested on their own; here only the outcome of saveAll matters.
vi.mock('../hooks/useWinnerFeeDrafts', () => ({
  useWinnerFeeDrafts: () => ({
    drafts: {},
    setDraft: vi.fn(),
    reset: vi.fn(),
    saveAll,
    isSaving: false,
  }),
}));
vi.mock('../components/winnerFee/WinnerFeeReview', () => ({ default: () => null }));
vi.mock('../components/QuotationTrackingLog', () => ({ default: () => null }));

/** A quotation waiting for the RM to pick from one shortlisted company. */
const pendingRmSelection = {
  id: 'q-1',
  quotationNumber: 'QTN-001',
  status: 'PendingRmSelection',
  canPickWinner: true,
  tentativeWinnerQuotationId: null,
  appraisals: [],
  companyQuotations: [
    {
      id: 'cq-1',
      companyName: 'Alpha Appraisal',
      status: 'Submitted',
      isShortlisted: true,
      totalQuotedPrice: 10_000,
      items: [],
    },
  ],
} as unknown as QuotationRequestDetailDto;

/** Opens the pick dialog for the shortlisted company and confirms it. */
async function confirmPick() {
  const { user } = render(<QuotationSelectionPage />);
  await user.click(screen.getByRole('button', { name: 'Pick' }));
  await user.click(await screen.findByRole('button', { name: /Confirm Selection/ }));
}

describe('QuotationSelectionPage - confirm pick', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    quotationRef.current = pendingRmSelection;
  });

  it('picks the winner once every fee change is saved', async () => {
    saveAll.mockResolvedValue(true);

    await confirmPick();

    await waitFor(() => expect(pick).toHaveBeenCalledTimes(1));
    expect(pick).toHaveBeenCalledWith(
      expect.objectContaining({ companyQuotationId: 'cq-1' }),
      expect.anything(),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not pick the winner when a fee change fails to save', async () => {
    saveAll.mockResolvedValue(false);

    await confirmPick();

    // Wait for the failure to be reported before checking that pick never ran.
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(saveAll).toHaveBeenCalledTimes(1);
    expect(pick).not.toHaveBeenCalled();
  });
});
