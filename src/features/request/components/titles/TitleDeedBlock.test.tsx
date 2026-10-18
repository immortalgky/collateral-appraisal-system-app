import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { requestTitleDefault } from '../../schemas/form';
import { TitleDeedBlock } from './TitleDeedBlock';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/appraisal/components/TitleDeedSheet', () => ({
  TitleDeedSheet: ({
    holderField,
    variant,
    landTitleNumbers,
  }: {
    holderField?: { name: string };
    variant?: string;
    landTitleNumbers?: React.ReactNode;
  }) => (
    <div data-testid="paper" data-holder={holderField?.name} data-variant={variant}>
      {landTitleNumbers}
    </div>
  ),
}));
vi.mock('@/features/appraisal/components/TitleFormView', () => ({
  TitleFormView: ({
    scope,
    areaNames,
    showGroupTitles,
  }: {
    scope?: { name: string; index: number };
    areaNames?: { rai: string };
    showGroupTitles?: boolean;
  }) => (
    <div
      data-testid="form-view"
      data-scope={scope ? `${scope.name}.${scope.index}` : undefined}
      data-rai={areaNames?.rai}
      data-titles={String(showGroupTitles)}
    />
  ),
}));
vi.mock('../../forms/TitleLandForm', () => ({
  default: ({ include }: { include: string[] }) => (
    <div data-testid="land-form" data-include={include.join(',')} />
  ),
}));
vi.mock('../../forms/TitleCondoForm', () => ({
  default: ({ include, exclude }: { include?: string[]; exclude?: string[] }) => (
    <div
      data-testid="condo-form"
      data-include={include?.join(',')}
      data-exclude={exclude?.join(',')}
    />
  ),
}));
vi.mock('./TitleNumbersField', () => ({
  TitleNumbersSummary: () => <div data-testid="summary" />,
}));
vi.mock('./DeedTypePills', () => ({
  DeedTypePills: ({ codes }: { codes?: string[] }) => (
    <div data-testid="pills" data-codes={codes?.join(',')} />
  ),
}));

function Harness({
  titleType,
  family = 'land',
}: {
  titleType: string;
  family?: 'land' | 'landBuilding' | 'condo';
}) {
  const form = useForm({
    defaultValues: {
      titles: [
        {
          ...structuredClone(requestTitleDefault),
          collateralType: family === 'condo' ? '08' : '01',
          titleType,
        },
      ],
    },
  });
  return (
    <FormProvider {...form}>
      <TitleDeedBlock index={0} family={family} />
    </FormProvider>
  );
}

const paperButton = () =>
  screen.getByRole('button', { name: /titleSection\.drawer\.viewDocument/ });
const formButton = () => screen.getByRole('button', { name: /titleSection\.drawer\.viewForm/ });

beforeEach(() => localStorage.clear());

describe('TitleDeedBlock', () => {
  it.each(['DEED', 'NS3K', 'NS3', 'NS3KO'])(
    'draws %s as the paper by default, bound to the holder',
    type => {
      render(<Harness titleType={type} />);
      expect(screen.getByTestId('paper')).toHaveAttribute('data-holder', 'ownerName');
      expect(paperButton()).toHaveAttribute('aria-pressed', 'true');
    },
  );

  it.each(['POSR', 'OTHER', ''])('keys %s in the form only, with the paper switched off', type => {
    render(<Harness titleType={type} />);
    expect(screen.queryByTestId('paper')).toBeNull();
    expect(paperButton()).toBeDisabled();
    expect(screen.getAllByTestId('land-form').length).toBeGreaterThan(0);
  });

  it('puts the holder in the form view, and only the notes below the paper', async () => {
    render(<Harness titleType="DEED" />);
    const includes = () =>
      screen.getAllByTestId('land-form').map(n => n.getAttribute('data-include'));
    expect(includes()).toEqual(['notes']);
    // The notes field names itself: no section heading above it
    expect(screen.queryByText('titleSection.drawer.section.deedDetail')).toBeNull();
    expect(screen.queryByTestId('form-view')).toBeNull();
    await userEvent.click(formButton());
    expect(includes()).toEqual(['ownerName,notes']);
  });

  it("lays the form view out as the land page's own form view, reading this title's row", async () => {
    render(<Harness titleType="NS3K" />);
    await userEvent.click(formButton());
    const view = await screen.findByTestId('form-view');
    expect(view).toHaveAttribute('data-scope', 'titles.0');
    expect(view).toHaveAttribute('data-rai', 'areaRai');
    // no group headings in the drawer, and none above the holder either
    expect(view).toHaveAttribute('data-titles', 'false');
    expect(screen.queryByText('titleSection.drawer.section.holder')).toBeNull();
  });

  it('remembers the chosen view for next time', async () => {
    const { unmount } = render(<Harness titleType="DEED" />);
    await userEvent.click(formButton());
    expect(localStorage.setItem).toHaveBeenCalledWith('cas.requestTitleView', 'form');
    unmount();
    vi.mocked(localStorage.getItem).mockImplementation(key =>
      key === 'cas.requestTitleView' ? 'form' : null,
    );
    render(<Harness titleType="DEED" />);
    expect(screen.queryByTestId('paper')).toBeNull();
    expect(formButton()).toHaveAttribute('aria-pressed', 'true');
  });

  it('still opens when storage throws', () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<Harness titleType="DEED" />);
    expect(screen.getByTestId('paper')).toBeInTheDocument();
  });
});

describe('TitleDeedBlock for a condominium', () => {
  const blocks = () =>
    screen.getAllByTestId('condo-form').map(n => n.getAttribute('data-include') ?? 'all');

  it('draws the unit paper by default whatever the saved deed type, with only the โฉนด on offer', () => {
    render(<Harness titleType="NS3K" family="condo" />);
    expect(screen.getByTestId('paper')).toHaveAttribute('data-holder', 'ownerName');
    expect(screen.getByTestId('paper')).toHaveAttribute('data-variant', 'condo');
    expect(screen.getByTestId('summary')).toBeInTheDocument();
    expect(paperButton()).not.toBeDisabled();
    expect(screen.getByTestId('pills')).toHaveAttribute('data-codes', 'DEED');
  });

  it('puts the land titles, then the notes, each as its own block under the paper', () => {
    render(<Harness titleType="DEED" family="condo" />);
    expect(blocks()).toEqual(['titleNumber', 'notes']);
  });

  it('shows every field in one form in the form view, with no extra blocks', async () => {
    render(<Harness titleType="DEED" family="condo" />);
    await userEvent.click(formButton());
    expect(screen.queryByTestId('paper')).toBeNull();
    expect(blocks()).toEqual(['all']);
    expect(screen.getByTestId('condo-form')).toHaveAttribute('data-exclude', 'titleType');
  });
});
