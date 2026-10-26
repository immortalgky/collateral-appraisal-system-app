import { describe, expect, it } from 'vitest';
import '@/i18n';
import { act } from '@testing-library/react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { AppraisalCopyProvider } from '../contexts/AppraisalCopyContext';
import RequestForm from './RequestForm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let methods: UseFormReturn<any>;

function Harness({ purpose = '01', locked }: { purpose?: string; locked?: boolean }) {
  methods = useForm<Record<string, unknown>>({
    defaultValues: {
      purpose,
      priority: 'Normal',
      channel: 'MANUAL',
      meta: { priorLocked: locked },
      detail: {
        hasAppraisalBook: false,
        loanDetail: {
          bankingSegment: '',
          loanApplicationNumber: '',
          facilityLimit: 5000,
          additionalFacilityLimit: 100,
          previousFacilityLimit: 200,
        },
        prevAppraisalId: null,
        prevAppraisalReportNo: null,
      },
    },
  });
  return (
    <FormProvider {...methods}>
      <RequestForm />
    </FormProvider>
  );
}

const limit = (name: string) => document.querySelector(`[data-field="${name}"]`);
const FACILITY = 'detail.loanDetail.facilityLimit';
const ADDITIONAL = 'detail.loanDetail.additionalFacilityLimit';
const PREVIOUS = 'detail.loanDetail.previousFacilityLimit';

const setPurpose = (value: string) => act(() => methods.setValue('purpose', value));

describe('RequestForm limits follow the purpose', () => {
  it('shows only the facility limit on an ordinary purpose', () => {
    render(<Harness purpose="01" />);
    expect(limit(FACILITY)).toBeInTheDocument();
    expect(limit(ADDITIONAL)).not.toBeInTheDocument();
    expect(limit(PREVIOUS)).not.toBeInTheDocument();
  });

  it('on 02 shows the additional and previous limits and the total as a calculated display', () => {
    render(<Harness purpose="02" />);
    expect(limit(ADDITIONAL)).toBeInTheDocument();
    expect(limit(PREVIOUS)).toBeInTheDocument();
    expect(screen.getByText('Total limit (additional + previous)')).toBeInTheDocument();
    expect(screen.getByText('Calculated automatically')).toBeInTheDocument();
    // the total is the sum, set as before, in a disabled box
    expect(methods.getValues(FACILITY)).toBe(300);
    expect(limit(FACILITY)!.querySelector('input')).toBeDisabled();
  });

  it('on 07 and 08 shows no limit input, only the note', () => {
    for (const purpose of ['07', '08']) {
      const { unmount } = render(<Harness purpose={purpose} />);
      expect(limit(FACILITY)).not.toBeInTheDocument();
      expect(limit(ADDITIONAL)).not.toBeInTheDocument();
      expect(limit(PREVIOUS)).not.toBeInTheDocument();
      expect(screen.getByText('This purpose does not use a facility limit')).toBeInTheDocument();
      unmount();
    }
  });

  it('with no purpose shows the prior-appraisal hint and the facility limit, not required', () => {
    render(<Harness purpose="" />);
    const hint = screen.getByText(/Choose a purpose first/);
    expect(hint).toHaveTextContent('prior appraisal');
    expect(hint).not.toHaveTextContent(/limit/i);
    expect(limit(FACILITY)).toBeInTheDocument();
    expect(limit(FACILITY)!.querySelector('input')).toBeEnabled();
    expect(limit(FACILITY)!.querySelector('label')).not.toHaveTextContent('*');
    expect(limit(ADDITIONAL)).not.toBeInTheDocument();
  });

  it('choosing and clearing a purpose never clears a limit', () => {
    render(<Harness purpose="" />);
    setPurpose('07');
    expect(limit(FACILITY)).not.toBeInTheDocument();
    setPurpose('');
    expect(limit(FACILITY)).toBeInTheDocument();
    expect(methods.getValues(FACILITY)).toBe(5000);
    expect(methods.getValues(ADDITIONAL)).toBe(100);
  });

  it('a limit hidden by a purpose change keeps its value', () => {
    render(<Harness purpose="01" />);

    setPurpose('07');
    expect(limit(FACILITY)).not.toBeInTheDocument();
    expect(methods.getValues(FACILITY)).toBe(5000);

    setPurpose('01');
    expect(limit(ADDITIONAL)).not.toBeInTheDocument();
    expect(methods.getValues(ADDITIONAL)).toBe(100);
    expect(methods.getValues(PREVIOUS)).toBe(200);
  });
});

describe('RequestForm with the prior locked (submitted or Initiate draft)', () => {
  const purposeButton = () =>
    document.querySelector<HTMLButtonElement>('[data-field="purpose"] button')!;

  it('locks the purpose, and only the purpose', () => {
    render(<Harness purpose="03" locked />);
    expect(purposeButton()).toBeDisabled();
    // the other fields of the group are still the maker's to change (route-back)
    expect(document.querySelector('[data-field="channel"] button')).not.toBeDisabled();
  });

  it('leaves the purpose open on a request that is not submitted', () => {
    render(<Harness purpose="03" />);
    expect(purposeButton()).not.toBeDisabled();
  });

  it('keeps the purpose value, and the limits that follow from it', () => {
    render(<Harness purpose="01" locked />);
    expect(methods.getValues('purpose')).toBe('01');
    expect(
      document.querySelector('[data-field="detail.loanDetail.facilityLimit"]'),
    ).toBeInTheDocument();
  });

  it('locks the prior appraisal too, even where the page handlers are present', () => {
    render(
      <AppraisalCopyProvider onCopySelect={() => {}} onClear={() => {}} disabled={false}>
        <Harness purpose="03" locked />
      </AppraisalCopyProvider>,
    );
    expect(
      screen.queryByRole('button', { name: /Search prior appraisal/ }),
    ).not.toBeInTheDocument();
  });

  it('leaves the prior open where it is not submitted and the handlers are present', () => {
    render(
      <AppraisalCopyProvider onCopySelect={() => {}} onClear={() => {}} disabled={false}>
        <Harness purpose="03" />
      </AppraisalCopyProvider>,
    );
    expect(screen.getByRole('button', { name: /Search prior appraisal/ })).toBeInTheDocument();
  });
});
