import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { FormProvider, useForm, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { requestTitleDefault, type RequestTitleDtoType } from '../../schemas/form';
import { TitleDrawer, type TitleDrawerProps } from './TitleDrawer';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}${JSON.stringify(options)}` : key,
  }),
}));
vi.mock('@/shared/components/form', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/components/form')>()),
  FormFields: () => <div data-testid="form-fields" />,
}));
// The save-time check asks the collateral master through this client
const lookupGet = vi.hoisted(() => vi.fn());
// The appraisals still open on the same key: a separate endpoint, answering [] unless a test says
const inFlightGet = vi.hoisted(() => vi.fn());
vi.mock('@shared/api/axiosInstance', () => ({
  default: {
    get: (url: string, config: unknown) =>
      url === '/appraisals/in-progress-by-collateral'
        ? inFlightGet(url, config)
        : lookupGet(url, config),
  },
}));
const scrollToField = vi.hoisted(() => vi.fn());
vi.mock('@/shared/components/form/utils', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/components/form/utils')>()),
  scrollToField,
}));
vi.mock('../../forms/TitleBuildingForm', () => ({ default: () => <div data-testid="building" /> }));
vi.mock('../../forms/TitleCondoForm', () => ({ default: () => <div data-testid="condo" /> }));
vi.mock('../../forms/TitleMachineForm', () => ({ default: () => <div data-testid="machine" /> }));
vi.mock('../../forms/TitleVehicleForm', () => ({ default: () => <div data-testid="vehicle" /> }));
vi.mock('../../forms/TitleVesselForm', () => ({ default: () => <div data-testid="vessel" /> }));
vi.mock('../../forms/TitleDocumentAddressForm', () => ({
  default: () => <div data-testid="title-address" />,
}));
vi.mock('../../forms/DopaAddressForm', () => ({
  default: () => <div data-testid="dopa-address" />,
}));
vi.mock('../DocumentUploader', () => ({
  TitleDocumentsSection: (props: { index: number; heading: string }) => (
    <div data-testid="docs" data-index={props.index}>
      {props.heading}
    </div>
  ),
}));
vi.mock('./TitleDeedBlock', () => ({ TitleDeedBlock: () => <div data-testid="deed" /> }));
vi.mock('./DeedTypePills', () => ({ DeedTypePills: () => <div data-testid="pills" /> }));
vi.mock('@/shared/utils/parameterUtils', () => ({
  useParametersByGroup: () => [{ code: '01', description: 'Land' }],
}));

const address = { houseNumber: '9', subDistrict: '100101', district: '1001', province: '10' };
const completeLand = (over: Partial<RequestTitleDtoType> = {}): RequestTitleDtoType => ({
  ...structuredClone(requestTitleDefault),
  collateralType: '01',
  titleType: 'DEED',
  titleNumber: '12345',
  areaSquareWa: 50,
  ownerName: 'o',
  notes: 'n',
  titleAddress: { ...requestTitleDefault.titleAddress, ...address },
  dopaAddress: { ...requestTitleDefault.dopaAddress, ...address },
  ...over,
});

let form: UseFormReturn<FieldValues>;
const handlers = {
  onClose: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
  onSaveAndAdd: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
};

function Harness({
  title = completeLand(),
  props = {},
  submitted = false,
  before = [],
  prevAppraisalId,
}: {
  title?: RequestTitleDtoType;
  props?: Partial<TitleDrawerProps>;
  submitted?: boolean;
  /** Rows ahead of the title, so it is not at index 0 (a reorder or a delete moves it). */
  before?: RequestTitleDtoType[];
  /** The prior appraisal the request already follows. */
  prevAppraisalId?: string;
}) {
  form = useForm<FieldValues>({
    defaultValues: {
      titles: [...before, title],
      meta: { isSubmitted: submitted },
      detail: { prevAppraisalId },
    },
  });
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FormProvider {...form}>
          <TitleDrawer
            index={before.length}
            position={2}
            total={4}
            readOnly={false}
            onClose={handlers.onClose}
            onSave={handlers.onSave}
            onCancel={handlers.onCancel}
            onSaveAndAdd={handlers.onSaveAndAdd}
            onPrev={handlers.onPrev}
            onNext={handlers.onNext}
            {...props}
          />
        </FormProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  lookupGet.mockReset();
  inFlightGet.mockReset();
  inFlightGet.mockResolvedValue({ data: [] });
  Object.values(handlers).forEach(fn => fn.mockClear());
  scrollToField.mockClear();
});

describe('TitleDrawer focus container', () => {
  it('switches the global outline off inline on its tabindex -1 dialog, which takes the focus', () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('tabindex', '-1');
    // the `outline-none` class loses to the unlayered :focus-visible rule; only inline wins
    expect(dialog.style.outlineStyle).toBe('none');
  });
});

describe('TitleDrawer header', () => {
  it('names the title by its type and number, and says where it is in the list', () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { name: 'Land · 12345' })).toBeInTheDocument();
    expect(screen.getByText('titleSection.drawer.position{"pos":2,"total":4}')).toBeInTheDocument();
  });

  it('names a movable by its plate', () => {
    render(
      <Harness
        title={{
          ...structuredClone(requestTitleDefault),
          collateralType: '10',
          licensePlateNumber: 'กข 1234',
        }}
      />,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('10 · กข 1234');
  });

  it('names a condominium by the first of its land titles and how many more', () => {
    render(
      <Harness
        title={{
          ...structuredClone(requestTitleDefault),
          collateralType: '08',
          titleNumber: '1234, 1235; 1236-1250',
        }}
      />,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('08 · 1234 +2');
  });

  it('draws previous and next as outline pills', () => {
    render(<Harness />);
    for (const name of [/titleSection\.drawer\.prev/, /titleSection\.drawer\.next/]) {
      const button = screen.getByRole('button', { name });
      expect(button.className).toContain('rounded-full!');
      expect(button.className).toContain('border');
    }
  });

  it('calls a title with no type new', () => {
    render(<Harness title={structuredClone(requestTitleDefault)} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'titleSection.drawer.newTitle',
    );
  });

  it('turns previous and next off where there is none', () => {
    render(<Harness props={{ onPrev: undefined }} />);
    expect(screen.getByRole('button', { name: /titleSection\.drawer\.prev/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /titleSection\.drawer\.next/ })).toBeEnabled();
  });

  it('moves with previous and next', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /titleSection\.drawer\.next/ }));
    await userEvent.click(screen.getByRole('button', { name: /titleSection\.drawer\.prev/ }));
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
    expect(handlers.onPrev).toHaveBeenCalledTimes(1);
  });
});

describe('the documents section', () => {
  const documents = { getOrCreateSession: async () => 'session', requestId: 'req-1' };

  it('is the last block of the body, after the addresses, for this title', () => {
    render(<Harness props={{ documents }} />);
    const section = screen.getByTestId('docs');
    expect(section).toHaveAttribute('data-index', '0');
    expect(section).toHaveTextContent('titleSection.drawer.section.documents');
    expect(
      screen.getByTestId('title-address').compareDocumentPosition(section) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('is there for a title not yet saved: no "save first"', () => {
    render(
      <Harness
        title={{ ...structuredClone(requestTitleDefault), collateralType: '01' }}
        props={{ documents }}
      />,
    );
    expect(screen.getByTestId('docs')).toBeInTheDocument();
  });

  it('is left out where the page gives no upload session', () => {
    render(<Harness />);
    expect(screen.queryByTestId('docs')).toBeNull();
  });
});

describe('what is still missing', () => {
  it('lists each missing field and takes focus to it by its full path', async () => {
    render(<Harness title={completeLand({ ownerName: '', titleNumber: '' })} />);
    const strip = screen.getByText('titleSection.drawer.missing{"count":2}').parentElement!;
    expect(strip).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'fields.owner' }));
    expect(scrollToField).toHaveBeenCalledWith('titles.0.ownerName');
  });

  it('tags the two addresses apart', () => {
    render(
      <Harness
        title={completeLand({
          titleAddress: { ...requestTitleDefault.titleAddress, ...address, subDistrict: '' },
          dopaAddress: { ...requestTitleDefault.dopaAddress, ...address, subDistrict: '' },
        })}
      />,
    );
    expect(
      screen.getByRole('button', { name: /fields\.subDistrict.*titleSection\.address\.tagTitle/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /fields\.subDistrict.*titleSection\.address\.tagDopa/ }),
    ).toBeInTheDocument();
  });

  it('says so when nothing is missing, and updates as the title is filled in', () => {
    render(<Harness title={completeLand({ ownerName: '' })} />);
    expect(screen.getByText('titleSection.drawer.missing{"count":1}')).toBeInTheDocument();
    act(() => form.setValue('titles.0.ownerName', 'someone'));
    expect(screen.getByText('titleSection.drawer.complete')).toBeInTheDocument();
  });

  it('shows neither when read-only', () => {
    render(<Harness title={completeLand({ ownerName: '' })} props={{ readOnly: true }} />);
    expect(screen.queryByText(/titleSection\.drawer\.missing/)).toBeNull();
    expect(screen.queryByText('titleSection.drawer.complete')).toBeNull();
  });
});

describe('closing', () => {
  it('closes from the cross, the scrim and Escape — each leaves without saving (onClose)', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'common:actions.close' }));
    await userEvent.keyboard('{Escape}');
    // the scrim is its own layer behind the panel
    await userEvent.click(document.querySelector('[data-drawer-backdrop]') as HTMLElement);
    expect(handlers.onClose).toHaveBeenCalledTimes(3);
    expect(handlers.onCancel).not.toHaveBeenCalled();
  });

  it('does not close on the Escape of a Headless UI modal opened from inside it (notes, move)', () => {
    render(<Harness />);
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('data-headlessui-state', 'open');
    document.body.appendChild(modal);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(handlers.onClose).not.toHaveBeenCalled();
    modal.remove();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on Escape that a field already used, or while a confirm dialog is up', () => {
    render(<Harness />);
    const used = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
    used.preventDefault();
    document.dispatchEvent(used);
    expect(handlers.onClose).not.toHaveBeenCalled();

    const dialog = document.createElement('dialog');
    dialog.className = 'modal modal-open';
    document.body.appendChild(dialog);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    dialog.remove();
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it('does not close when a press that began inside the panel ends on the scrim', async () => {
    render(<Harness />);
    const scrim = document.querySelector('[data-drawer-backdrop]') as HTMLElement;
    const panel = screen.getByRole('dialog');
    await userEvent.pointer([
      { keys: '[MouseLeft>]', target: panel },
      { keys: '[/MouseLeft]', target: scrim },
    ]);
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it('offers cancel, save and save-and-add-next', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'common:actions.cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'titleSection.drawer.saveAndAdd' }));
    await userEvent.click(screen.getByRole('button', { name: 'common:actions.save' }));
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);
    expect(handlers.onSaveAndAdd).toHaveBeenCalledTimes(1);
    // Save is its own action: it keeps the title, where ✕ / Esc may drop a blank new one.
    expect(handlers.onSave).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it('is view-only when read-only: one Close button', () => {
    render(<Harness props={{ readOnly: true }} />);
    expect(screen.queryByRole('button', { name: 'common:actions.save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'titleSection.drawer.saveAndAdd' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'common:actions.close' }).length).toBe(2);
  });

  it('has no "previously appraised" banner or "use prior data" button, editable or not', () => {
    render(<Harness />);
    expect(screen.queryByText('Previously appraised')).toBeNull();
    expect(screen.queryByText('Use prior data')).toBeNull();
  });
});

describe('what each type shows', () => {
  const type = (collateralType: string) => ({
    ...structuredClone(requestTitleDefault),
    collateralType,
  });
  const ids = () =>
    [...document.querySelectorAll('[data-testid]')].map(n => n.getAttribute('data-testid'));

  it('land: the deed block and both addresses', () => {
    render(<Harness title={type('01')} />);
    expect(ids()).toEqual(expect.arrayContaining(['deed', 'title-address', 'dopa-address']));
    expect(ids()).not.toContain('building');
  });

  it('land with building: the deed block, the building fields and both addresses', () => {
    render(<Harness title={type('02')} />);
    expect(ids()).toEqual(expect.arrayContaining(['deed', 'building', 'title-address']));
  });

  it('puts the addresses before the building fields', () => {
    render(<Harness title={type('02')} />);
    expect(ids().indexOf('title-address')).toBeLessThan(ids().indexOf('building'));
  });

  it('building only: no deed', () => {
    render(<Harness title={type('05')} />);
    expect(ids()).toContain('building');
    expect(ids()).not.toContain('deed');
  });

  it('condo: the deed block, with its paper and its fields', () => {
    render(<Harness title={type('08')} />);
    expect(ids()).toContain('deed');
  });

  it.each([
    ['10', 'vehicle'],
    ['11', 'machine'],
    ['12', 'vessel'],
  ])('%s: its own fields, and still both addresses (the schema requires them)', (code, id) => {
    render(<Harness title={type(code)} />);
    expect(ids()).toEqual(expect.arrayContaining([id, 'title-address', 'dopa-address']));
  });

  it('no type yet: only a prompt to choose one', () => {
    render(<Harness title={type('')} />);
    expect(screen.getByText('titleOptions.noCollateralType')).toBeInTheDocument();
    expect(ids()).not.toContain('title-address');
  });
});

describe('choosing a type in the editor', () => {
  it('makes a land title a deed when it has no type yet, but not on opening', () => {
    render(<Harness title={{ ...structuredClone(requestTitleDefault), collateralType: '' }} />);
    expect(form.getValues('titles.0.titleType')).toBe('');
    act(() => form.setValue('titles.0.collateralType', '01'));
    expect(form.getValues('titles.0.titleType')).toBe('DEED');
  });

  it('makes a condominium a deed when it has no type yet, and leaves a saved legacy type alone', () => {
    render(<Harness title={{ ...structuredClone(requestTitleDefault), collateralType: '' }} />);
    act(() => form.setValue('titles.0.collateralType', '08'));
    expect(form.getValues('titles.0.titleType')).toBe('DEED');
    act(() => form.setValue('titles.0.titleType', 'NS3K'));
    act(() => form.setValue('titles.0.collateralType', '28'));
    expect(form.getValues('titles.0.titleType')).toBe('NS3K');
  });

  it('leaves a type that is already chosen alone', () => {
    render(<Harness title={{ ...structuredClone(requestTitleDefault), collateralType: '' }} />);
    act(() => form.setValue('titles.0.titleType', 'NS3K'));
    act(() => form.setValue('titles.0.collateralType', '01'));
    expect(form.getValues('titles.0.titleType')).toBe('NS3K');
  });

  it('does not touch the title type of a building or a movable', () => {
    render(<Harness title={{ ...structuredClone(requestTitleDefault), collateralType: '' }} />);
    act(() => form.setValue('titles.0.collateralType', '10'));
    expect(form.getValues('titles.0.titleType')).toBe('');
  });
});

describe('TitleDrawer save: a title the collateral master already knows', () => {
  // The backend's flat LookupCollateralMasterResult
  const known = {
    id: 'm1',
    collateralType: 'L',
    createdAt: '2026-01-01T00:00:00',
    engagementCount: 3,
    lastAppraisedValue: 5_250_000,
    priorAppraisalCompanyIds: [],
    landDetail: {
      lastAppraisalId: 'a1',
      lastAppraisalNumber: 'APP-2026-001',
      lastAppraisedDate: '2026-03-15T00:00:00',
      appraisalValue: 5_250_000,
    },
  };
  const save = () => screen.getByRole('button', { name: 'common:actions.save' });
  const saveAndAdd = () => screen.getByRole('button', { name: 'titleSection.drawer.saveAndAdd' });
  const dialogTitle = () => screen.queryByText('titleSection.priorCheck.title');
  const clickAndSettle = async (button: HTMLElement) => {
    await act(async () => {
      fireEvent.click(button);
    });
  };

  it('shows what is on record and saves nothing until the user decides', async () => {
    lookupGet.mockResolvedValue({ data: known });
    render(<Harness />);
    await clickAndSettle(save());
    expect(dialogTitle()).toBeInTheDocument();
    // The report number is plain text: no link
    // The title already says it: no heading in the box
    expect(screen.queryByText('titleSection.priorCheck.priorHeading')).toBeNull();
    expect(screen.getByText('APP-2026-001')).toBeInTheDocument();
    expect(screen.queryByRole('link', { hidden: true })).toBeNull();
    expect(screen.getByText(/15\/03\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/titleSection\.priorCheck\.value 5,250,000/)).toBeInTheDocument();
    expect(screen.getByText(/titleSection\.priorCheck\.count\{"n":3\}/)).toBeInTheDocument();
    // The key it asked about: the title's number and place, by code
    expect(lookupGet).toHaveBeenCalledWith('/collateral-masters/lookup', {
      params: {
        type: 'L',
        titleNumber: '12345',
        province: '10',
        district: '1001',
        subDistrict: '100101',
      },
    });
    expect(handlers.onSave).not.toHaveBeenCalled();
  });

  it('goes back to editing: nothing saved, and saving again asks again', async () => {
    lookupGet.mockResolvedValue({ data: known });
    render(<Harness />);
    await clickAndSettle(save());
    await clickAndSettle(
      screen.getByRole('button', { name: 'titleSection.priorCheck.back', hidden: true }),
    );
    expect(dialogTitle()).toBeNull();
    expect(handlers.onSave).not.toHaveBeenCalled();
    // Going back acknowledged nothing
    await clickAndSettle(save());
    expect(dialogTitle()).toBeInTheDocument();
    expect(handlers.onSave).not.toHaveBeenCalled();
  });

  describe('once the user has chosen to continue', () => {
    const proceed = () =>
      screen.getByRole('button', { name: 'titleSection.priorCheck.continue', hidden: true });

    it('does not ask again for the same property', async () => {
      lookupGet.mockResolvedValue({ data: known });
      render(<Harness />);
      await clickAndSettle(save());
      await clickAndSettle(proceed());
      expect(handlers.onSave).toHaveBeenCalledTimes(1);
      await clickAndSettle(save());
      expect(dialogTitle()).toBeNull();
      expect(handlers.onSave).toHaveBeenCalledTimes(2);
    });

    it('remembers it after the drawer is closed and reopened, as the page keeps the memory', async () => {
      lookupGet.mockResolvedValue({ data: known });
      const acknowledgedPriors = new Set<string>();
      const first = render(<Harness props={{ acknowledgedPriors }} />);
      await clickAndSettle(save());
      await clickAndSettle(proceed());
      first.unmount();
      render(<Harness props={{ acknowledgedPriors }} />);
      await clickAndSettle(save());
      expect(dialogTitle()).toBeNull();
      expect(handlers.onSave).toHaveBeenCalledTimes(2);
    });

    it('goes by the property, not its row: a moved row or a duplicate is not asked about again', async () => {
      lookupGet.mockResolvedValue({ data: known });
      const acknowledgedPriors = new Set<string>();
      const first = render(<Harness props={{ acknowledgedPriors }} />);
      await clickAndSettle(save());
      await clickAndSettle(proceed());
      first.unmount();
      // The same title now sits at index 2 (rows were added or reordered ahead of it)...
      const moved = render(
        <Harness
          props={{ acknowledgedPriors }}
          before={[completeLand({ titleNumber: '777' }), completeLand({ titleNumber: '888' })]}
        />,
      );
      await clickAndSettle(save());
      expect(dialogTitle()).toBeNull();
      moved.unmount();
      // ...and a duplicate row with the same identity is the same property
      render(<Harness props={{ acknowledgedPriors }} before={[completeLand()]} />);
      await clickAndSettle(save());
      expect(dialogTitle()).toBeNull();
    });

    it('still asks about a different property', async () => {
      lookupGet.mockResolvedValue({ data: known });
      const acknowledgedPriors = new Set<string>();
      const first = render(<Harness props={{ acknowledgedPriors }} />);
      await clickAndSettle(save());
      await clickAndSettle(proceed());
      first.unmount();
      render(
        <Harness props={{ acknowledgedPriors }} title={completeLand({ titleNumber: '99999' })} />,
      );
      await clickAndSettle(save());
      expect(dialogTitle()).toBeInTheDocument();
    });
  });

  it('continues the plain save', async () => {
    lookupGet.mockResolvedValue({ data: known });
    render(<Harness />);
    await clickAndSettle(save());
    await clickAndSettle(
      screen.getByRole('button', { name: 'titleSection.priorCheck.continue', hidden: true }),
    );
    expect(handlers.onSave).toHaveBeenCalledTimes(1);
    expect(handlers.onSaveAndAdd).not.toHaveBeenCalled();
  });

  it('continues a save-and-add as a save-and-add', async () => {
    lookupGet.mockResolvedValue({ data: known });
    render(<Harness />);
    await clickAndSettle(saveAndAdd());
    expect(handlers.onSaveAndAdd).not.toHaveBeenCalled();
    await clickAndSettle(
      screen.getByRole('button', { name: 'titleSection.priorCheck.continue', hidden: true }),
    );
    expect(handlers.onSaveAndAdd).toHaveBeenCalledTimes(1);
    expect(handlers.onSave).not.toHaveBeenCalled();
  });

  describe('when the prior is the one the request already follows', () => {
    it('saves with no question', async () => {
      lookupGet.mockResolvedValue({ data: known });
      render(<Harness prevAppraisalId="a1" />);
      await clickAndSettle(save());
      expect(dialogTitle()).toBeNull();
      expect(handlers.onSave).toHaveBeenCalledTimes(1);
    });

    it('still asks about another prior', async () => {
      lookupGet.mockResolvedValue({ data: known });
      render(<Harness prevAppraisalId="other" />);
      await clickAndSettle(save());
      expect(dialogTitle()).toBeInTheDocument();
    });

    it('shows only the red box when something is also being appraised elsewhere', async () => {
      lookupGet.mockResolvedValue({ data: known });
      inFlightGet.mockResolvedValue({
        data: [{ appraisalId: 'b1', appraisalNumber: 'APP-2026-777', status: 'Pending' }],
      });
      render(<Harness prevAppraisalId="a1" />);
      await clickAndSettle(save());
      expect(screen.getByText('APP-2026-777')).toBeInTheDocument();
      expect(screen.queryByText('APP-2026-001')).toBeNull();
      expect(screen.queryByText('titleSection.priorCheck.priorHeading')).toBeNull();
    });
  });

  describe('when another appraisal is working on it', () => {
    const open = [
      { appraisalId: 'b1', appraisalNumber: 'APP-2026-777', status: 'UnderReview' },
      { appraisalId: 'b2', appraisalNumber: 'APP-2026-888', status: 'Weird' },
    ];

    it('warns with the open reports and their status, without the prior box when there is none', async () => {
      lookupGet.mockRejectedValue({ response: { status: 404 } });
      inFlightGet.mockResolvedValue({ data: open });
      render(<Harness />);
      await clickAndSettle(save());
      expect(screen.getByText('titleSection.priorCheck.titleInProgress')).toBeInTheDocument();
      expect(screen.getByText('titleSection.priorCheck.inProgressHeading')).toBeInTheDocument();
      expect(screen.getByText('APP-2026-777')).toBeInTheDocument();
      // A status the app has a translation for, and one it does not (shown as sent)
      expect(screen.getByText(/UnderReview|list\.status\.UnderReview/)).toBeInTheDocument();
      expect(screen.getByText(/Weird/)).toBeInTheDocument();
      expect(screen.queryByRole('link', { hidden: true })).toBeNull();
      expect(screen.queryByText(/titleSection\.priorCheck\.count/)).toBeNull();
      // The same key as the lookup
      expect(inFlightGet).toHaveBeenCalledWith('/appraisals/in-progress-by-collateral', {
        params: {
          type: 'L',
          titleNumber: '12345',
          province: '10',
          district: '1001',
          subDistrict: '100101',
        },
      });
      expect(handlers.onSave).not.toHaveBeenCalled();
    });

    it('shows both boxes when it has been appraised before as well, and saves on Continue', async () => {
      lookupGet.mockResolvedValue({ data: known });
      inFlightGet.mockResolvedValue({ data: open });
      render(<Harness />);
      await clickAndSettle(save());
      expect(screen.getByText('titleSection.priorCheck.titleInProgress')).toBeInTheDocument();
      expect(screen.getByText('APP-2026-777')).toBeInTheDocument();
      expect(screen.getByText('APP-2026-001')).toBeInTheDocument();
      expect(screen.getByText('titleSection.priorCheck.priorHeading')).toBeInTheDocument();
      expect(screen.getByText(/titleSection\.priorCheck\.count\{"n":3\}/)).toBeInTheDocument();
      await clickAndSettle(
        screen.getByRole('button', { name: 'titleSection.priorCheck.continue', hidden: true }),
      );
      expect(handlers.onSave).toHaveBeenCalledTimes(1);
    });

    it('says so when an open appraisal has no report number yet', async () => {
      lookupGet.mockRejectedValue({ response: { status: 404 } });
      inFlightGet.mockResolvedValue({
        data: [{ appraisalId: 'b3', appraisalNumber: null, status: 'Submitted' }],
      });
      render(<Harness />);
      await clickAndSettle(save());
      expect(screen.getByText('requestForm.priorSummary.noReportNumber')).toBeInTheDocument();
    });

    it('still asks about the prior when the open-appraisals lookup fails', async () => {
      lookupGet.mockResolvedValue({ data: known });
      inFlightGet.mockRejectedValue(new Error('boom'));
      render(<Harness />);
      await clickAndSettle(save());
      expect(dialogTitle()).toBeInTheDocument();
      expect(screen.queryByText('titleSection.priorCheck.inProgressHeading')).toBeNull();
    });

    it('saves with no question when it fails and the prior lookup misses', async () => {
      lookupGet.mockRejectedValue({ response: { status: 404 } });
      inFlightGet.mockRejectedValue(new Error('boom'));
      render(<Harness />);
      await clickAndSettle(save());
      expect(handlers.onSave).toHaveBeenCalledTimes(1);
    });

    it('stops waiting for a slow open-appraisals lookup and asks about the prior', async () => {
      vi.useFakeTimers();
      try {
        lookupGet.mockResolvedValue({ data: known });
        inFlightGet.mockReturnValue(new Promise(() => {}));
        render(<Harness />);
        await clickAndSettle(save());
        expect(dialogTitle()).toBeNull();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(3000);
        });
        expect(dialogTitle()).toBeInTheDocument();
        expect(handlers.onSave).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it('leaves out a value that is zero', async () => {
    lookupGet.mockResolvedValue({
      data: {
        ...known,
        lastAppraisedValue: 0,
        landDetail: { ...known.landDetail, appraisalValue: 0 },
      },
    });
    render(<Harness />);
    await clickAndSettle(save());
    expect(dialogTitle()).toBeInTheDocument();
    expect(screen.queryByText(/titleSection\.priorCheck\.value/)).toBeNull();
  });

  it('saves with no question on a miss', async () => {
    lookupGet.mockRejectedValue({ response: { status: 404 } });
    render(<Harness />);
    await clickAndSettle(save());
    expect(dialogTitle()).toBeNull();
    expect(handlers.onSave).toHaveBeenCalledTimes(1);
  });

  it('saves with no question when the lookup fails', async () => {
    lookupGet.mockRejectedValue(new Error('boom'));
    render(<Harness />);
    await clickAndSettle(save());
    expect(dialogTitle()).toBeNull();
    expect(handlers.onSave).toHaveBeenCalledTimes(1);
  });

  describe('when the master is slow', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('clears its 3 s timer once the lookup has answered', async () => {
      lookupGet.mockResolvedValue({ data: null });
      render(<Harness />);
      const started = vi.spyOn(globalThis, 'setTimeout');
      const cleared = vi.spyOn(globalThis, 'clearTimeout');
      await clickAndSettle(save());
      expect(handlers.onSave).toHaveBeenCalledTimes(1);
      const index = started.mock.calls.findIndex(([, ms]) => ms === 3000);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(cleared).toHaveBeenCalledWith(started.mock.results[index].value);
      started.mockRestore();
      cleared.mockRestore();
    });

    it('stops waiting after a few seconds and saves, with the button busy meanwhile', async () => {
      lookupGet.mockReturnValue(new Promise(() => {}));
      render(<Harness />);
      await clickAndSettle(save());
      expect(handlers.onSave).not.toHaveBeenCalled();
      expect(save()).toBeDisabled();
      // a second click while it runs does nothing
      await clickAndSettle(save());
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(handlers.onSave).toHaveBeenCalledTimes(1);
      expect(dialogTitle()).toBeNull();
    });
  });

  describe('while the master is being asked', () => {
    let resolveLookup: (value: unknown) => void;
    const slowLookup = () =>
      lookupGet.mockReturnValue(new Promise(resolve => (resolveLookup = resolve)));

    it('keeps the drawer where it is: no Cancel, close, Esc, scrim click, Prev or Next', async () => {
      slowLookup();
      render(<Harness props={{ onPrev: handlers.onPrev, onNext: handlers.onNext }} />);
      await clickAndSettle(save());
      expect(save()).toBeDisabled();
      expect(saveAndAdd()).toBeDisabled();
      expect(screen.getByRole('button', { name: 'common:actions.cancel' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'titleSection.drawer.prev' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'titleSection.drawer.next' })).toBeDisabled();
      expect(screen.getAllByRole('button', { name: 'common:actions.close' })[0]).toBeDisabled();
      fireEvent.keyDown(document, { key: 'Escape' });
      const scrim = document.querySelector('[data-drawer-backdrop]') as HTMLElement;
      fireEvent.mouseDown(scrim);
      fireEvent.click(scrim);
      expect(handlers.onClose).not.toHaveBeenCalled();
      expect(handlers.onCancel).not.toHaveBeenCalled();
      expect(handlers.onNext).not.toHaveBeenCalled();
      // and free again once it has answered
      await act(async () => resolveLookup({ data: null }));
      expect(handlers.onSave).toHaveBeenCalledTimes(1);
      expect(save()).not.toBeDisabled();
    });

    it('asks again, and then saves, when the key was edited while it waited (nothing is lost)', async () => {
      const replies: ((value: unknown) => void)[] = [];
      lookupGet.mockImplementation(() => new Promise(resolve => replies.push(resolve)));
      render(<Harness />);
      await clickAndSettle(save());
      // The fields stay editable: the title number changes while the first lookup is out
      act(() => form.setValue('titles.0.titleNumber', '99999'));
      await act(async () => replies[0]({ data: known }));
      // The new key is looked up, and it is that answer that decides
      expect(lookupGet).toHaveBeenCalledTimes(2);
      expect(lookupGet).toHaveBeenLastCalledWith('/collateral-masters/lookup', {
        params: expect.objectContaining({ titleNumber: '99999' }),
      });
      expect(dialogTitle()).toBeNull();
      await act(async () => replies[1]({ data: null }));
      expect(handlers.onSave).toHaveBeenCalledTimes(1);
      expect(dialogTitle()).toBeNull();
    });

    it('shows the dialog for the new key when the edited title is a known one', async () => {
      const replies: ((value: unknown) => void)[] = [];
      lookupGet.mockImplementation(() => new Promise(resolve => replies.push(resolve)));
      render(<Harness />);
      await clickAndSettle(save());
      act(() => form.setValue('titles.0.titleNumber', '99999'));
      await act(async () => replies[0]({ data: null }));
      await act(async () => replies[1]({ data: known }));
      expect(dialogTitle()).toBeInTheDocument();
      expect(handlers.onSave).not.toHaveBeenCalled();
    });

    it('drops the save when the drawer is on a different title by the time it answers', async () => {
      let reply: (value: unknown) => void = () => {};
      lookupGet.mockReturnValue(new Promise(resolve => (reply = resolve)));
      const view = render(<Harness />);
      await clickAndSettle(save());
      // Same form, but the drawer now points at another row
      view.rerender(<Harness before={[completeLand({ titleNumber: '777' })]} />);
      await act(async () => reply({ data: known }));
      expect(dialogTitle()).toBeNull();
      expect(handlers.onSave).not.toHaveBeenCalled();
    });
  });

  it('words the warning for the property when it is not a deed (machinery)', async () => {
    lookupGet.mockResolvedValue({
      data: {
        ...known,
        collateralType: 'MAC',
        landDetail: null,
        machineDetail: {
          lastAppraisalId: 'a2',
          lastAppraisalNumber: 'APP-MAC-1',
          lastAppraisedDate: '2026-03-15T00:00:00',
        },
      },
    });
    render(
      <Harness
        title={completeLand({
          collateralType: '11',
          titleType: '',
          registrationStatus: true,
          registrationNumber: 'M-1',
        })}
      />,
    );
    await clickAndSettle(save());
    expect(screen.getByText('titleSection.priorCheck.titleGeneric')).toBeInTheDocument();
    expect(screen.queryByText('titleSection.priorCheck.title')).toBeNull();
  });

  it('does not ask for a key that is not complete', async () => {
    render(<Harness title={completeLand({ titleNumber: '' })} />);
    await clickAndSettle(save());
    expect(lookupGet).not.toHaveBeenCalled();
    expect(handlers.onSave).toHaveBeenCalledTimes(1);
  });

  it('does not ask for a request that is already submitted: its own appraisal is on record', async () => {
    lookupGet.mockResolvedValue({ data: known });
    render(<Harness submitted />);
    await clickAndSettle(save());
    expect(lookupGet).not.toHaveBeenCalled();
    expect(dialogTitle()).toBeNull();
    expect(handlers.onSave).toHaveBeenCalledTimes(1);
  });
});
