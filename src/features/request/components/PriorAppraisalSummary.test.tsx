import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormProvider, useForm } from 'react-hook-form';
import { act } from '@testing-library/react';
import { useTitleEditorStore } from '../store/titleEditorStore';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@/test/test-utils';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import PriorAppraisalSummary from './PriorAppraisalSummary';

// The lookup goes through this client; nothing reaches a real server
const scrollTo = vi.hoisted(() => vi.fn());
vi.mock('@/shared/components/form/utils', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/components/form/utils')>()),
  scrollToField: scrollTo,
}));
const get = vi.hoisted(() => vi.fn());
vi.mock('@shared/api/axiosInstance', () => ({ default: { get } }));
vi.mock('@/features/appraisal/hooks/useCanOpenAppraisalWorkspace', () => ({
  useCanOpenAppraisalWorkspace: () => true,
}));

const land = (titleNumber: string) => ({
  collateralType: '01',
  titleNumber,
  titleAddress: { province: '10', district: '1001', subDistrict: '100101' },
});

const known = (id: string, number: string) => ({
  data: {
    id: 'm',
    collateralType: 'L',
    createdAt: '2026-01-01T00:00:00',
    engagementCount: 1,
    priorAppraisalCompanyIds: [],
    landDetail: {
      lastAppraisalId: id,
      lastAppraisalNumber: number,
      lastAppraisedDate: '2026-03-15T00:00:00',
    },
  },
});

// Appraisals still open on a title, by title number (none unless listed)
const openAnswers: Record<string, unknown[]> = {
  '1111': [{ appraisalId: 'o1', appraisalNumber: '69000777', status: 'UnderReview' }],
  '3333': [
    { appraisalId: 'o1', appraisalNumber: '69000777', status: 'UnderReview' },
    { appraisalId: 'o2', appraisalNumber: '69000888', status: 'Mystery' },
  ],
};

const answers: Record<string, unknown> = {
  '1111': known('a1', '69000180'),
  '2222': known('a1', '69000180'),
  '3333': known('a2', '69000999'),
};

function Harness({
  prevAppraisalId,
  isSubmitted = false,
  titles = ['1111', '2222', '3333', '4444'],
  onTyping,
  priorField = true,
}: {
  prevAppraisalId?: string;
  isSubmitted?: boolean;
  titles?: string[];
  /** Hands the test a way to type a number into the first title */
  onTyping?: (type: (titleNumber: string) => void) => void;
  /** The prior-appraisal field is on the page (a purpose that hides it renders none). */
  priorField?: boolean;
}) {
  const methods = useForm({
    defaultValues: {
      titles: titles.map(land),
      detail: { prevAppraisalId },
      meta: { isSubmitted },
    },
  });
  onTyping?.(titleNumber => methods.setValue('titles.0.titleNumber', titleNumber));
  return (
    <FormReadOnlyContext.Provider value={false}>
      <FormProvider {...methods}>
        {priorField && <div data-field="detail.prevAppraisalReportNo" />}
        <PriorAppraisalSummary />
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
}

const IN_PROGRESS = '/appraisals/in-progress-by-collateral';
type Config = { params: { titleNumber: string } };
const prior = (title: string) => answers[title];
const priorHeading = /have been appraised before/;
const openHeading = /being appraised in another report/;
const card = (heading: RegExp) =>
  screen.getByText(heading).closest('[role="status"]') as HTMLElement;

describe('PriorAppraisalSummary', () => {
  beforeEach(() => {
    useTitleEditorStore.setState({ open: false });
    get.mockReset();
    get.mockImplementation(async (url: string, { params }: Config) => {
      if (url === IN_PROGRESS) return { data: openAnswers[params.titleNumber] ?? [] };
      const answer = prior(params.titleNumber);
      if (!answer) throw { response: { status: 404 } }; // a miss
      return answer;
    });
  });

  it('groups titles by the report they were last in and marks the chosen prior', async () => {
    render(<Harness prevAppraisalId="a1" />);
    await screen.findByText(priorHeading);
    const amber = card(priorHeading);
    expect(amber).toHaveTextContent('3 of 4 attached collateral items have been appraised before');
    const [first, second] = within(amber)
      .getAllByRole('listitem')
      .filter(li => li.querySelector('strong'));
    expect(first).toHaveTextContent('Report 69000180');
    expect(first).toHaveTextContent('Matches the selected prior appraisal');
    expect(first).toHaveTextContent('1111');
    expect(first).toHaveTextContent('2222');
    expect(second).toHaveTextContent('Report 69000999');
    expect(second).toHaveTextContent('Not the selected prior appraisal');
    expect(second).toHaveTextContent('3333');
    expect(second).not.toHaveTextContent('4444');
  });

  it('shows the titles being appraised elsewhere in a red card, with the status', async () => {
    render(<Harness />);
    await screen.findByText(openHeading);
    const red = card(openHeading);
    expect(red).toHaveTextContent('2 of 4 attached collateral items are being appraised');
    const [first, second] = within(red)
      .getAllByRole('listitem')
      .filter(li => li.querySelector('strong'));
    expect(first).toHaveTextContent('Report 69000777');
    expect(first).toHaveTextContent('Under Review'); // translated
    expect(first).toHaveTextContent('1111');
    expect(first).toHaveTextContent('3333');
    expect(second).toHaveTextContent('Report 69000888');
    expect(second).toHaveTextContent('Mystery'); // no translation: as the backend sent it
    expect(red.className).toContain('border-red-300');
  });

  it('shows the red card above the amber one when both apply', async () => {
    render(<Harness />);
    await screen.findByText(priorHeading);
    await screen.findByText(openHeading);
    expect(card(openHeading).compareDocumentPosition(card(priorHeading))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('shows only the red card when nothing was appraised before', async () => {
    get.mockImplementation(async (url: string, { params }: Config) => {
      if (url === IN_PROGRESS) return { data: openAnswers[params.titleNumber] ?? [] };
      throw { response: { status: 404 } };
    });
    render(<Harness />);
    await screen.findByText(openHeading);
    expect(screen.queryByText(priorHeading)).not.toBeInTheDocument();
  });

  it('shows only the amber card when nothing is open', async () => {
    get.mockImplementation(async (url: string, { params }: Config) => {
      if (url === IN_PROGRESS) return { data: [] };
      const answer = prior(params.titleNumber);
      if (!answer) throw { response: { status: 404 } };
      return answer;
    });
    render(<Harness />);
    await screen.findByText(priorHeading);
    expect(screen.queryByText(openHeading)).not.toBeInTheDocument();
  });

  it('names no report as a link, in either card', async () => {
    render(<Harness />);
    await screen.findByText(priorHeading);
    await screen.findByText(openHeading);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps the amber card when the open-appraisals lookup fails', async () => {
    get.mockImplementation(async (url: string, { params }: Config) => {
      if (url === IN_PROGRESS) throw new Error('boom');
      const answer = prior(params.titleNumber);
      if (!answer) throw { response: { status: 404 } };
      return answer;
    });
    render(<Harness />);
    await screen.findByText(priorHeading);
    expect(screen.queryByText(openHeading)).not.toBeInTheDocument();
  });

  it('stands still while the title editor is open and catches up when it closes', async () => {
    let type!: (titleNumber: string) => void;
    render(<Harness titles={['4444']} onTyping={fn => (type = fn)} />);
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    get.mockClear();

    act(() => useTitleEditorStore.getState().setOpen(true));
    // typing in the open editor: no lookup, and nothing shown for it
    act(() => type('1111'));
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => useTitleEditorStore.getState().setOpen(false));
    expect(await screen.findByText(priorHeading)).toBeInTheDocument();
    expect(get).toHaveBeenCalled();
  });

  it('asks nothing about an edit that was cancelled', async () => {
    let type!: (titleNumber: string) => void;
    render(<Harness titles={['4444']} onTyping={fn => (type = fn)} />);
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    get.mockClear();

    act(() => useTitleEditorStore.getState().setOpen(true));
    act(() => type('1111'));
    // Cancel puts the title back, then the editor closes
    act(() => type('4444'));
    act(() => useTitleEditorStore.getState().setOpen(false));
    await new Promise(resolve => setTimeout(resolve, 800));
    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('has a button that scrolls to the prior-appraisal field', async () => {
    render(<Harness prevAppraisalId="a1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Go to prior appraisal' }));
    expect(scrollTo).toHaveBeenCalledWith('detail.prevAppraisalReportNo');
  });

  it('scrolls to the purpose when the purpose hides the prior-appraisal field', async () => {
    render(<Harness prevAppraisalId="a1" priorField={false} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Go to prior appraisal' }));
    expect(scrollTo).toHaveBeenCalledWith('purpose');
  });

  it('says so when an open appraisal has no report number yet', async () => {
    get.mockImplementation(async (url: string) => {
      if (url === IN_PROGRESS)
        return { data: [{ appraisalId: 'o9', appraisalNumber: null, status: 'Submitted' }] };
      throw { response: { status: 404 } };
    });
    render(<Harness titles={['1111']} />);
    await screen.findByText(openHeading);
    const row = within(card(openHeading)).getByText('No report number yet').closest('li');
    expect(row).toHaveTextContent('Submitted');
  });

  it('shows no badge while no prior appraisal is chosen', async () => {
    render(<Harness />);
    await screen.findByText(priorHeading);
    expect(screen.queryByText(/Matches|Not the selected|No prior/)).not.toBeInTheDocument();
  });

  it('shows a settled match while another lookup is still pending', async () => {
    get.mockImplementation(async (url: string, { params }: Config) => {
      if (url === IN_PROGRESS) return { data: [] };
      return params.titleNumber === '1111' ? known('a1', '69000180') : new Promise(() => {});
    });
    render(<Harness titles={['1111', '3333']} />);
    await screen.findByText(priorHeading);
    expect(card(priorHeading)).toHaveTextContent('1 of 2 attached');
  });

  it('shows nothing and asks nothing on a submitted request', () => {
    render(<Harness isSubmitted prevAppraisalId="a1" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it('shows nothing when no attached title matches anything', async () => {
    render(<Harness titles={['4444']} />);
    // the lookup and the open-appraisals check, once each
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
