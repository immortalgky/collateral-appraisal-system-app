import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { useParameterStore } from '@/shared/store';
import { AppraisalProvider } from '../context/AppraisalContext';
import LimitationLawHints from './LimitationLawHints';

const navigate = vi.fn();
vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<object>()),
  useNavigate: () => navigate,
}));
let laws: { items: { headerCode: string }[] } | undefined;
vi.mock('../api/lawAndRegulation', () => ({
  useGetLawAndRegulations: () => ({ data: laws }),
}));

const Harness = ({ defaults }: { defaults: Record<string, unknown> }) => {
  const methods = useForm({ defaultValues: defaults });
  return (
    <AppraisalProvider
      value={
        {
          appraisal: { appraisalId: 'a1', basePath: '/appraisals/a1' },
          isLoading: false,
          isError: false,
          error: null,
        } as never
      }
    >
      <FormProvider {...methods}>
        <LimitationLawHints />
      </FormProvider>
    </AppraisalProvider>
  );
};

describe('limitation hints to the Law & Regulation tab', () => {
  beforeEach(() => {
    navigate.mockClear();
    laws = { items: [] };
    useParameterStore.getState().setParameters(
      [
        ['04', 'การเวนคืน'],
        ['05', 'การตรวจสอบพื้นที่ป่าไม้ หรือที่ดินสงวนหวงห้ามของรัฐ'],
      ].map(([code, description], i) => ({
        parId: i,
        group: 'LawRegulationHeader',
        country: 'th',
        language: 'en',
        code,
        description,
        isActive: true,
        seqNo: i + 1,
      })) as never,
    );
  });

  it('says nothing while no chip is ticked', () => {
    const { container } = render(
      <Harness defaults={{ isInExpropriationLine: false, isForestBoundary: false }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('says nothing until the law records are known', () => {
    laws = undefined;
    const { container } = render(<Harness defaults={{ isInExpropriationLine: true }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('points to the tab, with the topic name, for a ticked chip that has no record', async () => {
    const { user } = render(<Harness defaults={{ isInExpropriationLine: true }} />);
    expect(screen.getByText(/no “การเวนคืน” entry yet/)).toBeInTheDocument();
    expect(screen.queryByText(/ป่าไม้/)).toBeNull();
    await user.click(screen.getByRole('button', { name: /Go to the Laws tab/ }));
    expect(navigate).toHaveBeenCalledWith('/appraisals/a1/property?tab=laws');
  });

  it('confirms a topic that already has a record, with no link', () => {
    laws = { items: [{ headerCode: '04' }] };
    render(<Harness defaults={{ isInExpropriationLine: true }} />);
    expect(screen.getByText(/A “การเวนคืน” entry exists/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('gives one line per ticked chip: one missing, one present', () => {
    laws = { items: [{ headerCode: '05' }] };
    render(<Harness defaults={{ isInExpropriationLine: true, isForestBoundary: true }} />);
    expect(screen.getByText(/no “การเวนคืน” entry yet/)).toBeInTheDocument();
    expect(screen.getByText(/A “การตรวจสอบพื้นที่ป่าไม้.*” entry exists/)).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
