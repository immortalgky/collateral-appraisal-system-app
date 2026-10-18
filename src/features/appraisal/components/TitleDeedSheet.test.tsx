import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type FieldValues, type UseFormReturn } from 'react-hook-form';
import type { TFunction } from 'i18next';
import { makeTitleCondoFields, makeTitleLandFields } from '@/features/request/configs/fields';
import { requestTitleDefault } from '@/features/request/schemas/form';
import { TitleDeedSheet } from './TitleDeedSheet';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

const requestFields = makeTitleLandFields(
  ((key: string) => key) as unknown as TFunction<'request'>,
);
const AREA_NAMES = { rai: 'areaRai', ngan: 'areaNgan', squareWa: 'areaSquareWa' };

let form: UseFormReturn<FieldValues>;

/** The request page's shape: the title is one row of `titles`. */
function RequestHarness({
  titleType = 'DEED',
  holder = true,
}: {
  titleType?: string;
  holder?: boolean;
}) {
  form = useForm<FieldValues>({
    defaultValues: {
      titles: [
        {
          ...structuredClone(requestTitleDefault),
          collateralType: '01',
          titleType,
          titleNumber: '12',
        },
        {
          ...structuredClone(requestTitleDefault),
          collateralType: '01',
          titleType: 'DEED',
          titleNumber: '99',
        },
      ],
    },
  });
  return (
    <FormProvider {...form}>
      <TitleDeedSheet
        fields={requestFields}
        scope={{ name: 'titles', index: 0 }}
        areaNames={AREA_NAMES}
        holderField={holder ? requestFields.find(f => f.name === 'ownerName') : undefined}
      />
    </FormProvider>
  );
}

/** The land page's shape: the form IS the title, with its own area names. */
function LandHarness() {
  form = useForm<FieldValues>({
    defaultValues: { titleType: 'DEED', titleNumber: '77', rai: 1, ngan: 2, squareWa: 30 },
  });
  const fields = [
    { type: 'text-input', label: 'No', name: 'titleNumber' },
    {
      type: 'text-input',
      label: 'Rawang',
      name: 'rawang',
      showWhen: { field: 'titleType', is: ['DEED'], operator: 'in' },
    },
    { type: 'number-input', label: 'Rai', name: 'rai' },
    { type: 'number-input', label: 'Ngan', name: 'ngan' },
    { type: 'number-input', label: 'Wa', name: 'squareWa' },
  ] as never;
  return (
    <FormProvider {...form}>
      <TitleDeedSheet fields={fields} />
    </FormProvider>
  );
}

describe('TitleDeedSheet on the request page (one row of an array)', () => {
  it('reads and writes the scoped row, not another row', async () => {
    render(<RequestHarness />);
    const number = screen.getByLabelText(/^titleEntry\.deed\.number\*?$/) as HTMLInputElement;
    expect(number.value).toBe('12');
    await userEvent.clear(number);
    await userEvent.type(number, '555');
    expect(form.getValues('titles.0.titleNumber')).toBe('555');
    expect(form.getValues('titles.1.titleNumber')).toBe('99');
  });

  it('keeps the holder as a real blank bound to ownerName, labelled for the paper', async () => {
    render(<RequestHarness />);
    const holder = screen.getByLabelText(/^titleEntry\.deed\.issuedTo\*?$/);
    await userEvent.type(holder, 'Somchai');
    expect(form.getValues('titles.0.ownerName')).toBe('Somchai');
  });

  it('labels the holder "name" on the น.ส.3 family', () => {
    render(<RequestHarness titleType="NS3K" />);
    expect(screen.getByLabelText(/^titleEntry\.deed\.holderName\*?$/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^titleEntry\.deed\.issuedTo\*?$/)).toBeNull();
  });

  it('draws the holder as a printed bar when the page keeps none (the land page)', () => {
    render(<RequestHarness holder={false} />);
    expect(screen.queryByLabelText(/^titleEntry\.deed\.issuedTo\*?$/)).toBeNull();
    expect(screen.getByText('titleEntry.deed.issuedTo')).toBeInTheDocument();
  });

  it('stores the area parts as numbers under the DTO names and totals them', async () => {
    render(<RequestHarness />);
    await userEvent.type(screen.getByLabelText('fields.rai'), '1');
    await userEvent.type(screen.getByLabelText('fields.ngan'), '2');
    await userEvent.type(screen.getByLabelText('fields.sqWa'), '30');
    expect(form.getValues('titles.0.areaRai')).toBe(1);
    expect(form.getValues('titles.0.areaNgan')).toBe(2);
    expect(form.getValues('titles.0.areaSquareWa')).toBe(30);
    // 1 rai 2 ngan 30 wa = 400 + 200 + 30
    expect(screen.getByText('630.00')).toBeInTheDocument();
  });

  it('shows only the position blanks the title type carries', () => {
    const { unmount } = render(<RequestHarness titleType="DEED" />);
    expect(screen.queryByLabelText(/^titleEntry\.deed\.rawang\*?$/)).not.toBeNull();
    expect(screen.queryByLabelText(/^titleEntry\.deed\.mapSheet\*?$/)).toBeNull();
    unmount();
    render(<RequestHarness titleType="NS3K" />);
    expect(screen.queryByLabelText(/^titleEntry\.deed\.rawang\*?$/)).toBeNull();
    expect(screen.queryByLabelText(/^titleEntry\.deed\.mapSheet\*?$/)).not.toBeNull();
  });

  it('names its blanks by their full path so the "still missing" list can find them', () => {
    render(<RequestHarness />);
    expect(document.querySelector('[data-field="titles.0.titleNumber"]')).not.toBeNull();
    expect(document.querySelector('[data-field="titles.0.ownerName"]')).not.toBeNull();
  });

  it('marks the holder required, from the field config', () => {
    render(<RequestHarness />);
    const label = screen.getByText('titleEntry.deed.issuedTo').closest('label');
    expect(label?.textContent).toContain('*');
  });
});

describe('TitleDeedSheet on the land page (the form is the title)', () => {
  it('still binds flat names and totals the area from its own part names', async () => {
    render(<LandHarness />);
    expect((screen.getByLabelText(/^titleEntry\.deed\.number\*?$/) as HTMLInputElement).value).toBe(
      '77',
    );
    await userEvent.type(screen.getByLabelText(/^titleEntry\.deed\.number\*?$/), '8');
    expect(form.getValues('titleNumber')).toBe('778');
    // 1 rai 2 ngan 30 wa = 400 + 200 + 30
    expect(screen.getByText('630.00')).toBeInTheDocument();
  });

  it('keeps the holder as printed bars and puts no data-field on its blanks', () => {
    render(<LandHarness />);
    expect(screen.queryByLabelText(/^titleEntry\.deed\.issuedTo\*?$/)).toBeNull();
    expect(document.querySelector('[data-field]')).toBeNull();
  });
});

describe('TitleDeedSheet as the condominium unit paper (อ.ช.2)', () => {
  const condoFields = makeTitleCondoFields(
    ((key: string) => key) as unknown as TFunction<'request'>,
  );
  function CondoHarness({ numbers }: { numbers?: React.ReactNode }) {
    form = useForm<FieldValues>({
      defaultValues: {
        titles: [
          {
            ...structuredClone(requestTitleDefault),
            collateralType: '08',
            titleType: 'DEED',
            titleNumber: '1234, 1235',
            condoName: 'Tower',
          },
        ],
      },
    });
    return (
      <FormProvider {...form}>
        <TitleDeedSheet
          fields={condoFields}
          scope={{ name: 'titles', index: 0 }}
          holderField={condoFields.find(f => f.name === 'ownerName')}
          variant="condo"
          landTitleNumbers={numbers}
          address={{ subDistrict: 'Bang Na', district: 'Bang Na', province: 'Bangkok' }}
        />
      </FormProvider>
    );
  }
  const label = (key: string) => new RegExp(`^titleEntry\\.deed\\.${key}\\*?$`);

  it('has the unit blanks bound to the condominium fields, and the holder', async () => {
    render(<CondoHarness />);
    expect(
      screen.getByRole('article', { name: 'titleEntry.deed.condo.title' }),
    ).toBeInTheDocument();
    expect((screen.getByLabelText(/^fields\.condoName\*?$/) as HTMLInputElement).value).toBe(
      'Tower',
    );
    await userEvent.type(screen.getByLabelText(/^fields\.roomNumber\*?$/), '12A');
    await userEvent.type(screen.getByLabelText(/^fields\.floorNumber\*?$/), '4');
    await userEvent.type(screen.getByLabelText(/^fields\.buildingNumber\*?$/), 'B');
    await userEvent.type(screen.getByLabelText(/^fields\.condoRegistrationNumber\*?$/), '77');
    await userEvent.type(screen.getByLabelText(label('issuedTo')), 'Somchai');
    expect(form.getValues('titles.0')).toMatchObject({
      roomNumber: '12A',
      floorNumber: '4',
      buildingNumber: 'B',
      condoRegistrationNumber: '77',
      ownerName: 'Somchai',
    });
  });

  it('keys the unit area as a number', async () => {
    render(<CondoHarness />);
    await userEvent.type(screen.getByLabelText(/^fields\.usageAreaSqM\*?$/), '45.5');
    expect(form.getValues('titles.0.usableArea')).toBe(45.5);
  });

  it('shows the land title numbers through the slot, not as an input, and marks them required', () => {
    render(<CondoHarness numbers={<span data-testid="slot">1234, 1235</span>} />);
    expect(screen.getByTestId('slot')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('1234, 1235')).toBeNull();
    expect(screen.getByText('titleEntry.deed.condo.landDeed').textContent).toContain('*');
  });

  it('writes the place from the title address as recorded lines, never as fields', () => {
    render(<CondoHarness />);
    expect(screen.getAllByText('Bang Na').length).toBeGreaterThan(0);
    expect(screen.getByText('Bangkok')).toBeInTheDocument();
  });
});
