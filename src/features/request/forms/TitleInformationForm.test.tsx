import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, configure, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FormProvider,
  useForm,
  useFormState,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { requestTitleDefault, type RequestTitleDtoType } from '../schemas/form';
import { hasDirtyFields } from '../utils/formDirty';
import toast, { Toaster, type ToastOptions } from 'react-hot-toast';
import { REQUEST_DOCUMENT_UPLOADS } from '../types/document';
import { useUploadProgressStore } from '@/shared/api/uploadProgress';
import { useAddressStore } from '@/shared/store';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import TitleInformationForm from './TitleInformationForm';

// A full-suite run shares the CPU with dozens of workers, so waits get more room than the 1 s default.
// (The tests themselves take well under 100 ms each when the machine is idle.)
configure({ asyncUtilTimeout: 4000 });

// The sort-undo toast lives 8 s of real time. A loaded machine can take longer than that between
// the sort and the undo click, and the toast vanishes mid-test: keep every toast up for the test.
vi.mock('react-hot-toast', async importOriginal => {
  const actual = await importOriginal<typeof import('react-hot-toast')>();
  const base = actual.default;
  type Show = (message: Parameters<typeof base>[0], opts?: ToastOptions) => string;
  const long =
    (show: Show): Show =>
    (message, opts) =>
      show(message, { ...opts, duration: 600_000 });
  return {
    ...actual,
    default: Object.assign(long(base), base, {
      error: long(base.error),
      success: long(base.success),
    }),
  };
});
vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}${JSON.stringify(options)}` : key,
  }),
}));
// The drag itself needs layout (pointer coordinates), which happy-dom does not have: capture the
// context's drop handler and call it, the way a drop would.
const dnd = vi.hoisted(() => ({ onDragEnd: undefined as undefined | ((e: unknown) => void) }));
vi.mock('@dnd-kit/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: (props: { children: React.ReactNode; onDragEnd: (e: unknown) => void }) => {
      dnd.onDragEnd ??= props.onDragEnd;
      return <>{props.children}</>;
    },
  };
});
vi.mock('@/shared/components/ParameterDisplay', () => ({
  default: ({ code }: { code?: string | null }) => <span>{code}</span>,
}));
vi.mock('../hooks/useRequiredDocuments', () => ({ useTitleLevelRequiredDocuments: () => {} }));
vi.mock('../components/TitleImportDialog', () => ({ TitleImportDialog: () => null }));
// Has its own tests (and its own lookups); here only where it sits is checked.
vi.mock('../components/PriorAppraisalSummary', () => ({
  default: () => <div data-testid="prior-summary" />,
}));
// The editor has its own tests; here it is a stand-in that exposes what the list hands it.
vi.mock('../components/titles/TitleDrawer', () => ({
  TitleDrawer: (props: {
    index: number;
    position: number;
    total: number;
    onClose: () => void;
    onSave: () => void;
    onCancel: () => void;
    onSaveAndAdd: () => void;
    onPrev?: () => void;
    onNext?: () => void;
  }) => (
    <div
      data-testid="drawer"
      data-index={props.index}
      data-position={props.position}
      data-total={props.total}
    >
      <button onClick={props.onClose}>drawer-close</button>
      <button onClick={props.onSave}>drawer-save</button>
      <button onClick={props.onCancel}>drawer-cancel</button>
      <button onClick={props.onSaveAndAdd}>drawer-add</button>
      <button disabled={!props.onPrev} onClick={props.onPrev}>
        drawer-prev
      </button>
      <button disabled={!props.onNext} onClick={props.onNext}>
        drawer-next
      </button>
    </div>
  ),
}));

const address = { houseNumber: '9', subDistrict: '100101', district: '1001', province: '10' };

/** A land title the Save schema accepts, so a test makes one incomplete by blanking something. */
const land = (
  titleNumber: string,
  over: Partial<RequestTitleDtoType> = {},
): RequestTitleDtoType => ({
  ...structuredClone(requestTitleDefault),
  notes: 'detail',
  titleAddress: { ...requestTitleDefault.titleAddress, ...address },
  dopaAddress: { ...requestTitleDefault.dopaAddress, ...address },
  collateralType: '01',
  titleType: 'DEED',
  titleNumber,
  areaSquareWa: 50,
  ownerName: `owner ${titleNumber}`,
  ...over,
});
const vehicle = (plate: string): RequestTitleDtoType => ({
  ...structuredClone(requestTitleDefault),
  collateralType: '10',
  licensePlateNumber: plate,
});

let form: UseFormReturn<FieldValues>;
/** Subscribes to isDirty (the form state is a proxy: it only tracks what a render read). */
const DirtyProbe = () => {
  const { isDirty, dirtyFields } = useFormState({ control: form.control });
  return (
    <>
      <output data-testid="dirty">{String(isDirty)}</output>
      <output data-testid="dirty-fields">{String(hasDirtyFields(dirtyFields))}</output>
    </>
  );
};
function Harness({
  titles,
  readOnly = false,
}: {
  titles: RequestTitleDtoType[];
  readOnly?: boolean;
}) {
  form = useForm<FieldValues>({ defaultValues: { titles, properties: [] } });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...form}>
        <TitleInformationForm />
        <DirtyProbe />
        {/* removeDelay 0: a dismissed toast is removed 1 s later by a timer the Toaster starts and never
            cancels on unmount. All toasts here share one id, so a timer left by one test removed the
            next test's undo toast mid-test (hence the flush in afterEach). */}
        <Toaster toastOptions={{ removeDelay: 0 }} />
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
}

const rowNumbers = (table: HTMLElement) =>
  [...table.querySelectorAll('tbody tr[data-title-row]')].map(row =>
    row.getAttribute('data-title-row'),
  );
const estateTable = () => screen.getByRole('region', { name: 'titleSection.group.estate' });
const movableTable = () => screen.getByRole('region', { name: 'titleSection.group.movable' });
const order = () =>
  (form.getValues('titles') as RequestTitleDtoType[]).map(
    t => t.titleNumber ?? t.licensePlateNumber,
  );
const drop = (from: number, to: number) =>
  act(() => dnd.onDragEnd?.({ active: { id: String(from) }, over: { id: String(to) } }));

afterEach(async () => {
  // Let the zero-delay remove timers of the toasts this test dismissed fire before the next test.
  await new Promise(resolve => setTimeout(resolve, 0));
});

beforeEach(() => {
  dnd.onDragEnd = undefined;
  toast.remove();
  useUploadProgressStore.setState({ uploads: [], batches: [] });
  useAddressStore.setState({ titleAddresses: [], dopaAddresses: [] });
});

describe('title list tables', () => {
  it('splits estate and movable into two tables, each numbered from 1', () => {
    render(<Harness titles={[land('1'), vehicle('กข 1'), land('3')]} />);
    expect(rowNumbers(estateTable())).toEqual(['0', '2']);
    expect(rowNumbers(movableTable())).toEqual(['1']);
    // each table counts its own titles from 1
    const numbers = (table: HTMLElement) =>
      [...table.querySelectorAll('tbody tr')].map(row => row.querySelectorAll('td')[0].textContent);
    expect(numbers(estateTable())).toEqual(['1', '2']);
    expect(numbers(movableTable())).toEqual(['1']);
  });

  it('puts the prior-appraisal summary at the top of the title card, above the tables', () => {
    const { container } = render(<Harness titles={[land('1')]} />);
    const card = container.querySelector('[data-field="titles"]')!;
    const summary = within(card as HTMLElement).getByTestId('prior-summary');
    expect(summary.compareDocumentPosition(estateTable())).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('shows the movable table only when there is a movable', () => {
    render(<Harness titles={[land('1')]} />);
    expect(screen.queryByRole('region', { name: 'titleSection.group.movable' })).toBeNull();
  });

  it('marks an incomplete title and counts it in the card subtitle', () => {
    render(<Harness titles={[land('1'), land('2', { ownerName: '' })]} />);
    expect(screen.getAllByText(/^titleSection\.status\.missing/)).toHaveLength(1);
    expect(screen.getAllByText(/^titleSection\.status\.complete/)).toHaveLength(1);
    expect(screen.getByText(/titleSection\.incompleteCount\{"count":1\}/)).toBeInTheDocument();
  });

  it('totals the land over every title, in the sticky total row', () => {
    render(<Harness titles={[land('1'), land('2', { areaSquareWa: 150 })]} />);
    expect(
      within(estateTable()).getByText('titleSection.total.parcels{"count":2}'),
    ).toBeInTheDocument();
    // 50 + 150 = 200 sq.wa = 0-2-0
    expect(
      within(estateTable()).getAllByText('titleSection.cell.areaRai{"rnw":"0-2-0"}'),
    ).toHaveLength(1);
  });

  it('shows an empty state with one add button that opens the type menu, and none when read-only', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness titles={[]} />);
    expect(screen.getByText('empty.noTitles')).toBeInTheDocument();
    expect(screen.getByText('titleSection.empty.hint')).toBeInTheDocument();
    // The header's add button plus the one in the empty state, both the same TitleAddMenu.
    const adds = screen.getAllByRole('button', { name: 'titleOptions.addTitle' });
    expect(adds).toHaveLength(2);
    await user.click(adds[1]);
    expect(await screen.findByRole('menuitem', { name: /01/ })).toBeInTheDocument();
    unmount();

    render(<Harness titles={[]} readOnly />);
    expect(screen.queryByRole('button', { name: 'titleOptions.addTitle' })).toBeNull();
  });
});

describe("a condominium's land title numbers in the table", () => {
  it('shows the first number and how many more, with the whole tidied list on hover', () => {
    render(
      <Harness
        titles={[land('x', { collateralType: '08', titleNumber: '1234,1235;  1236 1234' })]}
      />,
    );
    const cell = within(estateTable()).getByTitle('1234,1235,1236');
    expect(cell).toHaveTextContent('1234');
    expect(cell).toHaveTextContent('+2');
  });

  it('shows a land title number as it is', () => {
    render(<Harness titles={[land('12,13')]} />);
    expect(within(estateTable()).getByText('12,13')).toBeInTheDocument();
  });
});

describe('the bulk import button', () => {
  it('is a plain ghost button in the normal text colour, with no icon, background or border of its own', () => {
    render(<Harness titles={[land('1')]} />);
    const button = screen.getByRole('button', { name: /titleImport\.button/ });
    expect(button.className).not.toMatch(/\btext-green/);
    expect(button.className).toContain('bg-transparent!');
    expect(button.className).toContain('hover:bg-(--palette-surface-3)');
    expect(button.className).not.toMatch(/\b(bg|border)-green/);
    expect(button.querySelector('svg')).toBeNull();
  });
});

describe('search and filter', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => land(String(i + 1)));

  it('has no search bar for a short list, and one from five titles', () => {
    const { unmount } = render(<Harness titles={many(4)} />);
    expect(screen.queryByRole('searchbox')).toBeNull();
    unmount();
    render(<Harness titles={many(5)} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('narrows the rows, says how many, and keeps the totals over all of them', async () => {
    render(<Harness titles={many(10)} />);
    await userEvent.type(screen.getByRole('searchbox'), 'owner 7');
    expect(rowNumbers(estateTable())).toEqual(['6']);
    expect(screen.getByText(/titleSection\.filter\.showing/)).toBeInTheDocument();
    expect(
      within(estateTable()).getByText('titleSection.total.parcels{"count":10}'),
    ).toBeInTheDocument();
  });

  it('turns dragging off while filtered, with the way back', async () => {
    render(<Harness titles={many(10)} />);
    expect(
      [...document.querySelectorAll<HTMLButtonElement>('[data-handle]')].every(h => !h.disabled),
    ).toBe(true);
    await userEvent.type(screen.getByRole('searchbox'), '1');
    expect(
      [...document.querySelectorAll<HTMLButtonElement>('[data-handle]')].every(h => h.disabled),
    ).toBe(true);
    expect(screen.getAllByText('titleSection.dnd.blocked').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'titleSection.filter.clear' }));
    expect(
      [...document.querySelectorAll<HTMLButtonElement>('[data-handle]')].every(h => !h.disabled),
    ).toBe(true);
  });

  it('the incomplete chip lists only titles that lack something', async () => {
    const titles = many(9);
    titles[3] = land('4', { ownerName: '' });
    render(<Harness titles={titles} />);
    await userEvent.click(screen.getByRole('button', { name: /titleSection\.filter\.incomplete/ }));
    expect(rowNumbers(estateTable())).toEqual(['3']);
  });
});

describe('reordering', () => {
  it('moves the dropped title in the form array', () => {
    render(<Harness titles={[land('1'), land('2'), land('3')]} />);
    drop(0, 2);
    expect(order()).toEqual(['2', '3', '1']);
  });

  it('leaves the other table in its own order when one table is reordered', () => {
    render(<Harness titles={[land('1'), vehicle('A'), land('2'), vehicle('B'), land('3')]} />);
    drop(4, 0);
    const plates = (form.getValues('titles') as RequestTitleDtoType[])
      .filter(t => t.collateralType === '10')
      .map(t => t.licensePlateNumber);
    expect(plates).toEqual(['A', 'B']);
    expect(order().filter(x => ['1', '2', '3'].includes(String(x)))).toEqual(['3', '1', '2']);
  });

  it('ignores a drop on itself', () => {
    render(<Harness titles={[land('1'), land('2')]} />);
    drop(1, 1);
    expect(order()).toEqual(['1', '2']);
  });

  it('offers no handles with a single title, nor when read-only', () => {
    const { unmount } = render(<Harness titles={[land('1')]} />);
    expect(document.querySelectorAll('[data-handle]')).toHaveLength(0);
    unmount();
    render(<Harness titles={[land('1'), land('2')]} readOnly />);
    expect(document.querySelectorAll('[data-handle]')).toHaveLength(0);
  });

  it('sorts the estate by title number and can undo it', async () => {
    render(<Harness titles={[land('10'), vehicle('A'), land('2')]} />);
    const sort = screen.getByRole('button', { name: /titleSection\.sort\.button/ });
    await userEvent.click(sort);
    expect(order()).toEqual(['2', 'A', '10']);
    expect(screen.getByRole('button', { name: /titleSection\.sort\.button/ })).toBeDisabled();
  });
});

describe('undoing a sort', () => {
  const sortAndUndo = async (edit: () => void) => {
    await userEvent.click(screen.getByRole('button', { name: /titleSection\.sort\.button/ }));
    edit();
    await userEvent.click(await screen.findByRole('button', { name: 'titleSection.sort.undo' }));
  };

  it('puts the order back', async () => {
    render(<Harness titles={[land('10'), vehicle('A'), land('2'), land('7')]} />);
    await sortAndUndo(() => expect(order()).toEqual(['2', 'A', '7', '10']));
    expect(order()).toEqual(['10', 'A', '2', '7']);
  });

  it('keeps what was typed and uploaded while the toast was up', async () => {
    render(<Harness titles={[land('10'), land('2')]} />);
    await sortAndUndo(() => {
      act(() => {
        form.setValue('titles.0.ownerName', 'typed after sort'); // the title now first is "2"
        form.setValue('titles.1.documents', [{ fileName: 'late.pdf' }]); // and "10" now second
      });
    });
    const titles = form.getValues('titles') as RequestTitleDtoType[];
    expect(titles.map(t => t.titleNumber)).toEqual(['10', '2']);
    expect(titles[1].ownerName).toBe('typed after sort');
    expect(titles[0].documents).toEqual([{ fileName: 'late.pdf' }]);
  });

  it('does not bring back a title deleted meanwhile', async () => {
    render(<Harness titles={[land('10'), land('2'), land('5')]} />);
    await userEvent.click(screen.getByRole('button', { name: /titleSection\.sort\.button/ }));
    // sorted: 2, 5, 10. Delete "10" (the last row).
    const rows = within(estateTable()).getAllByRole('row');
    await userEvent.click(within(rows[3]).getByRole('button', { name: 'actions.delete' }));
    await userEvent.click(await screen.findByText('common:actions.delete'));
    await userEvent.click(await screen.findByRole('button', { name: 'titleSection.sort.undo' }));
    expect(order()).toEqual(['2', '5']);
  });
});

describe('sort undo and a reset', () => {
  it('takes the undo away when the form is reset, since its ids no longer mean anything', async () => {
    render(<Harness titles={[land('10'), land('2'), land('5')]} />);
    await userEvent.click(screen.getByRole('button', { name: /titleSection\.sort\.button/ }));
    expect(
      await screen.findByRole('button', { name: 'titleSection.sort.undo' }),
    ).toBeInTheDocument();
    act(() => form.reset(form.getValues()));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'titleSection.sort.undo' })).toBeNull(),
    );
  });
});

describe('sort undo and unmounting', () => {
  it('takes the undo away when the form goes, since its closure belongs to that form', async () => {
    const { unmount } = render(<Harness titles={[land('10'), land('2'), land('5')]} />);
    await userEvent.click(screen.getByRole('button', { name: /titleSection\.sort\.button/ }));
    expect(
      await screen.findByRole('button', { name: 'titleSection.sort.undo' }),
    ).toBeInTheDocument();
    unmount();
    render(<Toaster />);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'titleSection.sort.undo' })).toBeNull(),
    );
  });
});

describe('sort undo while uploads run', () => {
  it('stays up when nothing was undone, and works once the uploads are done', async () => {
    render(<Harness titles={[land('10'), land('2'), land('5')]} />);
    await userEvent.click(screen.getByRole('button', { name: /titleSection\.sort\.button/ }));
    expect(order()).toEqual(['2', '5', '10']);
    act(() => useUploadProgressStore.setState({ batches: [REQUEST_DOCUMENT_UPLOADS] }));
    await userEvent.click(await screen.findByRole('button', { name: 'titleSection.sort.undo' }));
    expect(order()).toEqual(['2', '5', '10']);
    act(() => useUploadProgressStore.setState({ batches: [] }));
    await userEvent.click(screen.getByRole('button', { name: 'titleSection.sort.undo' }));
    expect(order()).toEqual(['10', '2', '5']);
  });
});

describe('sort undo and the editor', () => {
  it('takes the undo away once an editor opens, so it cannot reorder titles under it', async () => {
    render(<Harness titles={[land('10'), land('2'), land('5')]} />);
    await userEvent.click(screen.getByRole('button', { name: /titleSection\.sort\.button/ }));
    expect(
      await screen.findByRole('button', { name: 'titleSection.sort.undo' }),
    ).toBeInTheDocument();
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'titleSection.sort.undo' })).toBeNull(),
    );
  });

  it('does not sort while an editor is open', async () => {
    render(<Harness titles={[land('10'), land('2')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    await userEvent.click(screen.getByRole('button', { name: /titleSection\.sort\.button/ }));
    expect(order()).toEqual(['10', '2']);
  });

  it('cancel keeps the title where it is for a later undo: same position, same contents but the fields', async () => {
    render(<Harness titles={[land('10'), land('2')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    act(() => form.setValue('titles.0.ownerName', 'changed'));
    await userEvent.click(screen.getByText('drawer-cancel'));
    await waitFor(() => expect(form.getValues('titles.0.ownerName')).toBe('owner 10'));
    // sort and undo afterwards still put every title back where it began
    await userEvent.click(screen.getByRole('button', { name: /titleSection\.sort\.button/ }));
    await waitFor(() => expect(order()).toEqual(['2', '10']));
    // The undo token learns the new field ids in an effect: let it run before undoing.
    await act(async () => {});
    await userEvent.click(await screen.findByRole('button', { name: 'titleSection.sort.undo' }));
    await waitFor(() => expect(order()).toEqual(['10', '2']));
  });
});

describe('the list and the live array', () => {
  it('fills the place in when the address master loads after the rows', async () => {
    const bare = { ...address, districtName: '', provinceName: '' };
    render(
      <Harness
        titles={[land('1', { titleAddress: { ...requestTitleDefault.titleAddress, ...bare } })]}
      />,
    );
    expect(screen.queryByText(/เขตตัวอย่าง/)).toBeNull();
    act(() =>
      useAddressStore.setState({
        titleAddresses: [
          {
            subDistrictCode: '100101',
            subDistrictName: 'แขวงตัวอย่าง',
            districtCode: '1001',
            districtName: 'เขตตัวอย่าง',
            provinceCode: '10',
            provinceName: 'จังหวัดตัวอย่าง',
            postcode: '10200',
          },
        ],
      }),
    );
    expect(await screen.findByText(/เขตตัวอย่าง/)).toBeInTheDocument();
  });

  it('ignores a drop computed on a list that no longer matches the form', async () => {
    render(<Harness titles={[land('1'), land('2'), land('3')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]); // freezes the list
    act(() => form.setValue('titles', [...(form.getValues('titles') as []), land('4')]));
    drop(0, 2);
    expect(order()).toEqual(['1', '2', '3', '4']);
  });

  it('clears the filter when save-and-add-next adds a title, like every other way of adding', async () => {
    render(<Harness titles={Array.from({ length: 6 }, (_, i) => land(String(i + 1)))} />);
    await userEvent.type(screen.getByRole('searchbox'), 'owner 3');
    expect(rowNumbers(estateTable())).toEqual(['2']);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    await userEvent.click(screen.getByText('drawer-add'));
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
  });
});

describe('while uploads are running', () => {
  const busyRows = () => {
    const titles = [land('1'), land('2'), land('3')];
    titles[1] = land('2', { documents: [{ isUploading: true, documentType: 'x' }] as never });
    return titles;
  };

  it('turns the handles and the move menu off, with the reason', async () => {
    render(<Harness titles={busyRows()} />);
    const handles = [...document.querySelectorAll<HTMLButtonElement>('[data-handle]')];
    expect(handles.every(h => h.disabled)).toBe(true);
    expect(handles[0].title).toBe('carryForward.toasts.waitForUploads');
    await userEvent.click(
      within(estateTable()).getAllByRole('button', { name: 'titleSection.row.menu' })[0],
    );
    const items = await screen.findAllByRole('menuitem');
    expect(items.every(item => item.hasAttribute('data-disabled'))).toBe(true);
  });

  it("also locks while the request's document card has a batch running, and frees up after", () => {
    render(<Harness titles={[land('1'), land('2')]} />);
    const handlesOff = () =>
      [...document.querySelectorAll<HTMLButtonElement>('[data-handle]')].every(h => h.disabled);
    expect(handlesOff()).toBe(false);
    act(() => useUploadProgressStore.setState({ batches: [REQUEST_DOCUMENT_UPLOADS] }));
    expect(handlesOff()).toBe(true);
    act(() => useUploadProgressStore.setState({ batches: [] }));
    expect(handlesOff()).toBe(false);
  });

  it('also locks for a request-level file that is uploading, the same rule the actions refuse by', () => {
    render(<Harness titles={[land('1'), land('2')]} />);
    const handlesOff = () =>
      [...document.querySelectorAll<HTMLButtonElement>('[data-handle]')].every(h => h.disabled);
    expect(handlesOff()).toBe(false);
    act(() => form.setValue('documents', [{ isUploading: true, documentType: 'x' }]));
    expect(handlesOff()).toBe(true);
    act(() => form.setValue('documents', [{ isUploading: false, fileName: 'a.pdf' }]));
    expect(handlesOff()).toBe(false);
  });

  it('does not reorder, sort, duplicate or delete, and says why', async () => {
    render(<Harness titles={busyRows()} />);
    drop(0, 2);
    expect(order()).toEqual(['1', '2', '3']);
    expect(await screen.findByText('carryForward.toasts.waitForUploads')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /titleSection\.sort\.button/ }));
    expect(order()).toEqual(['1', '2', '3']);

    const row = within(estateTable()).getAllByRole('row')[1];
    await userEvent.click(within(row).getByRole('button', { name: 'actions.duplicate' }));
    await userEvent.click(within(row).getByRole('button', { name: 'actions.delete' }));
    expect(screen.queryByText('titleOptions.duplicateTitle')).toBeNull();
    expect(screen.queryByText('confirm.deleteTitleTitle')).toBeNull();
    expect(form.getValues('titles')).toHaveLength(3);
  });

  it('ignores a batch from elsewhere in the app', () => {
    render(<Harness titles={[land('1'), land('2')]} />);
    act(() => useUploadProgressStore.setState({ batches: ['some-other-screen'] }));
    expect(
      [...document.querySelectorAll<HTMLButtonElement>('[data-handle]')].every(h => !h.disabled),
    ).toBe(true);
  });

  it('closes a delete or duplicate dialog that was open when an upload started, with the toast', async () => {
    render(<Harness titles={[land('1'), land('2')]} />);
    const row = within(estateTable()).getAllByRole('row')[1];
    await userEvent.click(within(row).getByRole('button', { name: 'actions.delete' }));
    act(() => useUploadProgressStore.setState({ batches: [REQUEST_DOCUMENT_UPLOADS] }));
    await userEvent.click(await screen.findByText('common:actions.delete'));
    expect(form.getValues('titles')).toHaveLength(2);
    expect(await screen.findByText('carryForward.toasts.waitForUploads')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('confirm.deleteTitleTitle')).toBeNull());

    act(() => useUploadProgressStore.setState({ batches: [] }));
    await userEvent.click(within(row).getByRole('button', { name: 'actions.duplicate' }));
    act(() => useUploadProgressStore.setState({ batches: [REQUEST_DOCUMENT_UPLOADS] }));
    await userEvent.click(await screen.findByText(/titleOptions\.duplicateConfirm/));
    expect(form.getValues('titles')).toHaveLength(2);
    await waitFor(() => expect(screen.queryByText('titleOptions.duplicateTitle')).toBeNull());
  });

  it('allows everything again once the rows are done', async () => {
    render(<Harness titles={busyRows()} />);
    act(() => form.setValue('titles.1.documents', [{ isUploading: false, fileName: 'a.pdf' }]));
    drop(0, 2);
    expect(order()).toEqual(['2', '3', '1']);
  });
});

describe('the editor', () => {
  it('opens on a click on the row; save keeps what was typed, and every other way out puts it back', async () => {
    render(<Harness titles={[land('1'), land('2')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[2]);
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '1');
    act(() => form.setValue('titles.1.titleNumber', 'edited'));
    await userEvent.click(screen.getByText('drawer-save'));
    expect(screen.queryByTestId('drawer')).toBeNull();
    expect(order()).toEqual(['1', 'edited']);

    // ✕, Esc and the scrim all arrive as the drawer's onClose
    await userEvent.click(within(estateTable()).getAllByRole('row')[2]);
    act(() => form.setValue('titles.1.titleNumber', 'edited again'));
    await userEvent.click(screen.getByText('drawer-close'));
    expect(screen.queryByTestId('drawer')).toBeNull();
    await waitFor(() => expect(order()).toEqual(['1', 'edited']));
  });

  it('closing does not leave a pristine form dirty from the round trip', async () => {
    render(<Harness titles={[land('1'), land('2')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    act(() => form.setValue('titles.0.titleNumber', 'edited', { shouldDirty: true }));
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');
    await userEvent.click(screen.getByText('drawer-close'));
    await waitFor(() => expect(order()).toEqual(['1', '2']));
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
  });

  describe('a form the page filled in after loading (the required document slots)', () => {
    // The slots are written without marking anything, so the form no longer equals its loaded values;
    // which fields the maker changed is then the question, not whether the whole form still matches.
    const withSlot = () =>
      act(() =>
        form.setValue('titles.0.documents', [{ documentType: 'D013', fileName: null }], {
          shouldDirty: false,
        }),
      );
    const fieldsDirty = () => screen.getByTestId('dirty-fields');

    it('opening the editor and cancelling leaves no field dirty', async () => {
      render(<Harness titles={[land('1'), land('2')]} />);
      withSlot();
      await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
      await userEvent.click(screen.getByText('drawer-cancel'));
      expect(fieldsDirty()).toHaveTextContent('false');
      expect(form.getValues('titles.0.documents')).toHaveLength(1); // the slot is not touched
    });

    it('editing then cancelling leaves no field dirty, and puts the value back', async () => {
      render(<Harness titles={[land('1'), land('2')]} />);
      withSlot();
      await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
      act(() => form.setValue('titles.0.titleNumber', 'edited', { shouldDirty: true }));
      expect(fieldsDirty()).toHaveTextContent('true');
      await userEvent.click(screen.getByText('drawer-cancel'));
      await waitFor(() => expect(order()).toEqual(['1', '2']));
      expect(fieldsDirty()).toHaveTextContent('false');
    });

    it('editing then saving leaves the edited field dirty', async () => {
      render(<Harness titles={[land('1'), land('2')]} />);
      withSlot();
      await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
      act(() => form.setValue('titles.0.titleNumber', 'edited', { shouldDirty: true }));
      await userEvent.click(screen.getByText('drawer-save'));
      expect(fieldsDirty()).toHaveTextContent('true');
    });
  });

  it('previous / next keeps the edits to the title left behind, and a later cancel puts back only the open one', async () => {
    render(<Harness titles={[land('1'), land('2')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    act(() => form.setValue('titles.0.titleNumber', 'edited 1'));
    await userEvent.click(screen.getByText('drawer-next'));
    act(() => form.setValue('titles.1.titleNumber', 'edited 2'));
    await userEvent.click(screen.getByText('drawer-close'));
    await waitFor(() => expect(order()).toEqual(['edited 1', '2']));
  });

  it('cancel puts the title back as it was', async () => {
    render(<Harness titles={[land('1'), land('2')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    act(() => form.setValue('titles.0.titleNumber', 'edited'));
    await userEvent.click(screen.getByText('drawer-cancel'));
    await waitFor(() => expect(order()).toEqual(['1', '2']));
  });

  it('cancel restores the fields but not the files that arrived meanwhile', async () => {
    render(<Harness titles={[land('1')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    act(() => {
      form.setValue('titles.0.titleNumber', 'edited');
      form.setValue('titles.0.documents', [{ fileName: 'uploaded-meanwhile.pdf' }]);
    });
    await userEvent.click(screen.getByText('drawer-cancel'));
    await waitFor(() => expect(form.getValues('titles.0.titleNumber')).toBe('1'));
    expect(form.getValues('titles.0.documents')).toEqual([{ fileName: 'uploaded-meanwhile.pdf' }]);
  });

  it('previous and next follow the table, and are off at either end', async () => {
    render(<Harness titles={[land('1'), land('2'), land('3')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[2]);
    expect(screen.getByText('drawer-next')).toBeEnabled();
    await userEvent.click(screen.getByText('drawer-next'));
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '2');
    expect(screen.getByText('drawer-next')).toBeDisabled();
    await userEvent.click(screen.getByText('drawer-prev'));
    await userEvent.click(screen.getByText('drawer-prev'));
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '0');
    expect(screen.getByText('drawer-prev')).toBeDisabled();
  });

  it('adds a title from the menu and opens it; closing it blank drops it again', async () => {
    render(<Harness titles={[land('1')]} />);
    await userEvent.click(screen.getByRole('button', { name: /titleOptions\.addTitle/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /^01/ }));
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '1');
    expect(form.getValues('titles')).toHaveLength(2);
    expect(form.getValues('titles.1.collateralType')).toBe('01');
    expect(form.getValues('titles.1.titleType')).toBe('DEED');
    await userEvent.click(screen.getByText('drawer-close'));
    expect(form.getValues('titles')).toHaveLength(1);
  });

  it('keeps an added title once something was typed and it is saved; cancel or close drops it', async () => {
    render(<Harness titles={[land('1')]} />);
    await userEvent.click(screen.getByRole('button', { name: /titleOptions\.addTitle/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /^01/ }));
    act(() => form.setValue('titles.1.titleNumber', 'typed'));
    await userEvent.click(screen.getByText('drawer-save'));
    expect(order()).toEqual(['1', 'typed']);

    await userEvent.click(screen.getByRole('button', { name: /titleOptions\.addTitle/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /^01/ }));
    act(() => form.setValue('titles.2.titleNumber', 'also typed'));
    await userEvent.click(screen.getByText('drawer-cancel'));
    expect(order()).toEqual(['1', 'typed']);
  });

  describe('a new title with documents', () => {
    const file = { fileName: 'deed.pdf', documentId: 'doc-1', documentType: 'T01' };
    const addNew = async () => {
      // The header's button is first; an empty list also shows one in the empty state.
      await userEvent.click(screen.getAllByRole('button', { name: /titleOptions\.addTitle/ })[0]);
      await userEvent.click(await screen.findByRole('menuitem', { name: /^01/ }));
    };

    it('is touched by a file: save keeps it, and close asks first like cancel', async () => {
      render(<Harness titles={[land('1')]} />);
      await addNew();
      act(() => form.setValue('titles.1.documents', [file]));
      await userEvent.click(screen.getByText('drawer-close'));
      expect(await screen.findByText('titleSection.discard.message{"n":1}')).toBeInTheDocument();
      expect(form.getValues('titles')).toHaveLength(2);
      await userEvent.click(screen.getByText('common:actions.cancel'));
      await userEvent.click(screen.getByText('drawer-save'));
      expect(form.getValues('titles')).toHaveLength(2);
      expect(form.getValues('titles.1.documents')).toEqual([file]);
    });

    it('cancel asks first, and the title goes only once that is confirmed', async () => {
      render(<Harness titles={[land('1')]} />);
      await addNew();
      act(() => form.setValue('titles.1.documents', [file]));
      await userEvent.click(screen.getByText('drawer-cancel'));
      expect(await screen.findByText('titleSection.discard.message{"n":1}')).toBeInTheDocument();
      expect(form.getValues('titles')).toHaveLength(2);
      await userEvent.click(screen.getByText('titleSection.discard.confirm'));
      expect(form.getValues('titles')).toHaveLength(1);
      expect(screen.queryByTestId('drawer')).toBeNull();
    });

    it('keeps the editor open, and the title, while a file is still going up', async () => {
      render(<Harness titles={[land('1')]} />);
      await addNew();
      act(() => form.setValue('titles.1.documents', [{ fileName: 'slow.pdf', isUploading: true }]));
      await userEvent.click(screen.getByText('drawer-close'));
      await userEvent.click(screen.getByText('drawer-cancel'));
      await userEvent.click(screen.getByText('drawer-save'));
      expect(screen.getByTestId('drawer')).toBeInTheDocument();
      expect(screen.queryByText('titleSection.discard.confirm')).toBeNull();
      expect(form.getValues('titles')).toHaveLength(2);
    });

    it('save and add next keeps the files on the title they were attached to', async () => {
      render(<Harness titles={[land('1')]} />);
      await addNew();
      act(() => form.setValue('titles.1.documents', [file]));
      await userEvent.click(screen.getByText('drawer-add'));
      expect(form.getValues('titles')).toHaveLength(3);
      expect(form.getValues('titles.1.documents')).toEqual([file]);
      expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '2');
    });
  });

  it('keeps a freshly added blank title on Save, where close drops it', async () => {
    render(<Harness titles={[land('1')]} />);
    await userEvent.click(screen.getByRole('button', { name: /titleOptions\.addTitle/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /^01/ }));
    await userEvent.click(screen.getByText('drawer-save'));
    expect(form.getValues('titles')).toHaveLength(2);
    expect(screen.queryByTestId('drawer')).toBeNull();
    // it is still there as an incomplete row
    expect(rowNumbers(estateTable())).toEqual(['0', '1']);
  });

  it('tells the editor its place in its own table, not in the whole request', async () => {
    render(<Harness titles={[land('1'), vehicle('A'), land('3')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[2]);
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-position', '2');
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-total', '2');
    await userEvent.click(screen.getByText('drawer-close'));
    await userEvent.click(within(movableTable()).getAllByRole('row')[1]);
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-position', '1');
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-total', '1');
  });

  it('leaves the list alone while the editor is open, and catches up when it closes', async () => {
    render(<Harness titles={[land('1'), land('2')]} />);
    const ownerOf = (n: number) =>
      within(estateTable()).getAllByRole('row')[n].querySelectorAll('td')[5].textContent;
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    act(() => form.setValue('titles.0.ownerName', 'typed in the editor'));
    expect(ownerOf(1)).toBe('owner 1');
    await userEvent.click(screen.getByText('drawer-save'));
    expect(ownerOf(1)).toBe('typed in the editor');
  });

  it('lets the editor reach a title added from inside it (previous/next)', async () => {
    render(<Harness titles={[land('1')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    await userEvent.click(screen.getByText('drawer-add'));
    act(() => form.setValue('titles.1.titleNumber', 'typed'));
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '1');
    await waitFor(() => expect(screen.getByText('drawer-prev')).toBeEnabled());
  });

  it('drops an untouched new title when leaving it with previous, and keeps one with something typed', async () => {
    render(<Harness titles={[land('1')]} />);
    await userEvent.click(screen.getByRole('button', { name: /titleOptions\.addTitle/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /^01/ }));
    await waitFor(() => expect(screen.getByText('drawer-prev')).toBeEnabled());
    await userEvent.click(screen.getByText('drawer-prev'));
    expect(form.getValues('titles')).toHaveLength(1);
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '0');

    await userEvent.click(screen.getByText('drawer-close'));
    await userEvent.click(screen.getByRole('button', { name: /titleOptions\.addTitle/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /^01/ }));
    act(() => form.setValue('titles.1.titleNumber', 'typed'));
    await waitFor(() => expect(screen.getByText('drawer-prev')).toBeEnabled());
    await userEvent.click(screen.getByText('drawer-prev'));
    expect(order()).toEqual(['1', 'typed']);
  });

  it('previous and next follow the live types: a title changed to a movable moves to the other table in the order', async () => {
    render(<Harness titles={[land('1'), land('2'), vehicle('A')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]); // index 0
    act(() => form.setValue('titles.0.collateralType', '10')); // now the first movable
    await waitFor(() => expect(screen.getByTestId('drawer')).toHaveAttribute('data-total', '2'));
    // tables: estate [1], movable [0, 2]: next of 0 is 2, previous is 1
    await userEvent.click(screen.getByText('drawer-next'));
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '2');
    await userEvent.click(screen.getByText('drawer-prev'));
    await userEvent.click(screen.getByText('drawer-prev'));
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '1');
  });

  it('has no next once the new title it just left was dropped', async () => {
    render(<Harness titles={[land('1')]} />);
    await userEvent.click(screen.getByRole('button', { name: /titleOptions\.addTitle/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /^01/ }));
    await waitFor(() => expect(screen.getByText('drawer-prev')).toBeEnabled());
    await userEvent.click(screen.getByText('drawer-prev'));
    expect(screen.getByText('drawer-next')).toBeDisabled();
  });

  it('ends the session when the open title is deleted from under the editor', async () => {
    render(<Harness titles={[land('1'), land('2'), land('3')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[3]);
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '2');
    act(() => form.setValue('titles', (form.getValues('titles') as []).slice(0, 2)));
    await waitFor(() => expect(screen.queryByTestId('drawer')).toBeNull());
    // and the list is not left frozen
    act(() => form.setValue('titles.1.ownerName', 'after'));
    await waitFor(() =>
      expect(
        within(estateTable()).getAllByRole('row')[2].querySelectorAll('td')[5].textContent,
      ).toBe('after'),
    );
  });

  it("follows a type change made in the editor in the editor's place and count", async () => {
    render(<Harness titles={[land('1'), land('2'), land('3')]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[2]);
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-position', '2');
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-total', '3');
    act(() => form.setValue('titles.0.collateralType', '10'));
    await waitFor(() => expect(screen.getByTestId('drawer')).toHaveAttribute('data-position', '1'));
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-total', '2');
  });

  describe('a title just added', () => {
    const add = async () => {
      // The header's button is first; an empty list also shows one in the empty state.
      await userEvent.click(screen.getAllByRole('button', { name: /titleOptions\.addTitle/ })[0]);
      await userEvent.click(await screen.findByRole('menuitem', { name: /^01/ }));
    };
    const count = (n: number) => ({
      toBeInTheDocument: () =>
        expect(
          screen.getAllByText(new RegExp(`forms\\.titleCount\\{"count":${n}\\}`)).length,
        ).toBeGreaterThan(0),
    });

    it('is not in the table or the count while the editor is open, and appears on Save', async () => {
      render(<Harness titles={[land('1')]} />);
      await add();
      expect(form.getValues('titles')).toHaveLength(2);
      expect(rowNumbers(estateTable())).toEqual(['0']);
      count(1).toBeInTheDocument();
      await userEvent.click(screen.getByText('drawer-save'));
      expect(rowNumbers(estateTable())).toEqual(['0', '1']);
      count(2).toBeInTheDocument();
    });

    it('never appears when the editor is closed or cancelled', async () => {
      render(<Harness titles={[land('1')]} />);
      await add();
      await userEvent.click(screen.getByText('drawer-close'));
      expect(rowNumbers(estateTable())).toEqual(['0']);
      await add();
      await userEvent.click(screen.getByText('drawer-cancel'));
      expect(rowNumbers(estateTable())).toEqual(['0']);
      count(1).toBeInTheDocument();
    });

    it('with save and add next, the saved one appears and the next blank one stays out', async () => {
      render(<Harness titles={[land('1')]} />);
      await add();
      act(() => form.setValue('titles.1.titleNumber', 'saved'));
      await userEvent.click(screen.getByText('drawer-add'));
      expect(form.getValues('titles')).toHaveLength(3);
      await waitFor(() => expect(rowNumbers(estateTable())).toEqual(['0', '1']));
      count(2).toBeInTheDocument();
    });

    it('starts an empty request with no rows until the first title is saved', async () => {
      render(<Harness titles={[]} />);
      await add();
      expect(screen.getByText('empty.noTitles')).toBeInTheDocument();
      await userEvent.click(screen.getByText('drawer-save'));
      expect(rowNumbers(estateTable())).toEqual(['0']);
    });
  });

  it('save and add next appends a title of the same type', async () => {
    render(<Harness titles={[land('1', { collateralType: '08' })]} />);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    await userEvent.click(screen.getByText('drawer-add'));
    expect(form.getValues('titles')).toHaveLength(2);
    expect(form.getValues('titles.1.collateralType')).toBe('08');
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '1');
  });
});

describe('read-only', () => {
  it('has no add, import, sort or row actions, but opens a title and still searches', async () => {
    render(<Harness titles={Array.from({ length: 9 }, (_, i) => land(String(i + 1)))} readOnly />);
    expect(screen.queryByRole('button', { name: /titleOptions\.addTitle/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /titleSection\.sort\.button/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'actions.delete' })).toBeNull();
    const search = screen.getByRole('searchbox');
    expect(search).toBeEnabled();
    await userEvent.type(search, 'owner 4');
    expect(rowNumbers(estateTable())).toEqual(['3']);
    await userEvent.click(within(estateTable()).getAllByRole('row')[1]);
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-index', '3');
  });
});

describe('row actions', () => {
  const row = (n: number) => within(estateTable()).getAllByRole('row')[n];

  it('deletes only after confirming', async () => {
    render(<Harness titles={[land('1'), land('2')]} />);
    await userEvent.click(within(row(1)).getByRole('button', { name: 'actions.delete' }));
    expect(form.getValues('titles')).toHaveLength(2);
    await userEvent.click(await screen.findByText('common:actions.delete'));
    expect(order()).toEqual(['2']);
  });

  it('puts a copy right after the title it came from, without its id or documents', async () => {
    render(
      <Harness
        titles={[
          land('1', {
            id: '11111111-1111-4111-8111-111111111111',
            documents: [{ fileName: 'a.pdf' }] as never,
          }),
          land('2'),
        ]}
      />,
    );
    await userEvent.click(within(row(1)).getByRole('button', { name: 'actions.duplicate' }));
    await userEvent.click(await screen.findByText(/titleOptions\.duplicateConfirm/));
    expect(order()).toEqual(['1', '1', '2']);
    expect(form.getValues('titles.1.id')).toBeUndefined();
    expect(form.getValues('titles.1.documents')).toEqual([]);
    expect(form.getValues('titles.0.id')).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('moves a title to the top or bottom of its own table from the row menu', async () => {
    render(<Harness titles={[land('1'), vehicle('A'), land('2'), land('3')]} />);
    await userEvent.click(within(row(3)).getByRole('button', { name: 'titleSection.row.menu' }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /titleSection\.row\.moveTop/ }),
    );
    expect(order()).toEqual(['3', '1', 'A', '2']);
  });

  it("a typed place is within the title's own table, never the other one", async () => {
    render(<Harness titles={[land('1'), vehicle('A'), land('2'), land('3')]} />);
    const menuOf = (n: number) => {
      const rows = within(estateTable()).getAllByRole('row');
      return rows[n].querySelector<HTMLElement>('[aria-label="titleSection.row.menu"]')!;
    };
    await userEvent.click(menuOf(3)); // land 3: place 3 of the 3 land titles
    await userEvent.click(await screen.findByRole('menuitem', { name: 'titleSection.row.moveTo' }));
    const input = await screen.findByLabelText('titleSection.move.position');
    expect((input as HTMLInputElement).value).toBe('3');
    // place 3 of the 3 land titles, not 4 of 4
    expect(screen.getByText('titleSection.move.message{"n":3,"total":3}')).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, '1');
    await userEvent.click(screen.getByText('titleSection.move.confirm'));
    expect(order()).toEqual(['3', '1', 'A', '2']); // the vehicle did not move
  });

  it('moves a title to a typed position', async () => {
    render(<Harness titles={[land('1'), land('2'), land('3')]} />);
    await userEvent.click(within(row(1)).getByRole('button', { name: 'titleSection.row.menu' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'titleSection.row.moveTo' }));
    const input = await screen.findByLabelText('titleSection.move.position');
    await userEvent.clear(input);
    await userEvent.type(input, '3');
    await userEvent.click(screen.getByText('titleSection.move.confirm'));
    expect(order()).toEqual(['2', '3', '1']);
  });
});
