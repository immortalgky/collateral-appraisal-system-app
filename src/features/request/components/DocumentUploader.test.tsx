import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { act, render, screen, waitFor, within } from '@/test/test-utils';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import type { UploadedDocument } from '../types/document';
import i18n from 'i18next';
import DocumentUploader from './DocumentUploader';
import { useTitleEditorStore } from '../store/titleEditorStore';

// No network: the type names come from the rows' own displayName here.
// (it also counts how often the card itself renders: it is called once per render of the card)
const cardRenders = vi.hoisted(() => ({ count: 0 }));
const typeList = vi.hoisted(() => ({
  data: [] as { code: string; name: string; nameTh?: string }[],
}));
vi.mock('../api/documentTypes', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/documentTypes')>()),
  useGetDocumentTypes: () => {
    cardRenders.count++;
    return { data: typeList.data };
  },
}));

// The assignment dialog watches the titles too; keep it out of the render counts below.
vi.mock('./FileAssignmentModal', () => ({ default: () => null }));

// The request namespace loads in English here (the api modules import the i18n instance).
const doc = (over: Partial<UploadedDocument>): UploadedDocument => ({
  documentType: 'D015',
  fileName: null,
  uploadedAt: '2026-10-05T08:00:00',
  prefix: null,
  notes: null,
  filePath: null,
  createdWorkstation: null,
  isRequired: false,
  uploadedBy: 'reqmaker1',
  uploadedByName: 'Req Maker',
  ...over,
});

const documents: UploadedDocument[] = [
  doc({ documentType: 'D036', isRequired: true, documentId: 'a', fileName: 'summary-part1.pdf' }),
  doc({ documentType: 'D036', isRequired: true, documentId: 'b', fileName: 'summary-part2.pdf' }),
  doc({ documentType: 'D015', documentId: 'c', fileName: 'id-card.png', source: 'FOLLOWUP' }),
  doc({ documentType: 'D013', isRequired: true, displayName: 'Deed' }),
  doc({ documentType: 'D016', displayName: 'Letter' }),
  doc({ documentType: 'D014', displayName: 'Contract' }),
];

function Harness({
  readOnly = false,
  docs = documents,
  children,
}: {
  readOnly?: boolean;
  docs?: UploadedDocument[];
  children?: ReactNode;
}) {
  const methods = useForm({
    defaultValues: {
      documents: docs,
      titles: [] as unknown[],
      detail: { prevAppraisalId: null, prevAppraisalReportNo: null },
    },
  });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...methods}>
        <DocumentUploader getOrCreateSession={async () => 'session'} />
        {children}
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
}

describe('DocumentUploader card', () => {
  it('shows one row per type with its files as chips, and the missing required type', () => {
    render(<Harness />);

    // D036 has two files but is one row; both are chips
    expect(screen.getAllByText('D036', { exact: false })).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: /summary-part1\.pdf/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /summary-part2\.pdf/ })).toBeInTheDocument();
    // the required type without a file is a row with the amber upload action
    expect(screen.getByText('Deed')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('collapses empty optional types into one line of chips, and a search brings one back as a row', async () => {
    const { user } = render(<Harness />);

    expect(screen.queryByText('Letter')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Letter' })).toBeInTheDocument(); // the empty-types chip
    expect(screen.getByText(/No file yet for 2 types/)).toBeInTheDocument();
    // there is no "show every type" switch any more
    expect(screen.queryByRole('button', { name: 'Show every type' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox'), 'letter');
    expect(screen.getByText('Letter')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Letter' })).not.toBeInTheDocument();
  });

  it('filters to the missing types, and by file name', async () => {
    const { user } = render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Missing 1' }));
    expect(screen.getByText('Deed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /summary-part1\.pdf/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All' }));
    await user.type(screen.getByRole('searchbox'), 'id-card');
    expect(screen.getByRole('button', { name: /id-card\.png/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /summary-part1\.pdf/ })).not.toBeInTheDocument();
  });

  it('opens the side pane for a clicked file, with its notes editable', async () => {
    const { user } = render(<Harness />);

    expect(
      screen.getByText('Select a file from the list to preview it and act on it'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /id-card\.png/ }));

    const pane = screen.getByRole('complementary');
    expect(within(pane).getByRole('heading', { name: /id-card\.png/ })).toBeInTheDocument();
    expect(within(pane).getByText('Requested by an appraiser')).toBeInTheDocument();
    expect(within(pane).getByRole('textbox')).toBeInTheDocument();
    expect(within(pane).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('is view-only when read-only: no checkbox, upload, drop bar or edit actions', async () => {
    const { user } = render(<Harness readOnly />);

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Upload')).not.toBeInTheDocument();
    expect(screen.queryByText('Choose files…')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /id-card\.png/ }));
    const pane = screen.getByRole('complementary');
    expect(within(pane).getByRole('button', { name: 'Open in new tab' })).toBeInTheDocument();
    expect(within(pane).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(pane).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('selects every file on screen, and offers expand / collapse all for the sections', async () => {
    const { user } = render(<Harness />);

    await user.click(screen.getByRole('checkbox', { name: 'Select all files on screen' }));
    expect(screen.getByText('3 files selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(screen.queryByRole('button', { name: /summary-part1\.pdf/ })).not.toBeInTheDocument();
    // files in a closed section are not on screen, so select-all has nothing to offer
    expect(screen.getByRole('checkbox', { name: 'Select all files on screen' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(screen.getByRole('button', { name: /summary-part1\.pdf/ })).toBeInTheDocument();
  });

  it('has no select-all in read-only', () => {
    render(<Harness readOnly />);
    expect(
      screen.queryByRole('checkbox', { name: 'Select all files on screen' }),
    ).not.toBeInTheDocument();
    // but sections can still be opened and closed
    expect(screen.getByRole('button', { name: 'Collapse all' })).toBeInTheDocument();
  });
});

// The side pane needs room. The card is measured (not the window), so these tests give it a width.
class FakeResizeObserver {
  static width = 1200;
  private callback: (entries: { contentRect: { width: number } }[]) => void;
  constructor(callback: (entries: { contentRect: { width: number } }[]) => void) {
    this.callback = callback;
  }
  observe() {
    this.callback([{ contentRect: { width: FakeResizeObserver.width } }]);
  }
  disconnect() {}
}

describe('DocumentUploader preview pane layout', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    // jsdom lays nothing out, so every box measures 0x0 and Headless UI's dialog takes its panel
    // for gone and closes at once. Give boxes a size.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 100, 100),
    );
    try {
      localStorage.clear();
    } catch {
      // no storage in this environment
    }
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    FakeResizeObserver.width = 1200;
  });

  it('shows the side pane on a wide card', async () => {
    const { user } = render(<Harness />);
    await user.click(screen.getByRole('button', { name: /id-card\.png/ }));
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a slide-over instead of the side pane on a narrow card, and Esc closes it', async () => {
    FakeResizeObserver.width = 600;
    const { user } = render(<Harness />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    // the file ⋮ menu is still there
    expect(screen.getAllByRole('button', { name: 'File actions' }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /id-card\.png/ }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByRole('heading', { name: 'id-card.png' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Open in new tab' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('lets the user collapse the pane on a wide card, remembers it, and uses the slide-over', async () => {
    const { user, unmount } = render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Hide preview' }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(localStorage.getItem('request.documentCard.previewPane')).toBe('hidden');

    await user.click(screen.getByRole('button', { name: /id-card\.png/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    unmount();

    // a fresh mount starts collapsed, with the way back
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Show preview' })).toBeInTheDocument();
  });

  it('offers no collapse toggle when the card is too narrow to have a pane', () => {
    FakeResizeObserver.width = 600;
    render(<Harness />);
    expect(screen.queryByRole('button', { name: 'Hide preview' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show preview' })).not.toBeInTheDocument();
  });

  it('select-all ticks only the chips on screen, not the files folded into "+N"', async () => {
    const photos = ['1', '2', '3', '4', '5'].map(n =>
      doc({
        documentType: 'D010',
        displayName: 'Photos',
        documentId: `p${n}`,
        fileName: `photo-${n}.jpg`,
      }),
    );
    const { user } = render(<Harness docs={photos} />);

    expect(screen.queryByRole('button', { name: /photo-4\.jpg/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Select all files on screen' }));
    expect(screen.getByText('3 files selected')).toBeInTheDocument();

    // opening the fold puts the other two on screen, and select-all then covers them too
    await user.click(screen.getByRole('button', { name: '+2 files' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select all files on screen' }));
    expect(screen.getByText('5 files selected')).toBeInTheDocument();
  });

  it('renames a title section when its number is edited, and ignores edits the card does not show', async () => {
    let edit: (name: string, value: string) => void = () => {};
    function Editor() {
      const { setValue } = useFormContext();
      edit = (name, value) => setValue(name, value);
      return null;
    }
    const titled = {
      collateralType: '01',
      titleNumber: '111',
      ownerName: 'A',
      documents: [doc({ documentType: 'D013', displayName: 'Deed', isRequired: true })],
    };
    function TitleHarness() {
      const methods = useForm({
        defaultValues: { documents, titles: [titled], detail: {} } as never,
      });
      return (
        <FormProvider {...methods}>
          <DocumentUploader getOrCreateSession={async () => 'session'} />
          <Editor />
        </FormProvider>
      );
    }
    render(<TitleHarness />);
    expect(screen.getByText(/Title 111/)).toBeInTheDocument();

    act(() => edit('titles.0.ownerName', 'B'));
    expect(screen.getByText(/Title 111/)).toBeInTheDocument();

    act(() => edit('titles.0.titleNumber', '222'));
    expect(screen.getByText(/Title 222/)).toBeInTheDocument();
    expect(screen.queryByText(/Title 111/)).not.toBeInTheDocument();
  });

  it('mounted with the title editor already open, shows the titles it has and no more', () => {
    function OpenHarness() {
      const methods = useForm({
        defaultValues: {
          documents,
          titles: [{ collateralType: '01', titleNumber: '111', documents: [] }],
          detail: {},
        } as never,
      });
      return (
        <FormProvider {...methods}>
          <DocumentUploader getOrCreateSession={async () => 'session'} />
        </FormProvider>
      );
    }
    act(() => useTitleEditorStore.getState().setOpen(true));
    render(<OpenHarness />);
    // the request section and the one title, nothing else
    expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(2);
    expect(screen.getByText(/Title 111/)).toBeInTheDocument();
    act(() => useTitleEditorStore.getState().setOpen(false));
  });

  it('stands still while the title editor is open, and catches up when it closes', () => {
    let edit: (name: string, value: string) => void = () => {};
    function Editor() {
      const { setValue } = useFormContext();
      edit = (name, value) => setValue(name, value);
      return null;
    }
    function TitleHarness() {
      const methods = useForm({
        defaultValues: {
          documents,
          titles: [{ collateralType: '01', titleNumber: '111', documents: [] }],
          detail: {},
        } as never,
      });
      return (
        <FormProvider {...methods}>
          <DocumentUploader getOrCreateSession={async () => 'session'} />
          <Editor />
        </FormProvider>
      );
    }
    render(<TitleHarness />);
    act(() => useTitleEditorStore.getState().setOpen(true));
    const before = cardRenders.count;

    // every key typed in the editor changes the number; the covered card does not render for it
    for (const n of ['2', '22', '222']) act(() => edit('titles.0.titleNumber', n));
    expect(cardRenders.count).toBe(before);
    expect(screen.getByText(/Title 111/)).toBeInTheDocument();

    act(() => useTitleEditorStore.getState().setOpen(false));
    expect(screen.getByText(/Title 222/)).toBeInTheDocument();
  });

  describe('with many titles', () => {
    const manyTitles = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        collateralType: '01',
        titleNumber: String(1000 + i),
        documents: [doc({ documentType: 'D013', displayName: 'Deed', isRequired: true })],
      }));
    let reverse: () => void = () => {};
    function ManyHarness({ n }: { n: number }) {
      const methods = useForm({
        defaultValues: { documents, titles: manyTitles(n), detail: {} } as never,
      });
      reverse = () =>
        methods.setValue(
          'titles' as never,
          [...(methods.getValues('titles' as never) as unknown[])].reverse() as never,
        );
      return (
        <FormProvider {...methods}>
          <DocumentUploader getOrCreateSession={async () => 'session'} />
        </FormProvider>
      );
    }
    const sectionButton = (number: string) =>
      screen.getByRole('button', { name: new RegExp(`Title ${number}\\b`) });

    it('starts the title sections closed, the request open, and keeps the progress in the header', () => {
      render(<ManyHarness n={21} />);
      expect(sectionButton('1000')).toHaveAttribute('aria-expanded', 'false');
      expect(sectionButton('1000')).toHaveTextContent(/Required 0\/1/);
      expect(screen.getByText('summary-part1.pdf', { exact: false })).toBeInTheDocument(); // request level
      expect(screen.getAllByText('Deed')).toHaveLength(1); // only the request's own row; no title rows mounted
    });

    it('opens everything with Expand all, and keeps a section the maker opened through a reorder', async () => {
      const { user } = render(<ManyHarness n={21} />);
      await user.click(sectionButton('1005'));
      expect(sectionButton('1005')).toHaveAttribute('aria-expanded', 'true');
      expect(sectionButton('1004')).toHaveAttribute('aria-expanded', 'false');

      act(() => reverse());
      expect(sectionButton('1005')).toHaveAttribute('aria-expanded', 'true');
      expect(sectionButton('1004')).toHaveAttribute('aria-expanded', 'false');

      await user.click(screen.getByRole('button', { name: /Expand all/i }));
      expect(sectionButton('1004')).toHaveAttribute('aria-expanded', 'true');
    });

    it('opens the sections that match a search, whatever was closed by hand', async () => {
      const { user } = render(<ManyHarness n={21} />);
      await user.click(sectionButton('1002'));
      await user.click(screen.getByRole('button', { name: /Collapse all/i }));
      expect(sectionButton('1002')).toHaveAttribute('aria-expanded', 'false');

      await user.type(screen.getByRole('searchbox'), 'deed');
      expect(sectionButton('1002')).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getAllByText('Deed').length).toBeGreaterThan(1);

      // while it is on, nothing can be stored for after it: no toggles, no expand/collapse all
      expect(sectionButton('1002')).toBeDisabled();
      expect(screen.queryByRole('button', { name: /Expand all/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Collapse all/i })).not.toBeInTheDocument();
    });

    it('does not close what the maker has open when a title is added', () => {
      let add: () => void = () => {};
      function Adding() {
        const { getValues, setValue } = useFormContext();
        add = () =>
          setValue('titles', [
            ...getValues('titles'),
            { id: 'new-1', collateralType: '01', titleNumber: '9999', documents: [] },
          ]);
        return null;
      }
      function AddHarness() {
        const methods = useForm({
          defaultValues: { documents, titles: manyTitles(20), detail: {} } as never,
        });
        return (
          <FormProvider {...methods}>
            <DocumentUploader getOrCreateSession={async () => 'session'} />
            <Adding />
          </FormProvider>
        );
      }
      render(<AddHarness />);
      expect(sectionButton('1000')).toHaveAttribute('aria-expanded', 'true');
      act(() => add()); // the 21st
      expect(sectionButton('1000')).toHaveAttribute('aria-expanded', 'true');
      expect(sectionButton('9999')).toHaveAttribute('aria-expanded', 'true');
    });

    it('forgets what was set by hand for unsaved titles when titles are removed', async () => {
      let removeFirst: () => void = () => {};
      function Removing() {
        const { getValues, setValue } = useFormContext();
        removeFirst = () => setValue('titles', getValues('titles').slice(1));
        return null;
      }
      function UnsavedHarness() {
        const methods = useForm({
          defaultValues: {
            documents,
            titles: manyTitles(25).map(title => ({ ...title, id: undefined })),
            detail: {},
          } as never,
        });
        return (
          <FormProvider {...methods}>
            <DocumentUploader getOrCreateSession={async () => 'session'} />
            <Removing />
          </FormProvider>
        );
      }
      const { user } = render(<UnsavedHarness />);
      await user.click(sectionButton('1005'));
      expect(sectionButton('1005')).toHaveAttribute('aria-expanded', 'true');

      act(() => removeFirst());
      // the "open" was for a position; it does not move on to another title
      expect(sectionButton('1005')).toHaveAttribute('aria-expanded', 'false');
      expect(sectionButton('1006')).toHaveAttribute('aria-expanded', 'false');
    });

    describe("unsaved titles and the card's memory of them", () => {
      let setTitles: (fn: (titles: unknown[]) => unknown[]) => void = () => {};
      const photos = Array.from({ length: 6 }, (_, k) =>
        doc({
          documentType: 'D010',
          displayName: 'Photos',
          documentId: `p${k}`,
          fileName: `p${k}.jpg`,
        }),
      );
      function UnsavedHarness({ n }: { n: number }) {
        const methods = useForm({
          defaultValues: {
            documents,
            titles: manyTitles(n).map(title => ({ ...title, id: undefined, documents: photos })),
            detail: {},
          } as never,
        });
        setTitles = fn =>
          methods.setValue('titles' as never, fn(methods.getValues('titles' as never)) as never);
        return (
          <FormProvider {...methods}>
            <DocumentUploader getOrCreateSession={async () => 'session'} />
          </FormProvider>
        );
      }

      it('forgets what was set by hand when unsaved titles are reordered', async () => {
        const { user } = render(<UnsavedHarness n={25} />);
        await user.click(sectionButton('1005'));
        expect(sectionButton('1005')).toHaveAttribute('aria-expanded', 'true');

        act(() => setTitles(titles => [...titles].reverse()));
        // position 5 now holds another title, which must not come out open
        expect(sectionButton('1019')).toHaveAttribute('aria-expanded', 'false');
        expect(sectionButton('1005')).toHaveAttribute('aria-expanded', 'false');
      });

      it('forgets which files were unfolded in an unsaved title when titles are removed', async () => {
        const { user } = render(<UnsavedHarness n={25} />);
        await user.click(sectionButton('1003'));
        await user.click(screen.getByRole('button', { name: '+3 files' }));
        expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();

        act(() => setTitles(titles => titles.slice(1)));
        await user.click(sectionButton('1004')); // the title now at that position
        expect(screen.getByRole('button', { name: '+3 files' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Show fewer' })).not.toBeInTheDocument();
      });

      it('decides the default again once every title is gone', () => {
        render(<UnsavedHarness n={5} />);
        expect(sectionButton('1000')).toHaveAttribute('aria-expanded', 'true');

        act(() => setTitles(() => []));
        act(() => setTitles(() => manyTitles(25)));
        expect(sectionButton('1000')).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('keeps every section open at 20 titles', () => {
      render(<ManyHarness n={20} />);
      expect(sectionButton('1000')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('document type names', () => {
    const withUiLanguage = async (language: string, run: () => Promise<void> | void) => {
      const original = i18n.language;
      Object.defineProperty(i18n, 'language', {
        value: language,
        configurable: true,
        writable: true,
      });
      typeList.data = [
        {
          code: 'D013',
          name: 'Original Size Ownership Document',
          nameTh: 'เอกสารสิทธิ์ขนาดเท่าตัวจริง',
        },
        { code: 'D014', name: 'Contract', nameTh: 'สัญญา' },
      ];
      try {
        await run();
      } finally {
        Object.defineProperty(i18n, 'language', {
          value: original,
          configurable: true,
          writable: true,
        });
        typeList.data = [];
      }
    };

    it('shows the Thai name in a Thai UI, over the English name the form row carries', () =>
      withUiLanguage('th', () => {
        render(<Harness />);
        expect(screen.getByText('เอกสารสิทธิ์ขนาดเท่าตัวจริง')).toBeInTheDocument();
        expect(screen.queryByText('Deed')).not.toBeInTheDocument(); // the row's English displayName
        expect(screen.getByText('D013', { exact: false })).toBeInTheDocument(); // codes stay
      }));

    it('shows the English name in an English UI', () =>
      withUiLanguage('en', () => {
        render(<Harness />);
        expect(screen.getByText('Original Size Ownership Document')).toBeInTheDocument();
        expect(screen.queryByText('เอกสารสิทธิ์ขนาดเท่าตัวจริง')).not.toBeInTheDocument();
      }));

    it('finds a type by its Thai or its English name', () =>
      withUiLanguage('th', async () => {
        const { user } = render(<Harness />);
        await user.type(screen.getByRole('searchbox'), 'Ownership');
        expect(screen.getByText('เอกสารสิทธิ์ขนาดเท่าตัวจริง')).toBeInTheDocument();
        await user.clear(screen.getByRole('searchbox'));
        await user.type(screen.getByRole('searchbox'), 'สัญญา');
        expect(screen.getByText('สัญญา')).toBeInTheDocument(); // the empty optional type is a row now
      }));
  });
});
