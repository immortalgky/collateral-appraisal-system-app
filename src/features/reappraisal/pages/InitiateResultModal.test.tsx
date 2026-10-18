import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { InitiateResultModal } from './InitiateResultModal';

describe('InitiateResultModal', () => {
  it('words a PriorNotCompleted skip with its label and hint, not a raw key', () => {
    render(
      <InitiateResultModal
        result={{
          groupNumber: 'G-1',
          createdRequestIds: [],
          skipped: [{ oldAppraisalReportNumber: '69000002', reason: 'PriorNotCompleted' }],
        }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Prior Appraisal Not Completed')).toBeInTheDocument();
    expect(screen.getByText(/not completed, was cancelled or was deleted/)).toBeInTheDocument();
    expect(screen.queryByText(/priorNotCompleted/)).not.toBeInTheDocument();
  });

  it('lists a book that appears twice as two rows, without a duplicate-key warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <InitiateResultModal
        result={{
          groupNumber: 'G-1',
          createdRequestIds: [],
          skipped: [
            { oldAppraisalReportNumber: '69000002', reason: 'PriorNotCompleted' },
            { oldAppraisalReportNumber: '69000002', reason: 'PriorNotCompleted' },
          ],
        }}
        onClose={() => {}}
      />,
    );
    expect(screen.getAllByText('69000002')).toHaveLength(2);
    expect(error.mock.calls.map(args => args.join(' ')).join('\n')).not.toContain('same key');
    error.mockRestore();
  });

  it('lists an accepted book that appears twice as two rows, without a duplicate-key warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <InitiateResultModal
        result={{
          groupNumber: 'G-1',
          createdRequestIds: ['r-1', 'r-2'],
          skipped: [],
          acceptedCount: 2,
          accepted: [
            { bookNumber: '69000002', prevAppraisalId: 'p-1' },
            { bookNumber: '69000002', prevAppraisalId: 'p-1' },
          ],
        }}
        onClose={() => {}}
      />,
    );
    expect(screen.getAllByText('69000002')).toHaveLength(2);
    expect(error.mock.calls.map(args => args.join(' ')).join('\n')).not.toContain('same key');
    error.mockRestore();
  });

  it('shows a skip reason this build does not know as sent, never as a raw key', () => {
    render(
      <InitiateResultModal
        result={{
          groupNumber: 'G-1',
          createdRequestIds: [],
          skipped: [{ oldAppraisalReportNumber: '69000002', reason: 'SomethingNew' as never }],
        }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('SomethingNew')).toBeInTheDocument();
    expect(screen.queryByText(/successModal|reasonHint/)).not.toBeInTheDocument();
  });

  it('shows a plain dash for a skipped book with no number', () => {
    render(
      <InitiateResultModal
        result={{
          groupNumber: 'G-1',
          createdRequestIds: [],
          skipped: [{ reason: 'NoBookNumber' }],
        }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
