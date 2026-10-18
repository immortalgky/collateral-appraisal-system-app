import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { requestTitleDefault } from '../schemas/form';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import { useAddressStore } from '@/shared/store';
import DopaAddressForm from './DopaAddressForm';
import TitleDocumentAddressForm from './TitleDocumentAddressForm';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
const formFields = vi.hoisted(() => ({
  calls: [] as { names: string[]; disabled?: boolean }[],
}));
vi.mock('@/shared/components/form', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/components/form')>()),
  FormFields: ({ fields, disabled }: { fields: { name: string }[]; disabled?: boolean }) => {
    formFields.calls.push({ names: fields.map(f => f.name), disabled });
    return <div data-testid="fields" />;
  },
}));
/** Whether the group of DOPA fields that holds `name` was last rendered disabled. */
const disabledOf = (name: string) =>
  [...formFields.calls].reverse().find(call => call.names.includes(name))?.disabled;

const a = {
  houseNumber: '9',
  projectName: 'P',
  moo: '2',
  soi: 'S',
  road: 'R',
  subDistrict: '100101',
  subDistrictName: 'บางกะปิ',
  district: '1001',
  districtName: 'ห้วยขวาง',
  province: '10',
  provinceName: 'กรุงเทพมหานคร',
  postcode: '10310',
};

let form: UseFormReturn<FieldValues>;
function Harness({
  titleAddress = a,
  dopaAddress = a,
  readOnly = false,
  children,
}: {
  titleAddress?: Record<string, string>;
  dopaAddress?: Record<string, string>;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  form = useForm<FieldValues>({
    defaultValues: {
      detail: { address: { ...a, houseNumber: 'REQ', subDistrict: '777' } },
      titles: [
        {
          ...structuredClone(requestTitleDefault),
          titleAddress: { ...requestTitleDefault.titleAddress, ...titleAddress },
          dopaAddress: { ...requestTitleDefault.dopaAddress, ...dopaAddress },
        },
      ],
    },
  });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...form}>{children}</FormProvider>
    </FormReadOnlyContext.Provider>
  );
}

/** A sub-district both masters have under the same names; DOPA has its own postcode for it. */
const dopaRow = {
  provinceCode: '10',
  provinceName: 'กรุงเทพมหานคร',
  districtCode: '1001',
  districtName: 'ห้วยขวาง',
  subDistrictCode: '100101',
  subDistrictName: 'บางกะปิ',
  postcode: '10311',
};
const otherDopaRow = {
  provinceCode: '50',
  provinceName: 'เชียงใหม่',
  districtCode: '5001',
  districtName: 'เมืองเชียงใหม่',
  subDistrictCode: '500101',
  subDistrictName: 'ศรีภูมิ',
  postcode: '50200',
};
/** A deed code no DOPA table has. */
const titleOnly = {
  ...a,
  subDistrict: '990101',
  subDistrictName: 'ตำบลเฉพาะโฉนด',
  district: '9901',
  province: '99',
};

beforeEach(() => {
  formFields.calls.length = 0;
  useAddressStore.setState({ dopaAddresses: [dopaRow, otherDopaRow], titleAddresses: [] });
});

describe('DopaAddressForm for a movable (no title document)', () => {
  const renderMovable = (dopaAddress: Record<string, string> = {}) =>
    render(
      <Harness titleAddress={titleOnly} dopaAddress={dopaAddress}>
        <DopaAddressForm index={0} isReadOnly={false} movable />
      </Harness>,
    );

  it('is headed as the property location, and copies the request address, locality from DOPA', async () => {
    renderMovable();
    expect(screen.getByText('titleAddress.propertyLocationHeader')).toBeInTheDocument();
    expect(screen.queryByText('titleSection.address.copyFromTitle')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'titleSection.address.useRequest' }));
    // the request's house number, not the title address's; its code '777' is looked up by name
    expect(form.getValues('titles.0.dopaAddress')).toMatchObject({
      houseNumber: 'REQ',
      subDistrict: '100101',
      subDistrictName: 'บางกะปิ',
      postcode: '10311',
    });
    expect(screen.queryByText('titleSection.address.dopaMissing')).toBeNull();
  });

  it('places a request by its DOPA code when the sub-district name agrees, whatever else was hydrated', async () => {
    renderMovable();
    form.setValue('detail.address', {
      ...a,
      houseNumber: 'REQ',
      subDistrict: '100101', // a DOPA code
      subDistrictName: 'บางกะปิ', // agrees with that row
      districtName: null, // looked up without regard to the master: not trusted
      provinceName: null,
    });
    await userEvent.click(screen.getByRole('button', { name: 'titleSection.address.useRequest' }));
    expect(form.getValues('titles.0.dopaAddress')).toMatchObject({
      houseNumber: 'REQ',
      subDistrict: '100101',
      subDistrictName: 'บางกะปิ',
      districtName: 'ห้วยขวาง',
      postcode: '10311',
    });
    expect(screen.queryByText('titleSection.address.dopaMissing')).toBeNull();
    expect(screen.queryByText('titleSection.address.districtDiffersRequest')).toBeNull();
  });

  it('ignores the administrative prefix and spaces when comparing the names', async () => {
    renderMovable();
    form.setValue('detail.address', {
      ...a,
      subDistrict: '100101',
      subDistrictName: 'แขวง บางกะปิ', // the row has 'บางกะปิ'
      districtName: null,
      provinceName: null,
    });
    await userEvent.click(screen.getByRole('button', { name: 'titleSection.address.useRequest' }));
    expect(form.getValues('titles.0.dopaAddress.subDistrict')).toBe('100101');
    expect(screen.queryByText('titleSection.address.dopaMissing')).toBeNull();
  });

  it.each([
    ["the code is DOPA's but the name is another place", { subDistrictName: 'ชื่อผิด' }],
    [
      'the request carries no names',
      { subDistrictName: null, districtName: null, provinceName: null },
    ],
  ])('goes by name, with the hint, when %s', async (_why, names) => {
    renderMovable();
    form.setValue('detail.address', { ...a, subDistrict: '100101', ...names });
    await userEvent.click(screen.getByRole('button', { name: 'titleSection.address.useRequest' }));
    expect(form.getValues('titles.0.dopaAddress.subDistrict')).toBe('');
    expect(screen.getByText('titleSection.address.dopaMissing')).toBeInTheDocument();
  });

  it('cannot copy while the DOPA master has not loaded, and says why', () => {
    useAddressStore.setState({ dopaAddresses: [] });
    renderMovable();
    const button = screen.getByRole('button', { name: 'titleSection.address.useRequest' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'titleSection.address.masterUnavailable');
  });

  it('cannot copy an empty request address, and says why (loading wins when both hold)', () => {
    renderMovable();
    const button = screen.getByRole('button', { name: 'titleSection.address.useRequest' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('title');
    act(() => form.setValue('detail.address', {}));
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'titleSection.address.requestAddressEmpty');
    act(() => useAddressStore.setState({ dopaAddresses: [] }));
    expect(button).toHaveAttribute('title', 'titleSection.address.masterUnavailable');
  });

  it('never writes the request address code when DOPA has no such place; it says so', async () => {
    useAddressStore.setState({ dopaAddresses: [otherDopaRow] });
    renderMovable();
    await userEvent.click(screen.getByRole('button', { name: 'titleSection.address.useRequest' }));
    const dopa = form.getValues('titles.0.dopaAddress');
    expect(dopa.houseNumber).toBe('REQ');
    expect(dopa.subDistrict).toBe('');
    expect(JSON.stringify(dopa)).not.toContain('777');
    expect(screen.getByText('titleSection.address.dopaMissing')).toBeInTheDocument();
  });

  it('asks before replacing a typed address, in words about the request address', async () => {
    renderMovable({ houseNumber: 'typed' });
    await userEvent.click(screen.getByRole('button', { name: 'titleSection.address.useRequest' }));
    expect(
      screen.getByText('titleSection.address.copyOverwriteMessageRequest'),
    ).toBeInTheDocument();
    expect(screen.queryByText('titleSection.address.copyOverwriteMessage')).toBeNull();
    expect(screen.getByText('titleSection.address.overwriteConfirm')).toBeInTheDocument();
  });

  it('keeps the DOPA heading and the title-address source for land', async () => {
    render(
      <Harness>
        <DopaAddressForm index={0} isReadOnly={false} />
      </Harness>,
    );
    expect(screen.getByText('titleAddress.dopaHeader')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'titleSection.address.copyFromTitle' }),
    ).toBeEnabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'titleSection.address.copyFromTitle' }),
    );
    expect(screen.getByText('titleSection.address.copyOverwriteMessage')).toBeInTheDocument();
  });
});

describe('DopaAddressForm "copy from the title-deed address"', () => {
  const copy = () => screen.getByRole('button', { name: 'titleSection.address.copyFromTitle' });
  const renderForm = (
    props: Parameters<typeof Harness>[0] extends infer P ? Omit<P, 'children'> : never = {},
  ) =>
    render(
      <Harness {...props}>
        <DopaAddressForm index={0} isReadOnly={!!props.readOnly} />
      </Harness>,
    );

  it('fills an empty DOPA address straight away, locality from the DOPA master and not the deed', async () => {
    renderForm({
      dopaAddress: {},
      titleAddress: { ...a, subDistrict: '880101', postcode: '10310' },
    });
    await userEvent.click(copy());
    expect(form.getValues('titles.0.dopaAddress')).toMatchObject({
      houseNumber: '9',
      projectName: 'P',
      moo: '2',
      soi: 'S',
      road: 'R',
      subDistrict: '100101',
      subDistrictName: 'บางกะปิ',
      district: '1001',
      districtName: 'ห้วยขวาง',
      province: '10',
      provinceName: 'กรุงเทพมหานคร',
      postcode: '10311',
    });
    expect(screen.queryByText('titleSection.address.copyOverwriteMessage')).toBeNull();
    expect(screen.queryByText('titleSection.address.dopaMissing')).toBeNull();
  });

  it('leaves the sub-district empty, with a hint, when DOPA has no such place; never the deed code', async () => {
    renderForm({ titleAddress: titleOnly, dopaAddress: {} });
    await userEvent.click(copy());
    const dopa = form.getValues('titles.0.dopaAddress');
    expect(dopa.houseNumber).toBe('9');
    expect(dopa.subDistrict).toBe('');
    expect(dopa.subDistrictName).toBe('');
    expect(JSON.stringify(dopa)).not.toContain('990101');
    expect(screen.getByText('titleSection.address.dopaMissing')).toBeInTheDocument();
    act(() => form.setValue('titles.0.dopaAddress.subDistrict', '500101'));
    expect(screen.queryByText('titleSection.address.dopaMissing')).toBeNull();
  });

  describe('when DOPA moved the sub-district to another district', () => {
    const moved = {
      ...a,
      subDistrict: '100907',
      subDistrictName: 'หนองบอน',
      districtName: 'พระโขนง',
      provinceName: 'กรุงเทพมหานคร',
    };
    const prawet = {
      provinceCode: '10',
      provinceName: 'กรุงเทพมหานคร',
      districtCode: '1032',
      districtName: 'ประเวศ',
      subDistrictCode: '103202',
      subDistrictName: 'หนองบอน',
      postcode: '10250',
    };

    it('fills the one place DOPA has under that name in the province, and warns that the district differs', async () => {
      useAddressStore.setState({ dopaAddresses: [prawet, otherDopaRow] });
      renderForm({ titleAddress: moved, dopaAddress: {} });
      await userEvent.click(copy());
      expect(form.getValues('titles.0.dopaAddress')).toMatchObject({
        subDistrict: '103202',
        district: '1032',
        districtName: 'ประเวศ',
      });
      expect(screen.getByText('titleSection.address.districtDiffersDopa')).toBeInTheDocument();
      expect(screen.queryByText('titleSection.address.dopaMissing')).toBeNull();
      // the warning goes once the user picks another sub-district
      act(() => form.setValue('titles.0.dopaAddress.subDistrict', '500101'));
      expect(screen.queryByText('titleSection.address.districtDiffersDopa')).toBeNull();
    });

    it('leaves the sub-district empty, with the usual hint, when the province has it under several districts', async () => {
      useAddressStore.setState({
        dopaAddresses: [prawet, { ...prawet, districtName: 'บางนา', subDistrictCode: '103299' }],
      });
      renderForm({ titleAddress: moved, dopaAddress: {} });
      await userEvent.click(copy());
      expect(form.getValues('titles.0.dopaAddress.subDistrict')).toBe('');
      expect(screen.getByText('titleSection.address.dopaMissing')).toBeInTheDocument();
      expect(screen.queryByText('titleSection.address.districtDiffersDopa')).toBeNull();
    });

    it('says nothing about the district after an exact match', async () => {
      renderForm({ dopaAddress: {} });
      await userEvent.click(copy());
      expect(screen.queryByText('titleSection.address.districtDiffersDopa')).toBeNull();
    });
  });

  it('cannot copy while the DOPA master has not loaded, so the locality is never left half-done', () => {
    useAddressStore.setState({ dopaAddresses: [] });
    renderForm({ dopaAddress: { subDistrict: '500101', subDistrictName: 'ศรีภูมิ' } });
    expect(copy()).toBeDisabled();
  });

  it('asks before replacing an address that has values, and leaves it if declined', async () => {
    renderForm({ dopaAddress: { ...a, road: 'X' } });
    await userEvent.click(copy());
    expect(
      await screen.findByText('titleSection.address.copyOverwriteMessage'),
    ).toBeInTheDocument();
    expect(form.getValues('titles.0.dopaAddress.road')).toBe('X');
    await userEvent.click(screen.getByText('common:actions.cancel'));
    expect(form.getValues('titles.0.dopaAddress.road')).toBe('X');
  });

  it('replaces it once confirmed', async () => {
    renderForm({ dopaAddress: { ...a, road: 'X' } });
    await userEvent.click(copy());
    await userEvent.click(await screen.findByText('titleSection.address.copyOverwriteConfirm'));
    expect(form.getValues('titles.0.dopaAddress.road')).toBe('R');
  });

  it('is a one-time copy: later edits to the deed address do not follow, and the fields stay editable', async () => {
    renderForm({ dopaAddress: {} });
    await userEvent.click(copy());
    expect(disabledOf('dopaAddress.houseNumber')).toBe(false);
    expect(disabledOf('dopaAddress.subDistrict')).toBe(false);
    act(() => form.setValue('titles.0.titleAddress.road', 'Changed'));
    expect(form.getValues('titles.0.dopaAddress.road')).toBe('R');
    act(() => {
      form.setValue('titles.0.titleAddress.subDistrict', '500101');
      form.setValue('titles.0.titleAddress.provinceName', 'เชียงใหม่');
    });
    expect(form.getValues('titles.0.dopaAddress.subDistrict')).toBe('100101');
  });

  it('writes nothing on opening, and does not dirty the form', () => {
    renderForm();
    expect(form.formState.isDirty).toBe(false);
  });

  it('is disabled while the deed address is empty', () => {
    renderForm({ titleAddress: {}, dopaAddress: {} });
    expect(copy()).toBeDisabled();
  });

  it('has no button when read-only, and its fields are disabled', () => {
    renderForm({ readOnly: true, dopaAddress: { ...a, road: 'different' } });
    expect(screen.queryByRole('button', { name: 'titleSection.address.copyFromTitle' })).toBeNull();
    expect(form.getValues('titles.0.dopaAddress.road')).toBe('different');
    expect(disabledOf('dopaAddress.houseNumber')).toBe(true);
  });
});

describe('TitleDocumentAddressForm "use the request address"', () => {
  const useRequest = () => screen.getByRole('button', { name: 'titleSection.address.useRequest' });
  // The request's address is from the DOPA master (code 777...); the Title master numbers the same
  // place 300101.
  const titleRow = {
    provinceCode: '30',
    provinceName: 'กรุงเทพมหานคร',
    districtCode: '3001',
    districtName: 'ห้วยขวาง',
    subDistrictCode: '300101',
    subDistrictName: 'บางกะปิ',
    postcode: '10310',
  };
  beforeEach(() => useAddressStore.setState({ titleAddresses: [titleRow] }));

  it('cannot copy an empty request address, which would only blank a typed one', () => {
    render(
      <Harness titleAddress={a} dopaAddress={{}}>
        <TitleDocumentAddressForm index={0} isReadOnly={false} />
      </Harness>,
    );
    expect(useRequest()).toBeEnabled();
    act(() => form.setValue('detail.address', {}));
    expect(useRequest()).toBeDisabled();
  });

  it('says why an empty request address cannot be copied', () => {
    render(
      <Harness titleAddress={a} dopaAddress={{}}>
        <TitleDocumentAddressForm index={0} isReadOnly={false} />
      </Harness>,
    );
    expect(useRequest()).not.toHaveAttribute('title');
    act(() => form.setValue('detail.address', {}));
    expect(useRequest()).toHaveAttribute('title', 'titleSection.address.requestAddressEmpty');
  });

  it('cannot copy while the Title master has not loaded, and says why', () => {
    useAddressStore.setState({ titleAddresses: [] });
    render(
      <Harness titleAddress={{}} dopaAddress={{}}>
        <TitleDocumentAddressForm index={0} isReadOnly={false} />
      </Harness>,
    );
    expect(useRequest()).toBeDisabled();
    expect(useRequest()).toHaveAttribute('title', 'titleSection.address.masterUnavailable');
  });

  it('fills an empty address straight away, with no question', async () => {
    render(
      <Harness titleAddress={{}} dopaAddress={{}}>
        <TitleDocumentAddressForm index={0} isReadOnly={false} />
      </Harness>,
    );
    await userEvent.click(useRequest());
    expect(form.getValues('titles.0.titleAddress.houseNumber')).toBe('REQ');
    // the locality is the Title master's row for that place, not the request's own code
    expect(form.getValues('titles.0.titleAddress')).toMatchObject({
      subDistrict: '300101',
      district: '3001',
      province: '30',
    });
    expect(screen.queryByText('titleSection.address.overwriteMessage')).toBeNull();
    expect(screen.queryByText('titleSection.address.titleMissing')).toBeNull();
  });

  it('leaves the sub-district empty, with a hint, when the Title master has no such place', async () => {
    useAddressStore.setState({ titleAddresses: [{ ...titleRow, subDistrictName: 'อื่น' }] });
    render(
      <Harness titleAddress={{}} dopaAddress={{}}>
        <TitleDocumentAddressForm index={0} isReadOnly={false} />
      </Harness>,
    );
    await userEvent.click(useRequest());
    const title = form.getValues('titles.0.titleAddress');
    expect(title.houseNumber).toBe('REQ');
    expect(title.subDistrict).toBe('');
    expect(JSON.stringify(title)).not.toContain('777');
    expect(screen.getByText('titleSection.address.titleMissing')).toBeInTheDocument();
    act(() => form.setValue('titles.0.titleAddress.subDistrict', '300101'));
    expect(screen.queryByText('titleSection.address.titleMissing')).toBeNull();
  });

  it("warns when the Title master has the request's sub-district under another district", async () => {
    // the request (DOPA side) says พระโขนง; the Title master has หนองบอน under ประเวศ
    useAddressStore.setState({
      titleAddresses: [
        {
          ...titleRow,
          subDistrictCode: '103202',
          subDistrictName: 'หนองบอน',
          districtName: 'ประเวศ',
        },
      ],
    });
    function Moved() {
      form = useForm<FieldValues>({
        defaultValues: {
          detail: {
            address: {
              ...a,
              subDistrict: '100907',
              subDistrictName: 'หนองบอน',
              districtName: 'พระโขนง',
              provinceName: 'กรุงเทพมหานคร',
            },
          },
          titles: [{ ...structuredClone(requestTitleDefault) }],
        },
      });
      return (
        <FormProvider {...form}>
          <TitleDocumentAddressForm index={0} isReadOnly={false} />
        </FormProvider>
      );
    }
    render(<Moved />);
    await userEvent.click(useRequest());
    expect(form.getValues('titles.0.titleAddress.subDistrict')).toBe('103202');
    expect(screen.getByText('titleSection.address.districtDiffersTitle')).toBeInTheDocument();
  });

  it('asks before replacing an address that has values, and leaves it if declined', async () => {
    render(
      <Harness>
        <TitleDocumentAddressForm index={0} isReadOnly={false} />
      </Harness>,
    );
    await userEvent.click(useRequest());
    expect(await screen.findByText('titleSection.address.overwriteMessage')).toBeInTheDocument();
    expect(form.getValues('titles.0.titleAddress.houseNumber')).toBe('9');
    await userEvent.click(screen.getByText('common:actions.cancel'));
    expect(form.getValues('titles.0.titleAddress.houseNumber')).toBe('9');
  });

  it('replaces it once confirmed', async () => {
    render(
      <Harness>
        <TitleDocumentAddressForm index={0} isReadOnly={false} />
      </Harness>,
    );
    await userEvent.click(useRequest());
    await userEvent.click(await screen.findByText('titleSection.address.overwriteConfirm'));
    expect(form.getValues('titles.0.titleAddress.houseNumber')).toBe('REQ');
    expect(form.getValues('titles.0.titleAddress.subDistrict')).toBe('300101');
  });

  it('has no shortcut when read-only', () => {
    render(
      <Harness readOnly>
        <TitleDocumentAddressForm index={0} isReadOnly />
      </Harness>,
    );
    expect(screen.queryByRole('button', { name: 'titleSection.address.useRequest' })).toBeNull();
  });
});
