import { describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { useAuthStore } from '@/features/auth/store';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import { AppraisalCopyProvider } from '../contexts/AppraisalCopyContext';
import PriorAppraisalBlock from './PriorAppraisalBlock';

vi.mock('./SearchAppraisalModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>search-modal</div> : null),
}));

const asUser = (permissions: string[]) =>
  useAuthStore.setState({ user: { username: 'u', permissions } as never });

const prior = {
  prevAppraisalId: 'a-1',
  prevAppraisalReportNo: '69105470',
  prevAppraisalValue: 3_630_000,
  prevAppraisalDate: '2026-09-23T00:00:00',
};

function Harness({
  purpose = '03',
  detail = {},
  readOnly = false,
  handlers,
  disabled = false,
  round = null,
  locked,
}: {
  purpose?: string;
  detail?: Record<string, unknown>;
  readOnly?: boolean;
  handlers?: { onSelect: () => void; onClear: () => void };
  disabled?: boolean;
  /** The next inspection round, which the page keeps out of the form and hands over here. */
  round?: number | null;
  locked?: boolean;
}) {
  const methods = useForm({
    defaultValues: { purpose, detail: { ...detail }, meta: { priorLocked: locked } },
  });
  const block = (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...methods}>
        <PriorAppraisalBlock />
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
  return handlers ? (
    <AppraisalCopyProvider
      onCopySelect={handlers.onSelect}
      onClear={handlers.onClear}
      disabled={disabled}
      round={round}
    >
      {block}
    </AppraisalCopyProvider>
  ) : (
    block
  );
}

const handlers = () => ({ onSelect: vi.fn(), onClear: vi.fn() });

describe('PriorAppraisalBlock', () => {
  it('says which appraisal it follows: number as a new-tab link, value and date', () => {
    asUser(['APPRAISAL_VIEW']);
    render(<Harness detail={prior} handlers={handlers()} />);
    const strip = screen.getByRole('status');
    expect(strip).toHaveTextContent('Prior appraisal');
    expect(strip).toHaveTextContent('Value 3,630,000 THB');
    expect(strip).toHaveTextContent('Date 23/09/2026');
    const link = screen.getByRole('link', { name: '69105470' });
    expect(link).toHaveAttribute('href', '/appraisals/a-1');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows the date as dd/MM/yyyy in Thai too, not as a Buddhist-era date', async () => {
    asUser(['APPRAISAL_VIEW']);
    await i18n.loadNamespaces('request');
    await i18n.changeLanguage('th');
    try {
      render(<Harness detail={prior} handlers={handlers()} />);
      expect(screen.getByRole('status')).toHaveTextContent('ประเมินเมื่อ 23/09/2026');
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('is plain text, not a link, for a user who may not open the appraisal', () => {
    asUser(['APPRAISAL_TRACKING_VIEW']);
    render(<Harness detail={prior} handlers={handlers()} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('69105470')).toBeInTheDocument();
  });

  it('shows a dash for a value that is masked, null or 0, and leaves out a missing date', () => {
    asUser(['APPRAISAL_VIEW']);
    for (const prevAppraisalValue of [null, 0]) {
      const { unmount } = render(
        <Harness
          detail={{ ...prior, prevAppraisalValue, prevAppraisalDate: null }}
          handlers={handlers()}
        />,
      );
      const strip = screen.getByRole('status');
      expect(strip).toHaveTextContent('Value —');
      expect(strip).not.toHaveTextContent('THB');
      expect(strip).not.toHaveTextContent('Date');
      unmount();
    }
  });

  it('shows the inspection round, from the page, only on a construction-inspection purpose', () => {
    asUser(['APPRAISAL_VIEW']);
    const { unmount } = render(
      <Harness purpose="06" detail={prior} handlers={handlers()} round={3} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Inspection round 3');
    unmount();
    const other = render(<Harness purpose="03" detail={prior} handlers={handlers()} round={3} />);
    expect(screen.getByRole('status')).not.toHaveTextContent('Inspection round');
    other.unmount();
    render(<Harness purpose="06" detail={prior} handlers={handlers()} round={null} />);
    expect(screen.getByRole('status')).not.toHaveTextContent('Inspection round');
  });

  it('clears through the page handler, and holds both buttons while a pick loads', async () => {
    asUser(['APPRAISAL_VIEW']);
    const h = handlers();
    const { user, unmount } = render(<Harness detail={prior} handlers={h} />);
    await user.click(screen.getByRole('button', { name: 'Clear the prior appraisal reference' }));
    expect(h.onClear).toHaveBeenCalledTimes(1);
    unmount();

    render(<Harness detail={prior} handlers={h} disabled />);
    expect(
      screen.getByRole('button', { name: 'Clear the prior appraisal reference' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Change' })).toBeDisabled();
  });

  it('opens the search from Change', async () => {
    asUser(['APPRAISAL_VIEW']);
    const { user } = render(<Harness detail={prior} handlers={handlers()} />);
    await user.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByText('search-modal')).toBeInTheDocument();
  });

  it('has no buttons when read-only or on a submitted request (no handlers)', () => {
    asUser(['APPRAISAL_VIEW']);
    const { unmount } = render(<Harness detail={prior} handlers={handlers()} readOnly />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();
    render(<Harness detail={prior} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the required search field, with the create hint, only for a purpose that uses a prior', () => {
    const { unmount } = render(<Harness purpose="03" handlers={handlers()} />);
    expect(screen.getByRole('button', { name: /Search prior appraisal/ })).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText(/customers, properties, titles/)).toBeInTheDocument();
    unmount();

    for (const purpose of ['01', '07', '10', '14']) {
      const { container, unmount: done } = render(
        <Harness purpose={purpose} handlers={handlers()} />,
      );
      expect(container).toBeEmptyDOMElement();
      done();
    }
  });

  describe('on a submitted request (no page handlers): the prior is locked', () => {
    it('shows the strip alone, with no change or clear, when there is a prior', () => {
      asUser(['APPRAISAL_VIEW']);
      render(<Harness purpose="03" detail={prior} />);
      const strip = screen.getByRole('status');
      expect(strip).toHaveTextContent('69105470');
      expect(strip).toHaveTextContent('Value 3,630,000 THB');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows a dash and no search field when there is none, whatever the purpose that asks for one', () => {
      for (const purpose of ['03', '06', '12']) {
        const { unmount } = render(<Harness purpose={purpose} />);
        expect(screen.getByText('Previous Appraisal Report No')).toBeInTheDocument();
        expect(screen.getByText('—')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.queryByText('search-modal')).not.toBeInTheDocument();
        unmount();
      }
    });

    it('shows nothing for a purpose that takes no prior and has none', () => {
      const { container } = render(<Harness purpose="01" />);
      expect(container).toBeEmptyDOMElement();
    });

    it('a draft (with the page handlers) still offers the search field', () => {
      render(<Harness purpose="03" handlers={handlers()} />);
      expect(screen.getByRole('button', { name: /Search prior appraisal/ })).toBeInTheDocument();
    });
  });

  it('keeps the strip, with change and clear, after a switch to a purpose that uses no prior', () => {
    asUser(['APPRAISAL_VIEW']);
    render(<Harness purpose="01" detail={prior} handlers={handlers()} />);
    expect(screen.getByRole('status')).toHaveTextContent('69105470');
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear the prior appraisal reference' }),
    ).toBeInTheDocument();
  });

  it('shows nothing when read-only with no prior, whatever the purpose', () => {
    for (const purpose of ['03', '01']) {
      const { container, unmount } = render(<Harness purpose={purpose} readOnly />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('shows a hint before a purpose is chosen', () => {
    render(<Harness purpose="" />);
    expect(screen.getByText(/Choose a purpose first/)).toBeInTheDocument();
  });
});

describe('PriorAppraisalBlock locked by the page', () => {
  it('is display-only even when the page handlers are there: the strip alone, no change or clear', () => {
    asUser(['APPRAISAL_VIEW']);
    const h = handlers();
    render(<Harness purpose="03" detail={prior} handlers={h} locked />);
    expect(screen.getByRole('status')).toHaveTextContent('69105470');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(h.onSelect).not.toHaveBeenCalled();
  });

  it('offers no search field with the handlers there and no prior: a dash, whatever asks for one', () => {
    for (const purpose of ['03', '06', '12']) {
      const { unmount } = render(<Harness purpose={purpose} handlers={handlers()} locked />);
      expect(screen.getByText('—')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByText('search-modal')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('is not locked when the page says nothing and the handlers are there', () => {
    render(<Harness purpose="03" handlers={handlers()} locked={false} />);
    expect(screen.getByRole('button', { name: /Search prior appraisal/ })).toBeInTheDocument();
  });

  it('with no handlers it is locked whatever the page says', () => {
    render(<Harness purpose="03" locked={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
