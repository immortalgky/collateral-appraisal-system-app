import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const scrollToField = vi.hoisted(() => vi.fn());
vi.mock('@/shared/components/form/utils', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/components/form/utils')>()),
  scrollToField,
}));
vi.mock('@/features/collateralMaster/components/TitleLookupIntegration', () => ({
  TitleLookupIntegration: () => <div data-testid="lookup" />,
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
}: {
  title?: RequestTitleDtoType;
  props?: Partial<TitleDrawerProps>;
}) {
  form = useForm<FieldValues>({ defaultValues: { titles: [title] } });
  return (
    <FormProvider {...form}>
      <TitleDrawer
        index={0}
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
  );
}

beforeEach(() => {
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

  it('is view-only when read-only: one Close button, no lookup banner', () => {
    render(<Harness props={{ readOnly: true }} />);
    expect(screen.queryByRole('button', { name: 'common:actions.save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'titleSection.drawer.saveAndAdd' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'common:actions.close' }).length).toBe(2);
    expect(screen.queryByTestId('lookup')).toBeNull();
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
