import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import type {
  ConstructionChainStatus,
  PriorAppraisal,
} from '@/features/appraisal/api/priorAppraisal';
import LatestChoiceDialog, { type LatestChoice } from './LatestChoiceDialog';

const template = {
  id: 'a-1',
  appraisalNumber: '69105522',
  appraisalDate: '2026-05-12T00:00:00',
  status: 'Completed',
} as PriorAppraisal;

const chain = (over: Partial<ConstructionChainStatus> = {}): ConstructionChainStatus => ({
  appraisalId: 'a-1',
  construction: {
    status: 'InProgress',
    progressPct: 72.69,
    sourceAppraisalId: 'a-1',
    sourceAppraisalNumber: '69105522',
    sourceInspectionNumber: 3,
    sourceCompletedAt: '2026-05-12T00:00:00',
  },
  selected: { status: 'InProgress', progressPct: 72.69 },
  laterInspection: null,
  openInspectionRequest: null,
  latestAppraisal: {
    appraisalId: 'a-9',
    appraisalNumber: '69120871',
    purposeCode: '03',
    completedAt: '2026-08-02T00:00:00',
    progressPct: 90,
  },
  blockReason: null,
  ...over,
});

const choiceOf = (over: Partial<ConstructionChainStatus> = {}): LatestChoice => ({
  template,
  chain: chain(over),
});

const open = (choice: LatestChoice | null = choiceOf()) => {
  const handlers = { onClose: vi.fn(), onUseSelected: vi.fn(), onUseLatest: vi.fn() };
  return { ...render(<LatestChoiceDialog choice={choice} {...handlers} />), ...handlers };
};

describe('LatestChoiceDialog', () => {
  it('is closed with no choice, and with a chain that names no newer appraisal', () => {
    const { unmount } = open(null);
    expect(screen.queryByText('The selected appraisal is not the latest in the chain')).toBeNull();
    unmount();
    open(choiceOf({ latestAppraisal: null }));
    expect(screen.queryByText('The selected appraisal is not the latest in the chain')).toBeNull();
  });

  it('puts the two appraisals side by side, dates as dd/MM/yyyy', () => {
    open();
    expect(
      screen.getByText('The selected appraisal is not the latest in the chain'),
    ).toBeInTheDocument();
    const selected = screen.getByText('Selected').nextElementSibling;
    expect(selected).toHaveTextContent('69105522 · 12/05/2026 · construction 72.69%');
    const latest = screen.getByText('Latest in chain').nextElementSibling;
    expect(latest).toHaveTextContent('69120871');
    expect(latest).toHaveTextContent('02/08/2026');
  });

  it("shows each appraisal's own construction %", () => {
    open();
    expect(screen.getByText('Selected').nextElementSibling).toHaveTextContent(
      '69105522 · 12/05/2026 · construction 72.69%',
    );
    expect(screen.getByText('Latest in chain').nextElementSibling).toHaveTextContent(
      /69120871.*02\/08\/2026 · construction 90%/,
    );
  });

  it('says there is no construction % for an appraisal that has none, never the chain figure', () => {
    open(
      choiceOf({
        selected: { status: 'NoData', progressPct: null },
        construction: {
          status: 'InProgress',
          progressPct: 80,
          sourceAppraisalId: 'a-4',
          sourceAppraisalNumber: '69110000',
          sourceInspectionNumber: 4,
          sourceCompletedAt: '2026-07-01T00:00:00',
        },
        latestAppraisal: {
          appraisalId: 'a-9',
          appraisalNumber: '69120871',
          purposeCode: '03',
          completedAt: '2026-08-02T00:00:00',
          progressPct: null,
        },
      }),
    );
    const selected = screen.getByText('Selected').nextElementSibling;
    expect(selected).toHaveTextContent('No construction % on this appraisal');
    expect(selected).not.toHaveTextContent('80');
    const latest = screen.getByText('Latest in chain').nextElementSibling;
    expect(latest).toHaveTextContent('No construction % on this appraisal');
    expect(latest).not.toHaveTextContent('80');
  });

  it('shows no construction % at all for a figure the API did not send (older API)', () => {
    open(
      choiceOf({
        selected: undefined,
        latestAppraisal: {
          appraisalId: 'a-9',
          appraisalNumber: '69120871',
          purposeCode: '03',
          completedAt: '2026-08-02T00:00:00',
        },
      }),
    );
    const selected = screen.getByText('Selected').nextElementSibling;
    expect(selected).toHaveTextContent(/^69105522 · 12\/05\/2026$/);
    const latest = screen.getByText('Latest in chain').nextElementSibling;
    expect(latest).not.toHaveTextContent('construction');
    expect(latest).not.toHaveTextContent('No construction %');
    expect(latest?.textContent).toMatch(/02\/08\/2026$/);
  });

  it('answers with the selected appraisal, passing the choice back', async () => {
    const choice = choiceOf();
    const { user, onUseSelected, onUseLatest } = open(choice);
    await user.click(
      screen.getByRole('button', { name: 'Use the selected (69105522)', hidden: true }),
    );
    expect(onUseSelected).toHaveBeenCalledWith(choice);
    expect(onUseLatest).not.toHaveBeenCalled();
  });

  it('answers with the latest appraisal, passing its id', async () => {
    const { user, onUseSelected, onUseLatest } = open();
    await user.click(
      screen.getByRole('button', { name: 'Use the latest (69120871)', hidden: true }),
    );
    expect(onUseLatest).toHaveBeenCalledWith('a-9');
    expect(onUseSelected).not.toHaveBeenCalled();
  });

  it('has the two answers and no Cancel; Escape closes it without picking', async () => {
    const { user, onClose, onUseSelected, onUseLatest } = open();
    expect(screen.queryByRole('button', { name: /cancel/i, hidden: true })).toBeNull();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onUseSelected).not.toHaveBeenCalled();
    expect(onUseLatest).not.toHaveBeenCalled();
  });
});
