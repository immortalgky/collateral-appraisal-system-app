import { describe, expect, it, vi } from 'vitest';
import { FormProvider, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { render, screen, waitFor } from '@/test/test-utils';
import AppraisalSelector from './AppraisalSelector';
import type { PriorAppraisal } from '@/features/appraisal/api/priorAppraisal';
import { AppraisalCopyProvider } from '@/features/request/contexts/AppraisalCopyContext';

/**
 * Outside an AppraisalCopyProvider — which is how edit mode renders this control — the selector
 * stamps the metadata fields itself instead of delegating to RequestPage.
 *
 * Everything is stamped from the picked appraisal's HEADER (`id`, `appraisalNumber`,
 * `appraisalValue`, `appraisalDate`). The date has to be `appraisalDate`: the API persists
 * `PrevAppraisalDate` from it, and it is not the appointment, which an off-system external
 * engagement does not even have. `request.prevAppraisal` is the picked appraisal's OWN prior book
 * and must not be used: the fixture gives it other values so a regression shows.
 */

const template = {
  id: 'a-1',
  appraisalNumber: 'AP-0001',
  appraisalValue: 5_000_000,
  appraisalDate: '2026-03-14',
  request: {
    prevAppraisal: {
      appraisalId: 'book-1',
      appraisalNumber: 'AP-0000',
      appraisalValue: 1_000,
      appraisalDate: '2020-01-01',
    },
  },
} as PriorAppraisal;

// The real modal fetches a list; all this test needs is something that hands back a template.
vi.mock('@/features/request/components/SearchAppraisalModal', () => ({
  default: ({ isOpen, onSelect }: { isOpen: boolean; onSelect: (t: PriorAppraisal) => void }) =>
    isOpen ? (
      <button type="button" onClick={() => onSelect(template)}>
        pick
      </button>
    ) : null,
}));

function Harness({
  handlers,
  referenced = false,
  pickLoading = false,
}: {
  handlers?: { onSelect: () => void; onClear: () => void };
  referenced?: boolean;
  pickLoading?: boolean;
}) {
  const methods = useForm({
    defaultValues: {
      reportNo: referenced ? 'AP-0000' : '',
      appraisalId: referenced ? 'a-0' : '',
      appraisalValue: null as number | null,
      appraisalDate: null as string | null,
    },
  });

  const selector = (
    <AppraisalSelector
      name="reportNo"
      idField="appraisalId"
      valueField="appraisalValue"
      dateField="appraisalDate"
    />
  );

  return (
    <FormProvider {...methods}>
      {handlers ? (
        <AppraisalCopyProvider
          onCopySelect={handlers.onSelect}
          onClear={handlers.onClear}
          disabled={pickLoading}
        >
          {selector}
        </AppraisalCopyProvider>
      ) : (
        selector
      )}
      <output data-testid="id">{methods.watch('appraisalId') ?? ''}</output>
      <output data-testid="date">{methods.watch('appraisalDate') ?? ''}</output>
      <output data-testid="value">{methods.watch('appraisalValue') ?? ''}</output>
    </FormProvider>
  );
}

describe('AppraisalSelector outside an AppraisalCopyProvider', () => {
  it('stamps the previous appraisal date from appraisalDate, not the appointment', async () => {
    const { user } = render(<Harness />);

    await user.click(screen.getByTitle('Search previous appraisal reports'));
    await user.click(screen.getByRole('button', { name: 'pick' }));

    expect(screen.getByTestId('date')).toHaveTextContent('2026-03-14');
    // The sibling fields already worked — they are here so a regression that breaks all three
    // reads differently from one that breaks only the date.
    expect(screen.getByTestId('value')).toHaveTextContent('5000000');
    // the picked appraisal itself, not its own prior book
    expect(screen.getByTestId('id')).toHaveTextContent('a-1');
  });
});

/**
 * A request that is not submitted renders the selector inside the provider, which takes over both
 * the pick and the clear: the caller stamps or clears the reference, and drops the files that were
 * carried from it. The selector must therefore leave the fields alone.
 */
describe('AppraisalSelector inside an AppraisalCopyProvider', () => {
  it('hands the pick to onSelect and does not stamp the fields itself', async () => {
    const onSelect = vi.fn();
    const { user } = render(<Harness handlers={{ onSelect, onClear: vi.fn() }} />);

    await user.click(screen.getByTitle('Search previous appraisal reports'));
    await user.click(screen.getByRole('button', { name: 'pick' }));

    expect(onSelect).toHaveBeenCalledWith(template);
    expect(screen.getByTestId('id')).toHaveTextContent('');
    expect(screen.getByTestId('date')).toHaveTextContent('');
  });

  it('hands the clear to onClear and keeps the reference until the caller clears it', async () => {
    const onClear = vi.fn();
    const { user } = render(<Harness referenced handlers={{ onSelect: vi.fn(), onClear }} />);

    await user.click(screen.getByTitle('Clear selection'));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('id')).toHaveTextContent('a-0');
  });

  it('locks search and clear while a pick is loading', () => {
    render(<Harness referenced pickLoading handlers={{ onSelect: vi.fn(), onClear: vi.fn() }} />);

    expect(screen.queryByTitle('Search previous appraisal reports')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Clear selection')).not.toBeInTheDocument();
  });

  it('still clears the fields itself outside the provider', async () => {
    const { user } = render(<Harness referenced />);

    await user.click(screen.getByTitle('Clear selection'));

    expect(screen.getByTestId('id')).toHaveTextContent('');
  });

  it('shows an error toast when the async handler fails, instead of an unhandled rejection', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSelect = vi.fn().mockRejectedValue(new Error('boom'));
    const { user } = render(<Harness handlers={{ onSelect, onClear: vi.fn() }} />);

    await user.click(screen.getByTitle('Search previous appraisal reports'));
    await user.click(screen.getByRole('button', { name: 'pick' }));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    toastError.mockRestore();
    consoleError.mockRestore();
  });
});
