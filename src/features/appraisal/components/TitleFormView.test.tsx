import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type FieldValues, type UseFormReturn } from 'react-hook-form';
import type { TFunction } from 'i18next';
import { makeTitleLandFields } from '@/features/request/configs/fields';
import { requestTitleDefault } from '@/features/request/schemas/form';
import { TitleFormView } from './TitleFormView';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}${JSON.stringify(options)}` : key,
  }),
}));

const requestFields = makeTitleLandFields(
  ((key: string) => key) as unknown as TFunction<'request'>,
);
const AREA_NAMES = { rai: 'areaRai', ngan: 'areaNgan', squareWa: 'areaSquareWa' };

let form: UseFormReturn<FieldValues>;
function RequestHarness({ titleType = 'DEED' }: { titleType?: string }) {
  form = useForm<FieldValues>({
    defaultValues: {
      titles: [
        {
          ...structuredClone(requestTitleDefault),
          collateralType: '01',
          titleType,
          titleNumber: '12',
          areaRai: 1,
          areaNgan: 1,
          areaSquareWa: 33.33,
        },
        { ...structuredClone(requestTitleDefault), collateralType: '01', titleNumber: '99' },
      ],
    },
  });
  return (
    <FormProvider {...form}>
      <TitleFormView
        fields={requestFields}
        scope={{ name: 'titles', index: 0 }}
        areaNames={AREA_NAMES}
        className=""
      />
    </FormProvider>
  );
}

describe('TitleFormView on the request page (one row of an array)', () => {
  it('has the three groups, with the document numbers and the area', () => {
    render(<RequestHarness />);
    expect(screen.getByText('titleEntry.sections.document.title')).toBeInTheDocument();
    expect(screen.getByText('titleEntry.sections.position.title')).toBeInTheDocument();
    expect(screen.getByText('titleEntry.sections.area.title')).toBeInTheDocument();
    expect(
      (screen.getByLabelText(/titleEntry\.fields\.titleNumber/) as HTMLInputElement).value,
    ).toBe('12');
  });

  it('reads and writes the scoped row, not another row, under the land page labels', async () => {
    render(<RequestHarness />);
    const book = screen.getByLabelText(/titleEntry\.fields\.bookNumber/);
    await userEvent.type(book, '7');
    expect(form.getValues('titles.0.bookNumber')).toBe('7');
    expect(form.getValues('titles.1.bookNumber')).not.toBe('7');
  });

  it('keeps the area under the request names and reads the total from its three parts', async () => {
    render(<RequestHarness />);
    // 1 rai + 1 ngan + 33.33 wa = 533.33 sq.wa, which is 1-1-33.33
    expect(screen.getByText(/titleEntry\.area\.total\{"wa":"533\.33"\}/)).toBeInTheDocument();
    expect(screen.getByText(/titleEntry\.area\.asRai\{"rnw":"1-1-33\.33"\}/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/titleEntry\.area\.rai/));
    await userEvent.type(screen.getByLabelText(/titleEntry\.area\.rai/), '2');
    expect(form.getValues('titles.0.areaRai')).toBe(2);
    expect(screen.getByText(/titleEntry\.area\.total\{"wa":"933\.33"\}/)).toBeInTheDocument();
  });

  it('shows the position fields the title type carries, as the config says', () => {
    const { unmount } = render(<RequestHarness titleType="DEED" />);
    expect(screen.getByLabelText(/titleEntry\.fields\.rawang/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/titleEntry\.fields\.aerialMapName/)).toBeNull();
    unmount();
    render(<RequestHarness titleType="NS3K" />);
    expect(screen.queryByLabelText(/titleEntry\.fields\.rawang/)).toBeNull();
    expect(screen.getByLabelText(/titleEntry\.fields\.aerialMapName/)).toBeInTheDocument();
  });
});

describe('TitleFormView field order', () => {
  it('lays the NS3K position fields out in the shared screen order', () => {
    render(<RequestHarness titleType="NS3K" />);
    const labels = ['aerialMapName', 'aerialMapNumber', 'mapSheetNumber', 'landParcelNumber'].map(
      name => screen.getByLabelText(new RegExp(`titleEntry\\.fields\\.${name}`)),
    );
    labels.slice(1).forEach((el, i) => {
      expect(labels[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});

describe('TitleFormView group headings', () => {
  function Headless({ show }: { show?: boolean }) {
    form = useForm<FieldValues>({
      defaultValues: {
        titles: [
          { ...structuredClone(requestTitleDefault), collateralType: '01', titleType: 'DEED' },
        ],
      },
    });
    return (
      <FormProvider {...form}>
        <TitleFormView
          fields={requestFields}
          scope={{ name: 'titles', index: 0 }}
          areaNames={AREA_NAMES}
          showGroupTitles={show}
        />
      </FormProvider>
    );
  }

  it('shows them by default, as the land page does', () => {
    render(<Headless />);
    expect(screen.getAllByRole('heading')).toHaveLength(3);
  });

  it('leaves them out when asked, keeping every field and the total', () => {
    render(<Headless show={false} />);
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
    expect(screen.getByLabelText(/titleEntry\.fields\.titleNumber/)).toBeInTheDocument();
    expect(screen.getByText(/titleEntry\.area\.total/)).toBeInTheDocument();
  });
});

describe('TitleFormView on the land page (the form is the title)', () => {
  it('totals from rai / ngan / wa, as the paper does, not from a stored total that may be stale', () => {
    function LandHarness() {
      form = useForm<FieldValues>({
        defaultValues: {
          titleType: 'DEED',
          titleNumber: '77',
          rai: 1,
          ngan: 0,
          squareWa: 5,
          totalSquareWa: 999,
        },
      });
      const fields = [
        { type: 'text-input', label: 'No', name: 'titleNumber' },
        { type: 'number-input', label: 'Rai', name: 'rai' },
        { type: 'number-input', label: 'Ngan', name: 'ngan' },
        { type: 'number-input', label: 'Wa', name: 'squareWa' },
      ] as never;
      return (
        <FormProvider {...form}>
          <TitleFormView fields={fields} />
        </FormProvider>
      );
    }
    render(<LandHarness />);
    expect(screen.getByText(/titleEntry\.area\.total\{"wa":"405\.00"\}/)).toBeInTheDocument();
  });
});
