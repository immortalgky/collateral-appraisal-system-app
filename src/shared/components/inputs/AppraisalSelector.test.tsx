import { describe, expect, it, vi } from 'vitest';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import AppraisalSelector from './AppraisalSelector';
import type { AppraisalCopyTemplate } from '@/features/appraisal/api/copyTemplate';

/**
 * Outside an AppraisalCopyProvider — which is how edit mode renders this control — the selector
 * stamps the metadata fields itself instead of delegating to RequestPage.
 *
 * The date has to be `appraisalDate`. It was `completedDate`, which the snapshot has never carried,
 * so `setValue` got `undefined` and the field stayed blank. `appointmentDate` is not the answer
 * either: the API persists `PrevAppraisalDate` from `appraisalDate`, and the two diverge — the
 * fixture below is an off-system external engagement, which has no appointment at all.
 */

const template = {
  prevAppraisal: {
    appraisalId: 'a-1',
    appraisalNumber: 'AP-0001',
    appraisalValue: 5_000_000,
    appointmentDate: null,
    appraisalDate: '2026-03-14',
  },
} as AppraisalCopyTemplate;

// The real modal fetches a list; all this test needs is something that hands back a template.
vi.mock('@/features/request/components/SearchAppraisalModal', () => ({
  default: ({
    isOpen,
    onSelect,
  }: {
    isOpen: boolean;
    onSelect: (t: AppraisalCopyTemplate) => void;
  }) =>
    isOpen ? (
      <button type="button" onClick={() => onSelect(template)}>
        pick
      </button>
    ) : null,
}));

function Harness() {
  const methods = useForm({
    defaultValues: {
      reportNo: '',
      appraisalId: '',
      appraisalValue: null as number | null,
      appraisalDate: null as string | null,
    },
  });

  return (
    <FormProvider {...methods}>
      <AppraisalSelector
        name="reportNo"
        idField="appraisalId"
        valueField="appraisalValue"
        dateField="appraisalDate"
      />
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
  });
});
