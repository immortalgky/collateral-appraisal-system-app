import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { fireEvent, render, screen, waitFor, within } from '@/test/test-utils';
import type { UploadedDocument } from '../../types/document';
import DocumentListView, { type ListSection } from './DocumentListView';

vi.mock('@/features/appraisal/utils/marketComparableFormat', () => ({
  thumbnailUrl: () => '',
}));

const doc = (over: Partial<UploadedDocument>): UploadedDocument => ({
  documentType: 'D1',
  fileName: null,
  uploadedAt: '2026-10-05T08:00:00',
  prefix: null,
  notes: null,
  filePath: null,
  createdWorkstation: null,
  isRequired: false,
  uploadedBy: 'u1',
  uploadedByName: 'User One',
  displayName: 'Type one',
  ...over,
});

const section = (over: Partial<ListSection> = {}): ListSection => ({
  key: 'valuation',
  kind: 'request',
  index: -1,
  label: 'Valuation list',
  documents: [
    doc({ id: 'a', documentId: 'da', fileName: 'one.pdf', notes: 'first note' }),
    doc({ id: 'b', documentType: 'D2', displayName: 'Type two' }),
    doc({ id: 'c', documentType: 'D3', displayName: 'Report', category: undefined } as never),
    doc({ id: 'd', documentType: 'D4', displayName: 'Required one', isRequired: true }),
  ],
  ...over,
});

const base = {
  title: 'Docs',
  typeName: (code: string, displayName?: string | null) => displayName || code,
  onView: vi.fn(),
  emptyLabel: 'Nothing here',
};

describe('DocumentListView', () => {
  it('draws one row per type, the missing required type as a row, and empty optional types as a chip line', () => {
    render(<DocumentListView {...base} sections={[section()]} editable={false} />);
    expect(screen.getByText('Type one')).toBeInTheDocument();
    expect(screen.getByText('Required one')).toBeInTheDocument();
    // the empty optional types are one line, not rows (no row action for them)
    expect(screen.getByText(/No file yet for 2 types/)).toHaveTextContent('Type two');
    expect(
      screen.queryByRole('button', { name: /Add a file to Type two/ }),
    ).not.toBeInTheDocument();
  });

  it('is view-only without upload, notes or delete when read-only', async () => {
    const { user } = render(<DocumentListView {...base} sections={[section()]} editable={false} />);
    expect(screen.queryByRole('button', { name: /Add a file to/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /one\.pdf/ }));
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    // the note is text, not an editor
    expect(screen.queryByRole('textbox', { name: 'Notes' })).not.toBeInTheDocument();
    expect(screen.getByText('first note', { selector: 'span' })).toBeInTheDocument();
  });

  it('uploads into a type, and edits notes and removes a file from the pane when editable', async () => {
    const onUpload = vi.fn();
    const onSaveNotes = vi.fn();
    const onRemove = vi.fn();
    const { user } = render(
      <DocumentListView
        {...base}
        sections={[section()]}
        editable
        onUpload={onUpload}
        onSaveNotes={onSaveNotes}
        onRemove={onRemove}
      />,
    );
    // no bulk checkboxes in this list
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add a file to Type one' }));
    expect(onUpload).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: 'D1' }),
      expect.objectContaining({ key: 'valuation' }),
    );

    await user.click(screen.getByRole('button', { name: /one\.pdf/ }));
    const notes = screen.getByRole('textbox', { name: 'Notes' });
    await user.clear(notes);
    await user.type(notes, 'edited');
    await user.click(screen.getByRole('button', { name: 'Save note' }));
    expect(onSaveNotes).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'edited');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onRemove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a' }),
      expect.objectContaining({ key: 'valuation' }),
    );
    // Replace and Move are not offered here
    expect(screen.queryByRole('button', { name: 'Replace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move…' })).not.toBeInTheDocument();
  });

  it('always shows a type that can be generated as a row, with its Generate button', async () => {
    const onGenerate = vi.fn();
    const { user } = render(
      <DocumentListView
        {...base}
        sections={[section()]}
        editable
        onUpload={vi.fn()}
        onGenerate={onGenerate}
        canGenerate={row => row.documentType === 'D3'}
      />,
    );
    // D3 is empty and optional, so it would be a chip, but it offers Generate and so is a row
    expect(screen.getByText('Report')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generate' }));
    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({ documentType: 'D3' }));
  });

  it('leaves out the section header of a flat list, and does not say "attach before submit"', () => {
    render(<DocumentListView {...base} sections={[section()]} editable={false} flat />);
    expect(screen.queryByRole('button', { name: /Valuation list/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Attach before Submit')).not.toBeInTheDocument();
  });

  it('searches by the text it is given, opening the sections that match', async () => {
    const sections = [
      section({ key: 'request', label: 'Request level' }),
      section({
        key: 'title-1',
        kind: 'title',
        index: 0,
        label: 'Title 1',
        documents: [
          doc({ id: 'x', documentType: 'D9', displayName: 'Deed', fileName: 'deed.pdf' }),
        ],
      }),
    ];
    const { user } = render(
      <DocumentListView
        {...base}
        sections={sections}
        editable={false}
        searchText={row => (row.documentType === 'D9' ? 'Deed โฉนด' : (row.displayName ?? ''))}
      />,
    );
    await user.type(screen.getByRole('searchbox'), 'โฉนด');
    const titleSection = screen.getByRole('button', { name: /Title 1/ });
    expect(titleSection).toBeDisabled(); // a search decides what is open
    expect(screen.getByRole('button', { name: /deed\.pdf/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Request level/ })).not.toBeInTheDocument();
  });

  it('says so when there is nothing to list', () => {
    render(<DocumentListView {...base} sections={[]} editable={false} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('starts the title sections closed when there are many, keeping the header numbers', () => {
    const titles = Array.from({ length: 21 }, (_, i) =>
      section({
        key: `t${i}`,
        kind: 'title',
        index: i,
        label: `Title ${1000 + i}`,
        documents: [
          doc({ id: `r${i}`, documentType: 'D7', displayName: 'Deed', isRequired: true }),
        ],
      }),
    );
    render(<DocumentListView {...base} sections={titles} editable={false} />);
    const header = screen.getByRole('button', { name: /Title 1000/ });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(within(header).getByText(/Required 0\/1/)).toBeInTheDocument();
  });

  it('counts and tags the files an appraiser asked for, whatever the case of the source', async () => {
    const { user } = render(
      <DocumentListView
        {...base}
        editable={false}
        sections={[
          section({
            documents: [
              doc({ id: 'a', documentId: 'da', fileName: 'one.pdf', source: 'FollowUp' }),
              doc({
                id: 'b',
                documentType: 'D2',
                documentId: 'db',
                fileName: 'two.pdf',
                source: 'REQUEST',
              }),
            ],
          }),
        ]}
      />,
    );
    // the chip and the count appear, and filtering by it leaves only the requested file
    await user.click(screen.getByRole('button', { name: 'Requested 1' }));
    expect(screen.getByRole('button', { name: /one\.pdf/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /two\.pdf/ })).not.toBeInTheDocument();
    // the pane says where the file came from, unless the list turns that line off
    await user.click(screen.getByRole('button', { name: /one\.pdf/ }));
    expect(screen.getByText('Source')).toBeInTheDocument();
  });

  it('can leave the "Source" line out of the pane', async () => {
    const { user } = render(
      <DocumentListView {...base} sections={[section()]} editable={false} showSource={false} />,
    );
    await user.click(screen.getByRole('button', { name: /one\.pdf/ }));
    expect(screen.queryByText('Source')).not.toBeInTheDocument();
  });

  describe('"show all types"', () => {
    beforeEach(() => localStorage.clear());

    it('turns the empty-types line into rows with their upload action, and back, and remembers it', async () => {
      const { user, unmount } = render(
        <DocumentListView
          {...base}
          sections={[section()]}
          editable
          onUpload={vi.fn()}
          allTypesToggleKey="test.allTypes"
        />,
      );
      expect(screen.getByText(/No file yet for 2 types/)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Add a file to Type two' }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Show all types' }));
      expect(screen.queryByText(/No file yet for/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add a file to Type two' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Show all types' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(localStorage.getItem('test.allTypes')).toBe('all');
      unmount();

      // a later visit starts with all types shown, and the switch turns them back into a line
      const { user: again } = render(
        <DocumentListView
          {...base}
          sections={[section()]}
          editable
          onUpload={vi.fn()}
          allTypesToggleKey="test.allTypes"
        />,
      );
      expect(screen.getByRole('button', { name: 'Add a file to Type two' })).toBeInTheDocument();
      await again.click(screen.getByRole('button', { name: 'Show all types' }));
      expect(screen.getByText(/No file yet for 2 types/)).toBeInTheDocument();
    });

    it('is not offered unless the list asks for it', () => {
      render(<DocumentListView {...base} sections={[section()]} editable={false} />);
      expect(screen.queryByRole('button', { name: 'Show all types' })).not.toBeInTheDocument();
    });
  });

  it('leaves out Expand all and Collapse all in a flat list, and keeps them in a sectioned one', () => {
    const { unmount } = render(
      <DocumentListView {...base} sections={[section()]} editable={false} flat />,
    );
    expect(screen.queryByRole('button', { name: /Expand all/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Collapse all/ })).not.toBeInTheDocument();
    unmount();
    render(<DocumentListView {...base} sections={[section()]} editable={false} />);
    expect(screen.getByRole('button', { name: /Expand all/ })).toBeInTheDocument();
  });

  it('never collapses the one section of a flat list, even with many titles-kind sections', () => {
    const many = Array.from({ length: 21 }, (_, k) =>
      section({ key: `t${k}`, kind: 'title', index: k, label: `Title ${k}` }),
    );
    // a flat list has no headers to toggle and starts open whatever its size
    render(<DocumentListView {...base} sections={many.slice(0, 1)} editable={false} flat />);
    expect(screen.getByText('Type one')).toBeInTheDocument();
  });

  describe('appendix-style rows', () => {
    it('offers a layout control on the rows shown, and reports the chosen columns', async () => {
      const onLayoutChange = vi.fn();
      const { user } = render(
        <DocumentListView
          {...base}
          sections={[section()]}
          editable
          onUpload={vi.fn()}
          layoutOf={() => 2}
          onLayoutChange={onLayoutChange}
        />,
      );
      const group = screen.getAllByRole('group', { name: 'Layout' })[0];
      expect(within(group).getByRole('button', { name: 'Layout: 2 per row' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await user.click(within(group).getByRole('button', { name: 'Layout: 3 per row' }));
      expect(onLayoutChange).toHaveBeenCalledWith(
        expect.objectContaining({ documentType: 'D1' }),
        3,
      );
    });

    it('has no layout control when read-only', () => {
      render(
        <DocumentListView
          {...base}
          sections={[section()]}
          editable={false}
          layoutOf={() => 2}
          onLayoutChange={vi.fn()}
        />,
      );
      expect(screen.queryByRole('group', { name: 'Layout' })).not.toBeInTheDocument();
    });

    it('hands files dropped on a row to the list, with that row and its section', () => {
      const onDropFiles = vi.fn();
      render(
        <DocumentListView
          {...base}
          sections={[section()]}
          editable
          onUpload={vi.fn()}
          onDropFiles={onDropFiles}
        />,
      );
      const row = screen.getByText('Type one').closest('div[class*="min-h-10"]') as HTMLElement;
      const file = new File(['x'], 'drop.pdf', { type: 'application/pdf' });
      const transfer = { types: ['Files'], files: [file] };
      fireEvent.dragOver(row, { dataTransfer: transfer });
      fireEvent.drop(row, { dataTransfer: transfer });
      expect(onDropFiles).toHaveBeenCalledWith(
        expect.objectContaining({ documentType: 'D1' }),
        [file],
        expect.objectContaining({ key: 'valuation' }),
      );
    });

    it("edits a file with the list's own edit, only where it can, under its own label", async () => {
      const onEdit = vi.fn();
      const sections = [
        section({
          documents: [
            doc({ id: 'img', documentId: 'di', fileName: 'photo.png' }),
            doc({ id: 'pdf', documentType: 'D2', documentId: 'dp', fileName: 'plan.pdf' }),
          ],
        }),
      ];
      const { user } = render(
        <DocumentListView
          {...base}
          sections={sections}
          editable
          onUpload={vi.fn()}
          onEdit={onEdit}
          canEdit={d => d.fileName?.endsWith('.png') ?? false}
          editLabel="Edit image"
        />,
      );
      // the image's menu has the entry, the PDF's does not
      const menus = screen.getAllByRole('button', { name: 'File actions' });
      await user.click(menus[0]);
      await user.click(screen.getByRole('menuitem', { name: 'Edit image' }));
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'img' }),
        expect.objectContaining({ key: 'valuation' }),
      );
      await user.click(screen.getAllByRole('button', { name: 'File actions' })[1]);
      expect(screen.queryByRole('menuitem', { name: 'Edit image' })).not.toBeInTheDocument();

      // and the pane has the button for the image
      await user.keyboard('{Escape}');
      await user.click(screen.getByRole('button', { name: /photo\.png/ }));
      expect(screen.getByRole('button', { name: 'Edit image' })).toBeInTheDocument();
    });
  });

  it('hands files dropped on an empty type\'s "+ type" chip to the list, with that type', () => {
    const onDropFiles = vi.fn();
    render(
      <DocumentListView
        {...base}
        sections={[section()]}
        editable
        onUpload={vi.fn()}
        onDropFiles={onDropFiles}
      />,
    );
    const chip = screen.getByRole('button', { name: '+ Type two' });
    const file = new File(['x'], 'drop.pdf', { type: 'application/pdf' });
    const transfer = { types: ['Files'], files: [file] };
    fireEvent.dragOver(chip, { dataTransfer: transfer });
    fireEvent.drop(chip, { dataTransfer: transfer });
    expect(onDropFiles).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: 'D2' }),
      [file],
      expect.objectContaining({ key: 'valuation' }),
    );
  });

  describe('in a drawer (a narrow card)', () => {
    class NarrowObserver {
      private callback: (entries: { contentRect: { width: number } }[]) => void;
      constructor(callback: (entries: { contentRect: { width: number } }[]) => void) {
        this.callback = callback;
      }
      observe() {
        this.callback([{ contentRect: { width: 500 } }]);
      }
      disconnect() {}
    }
    beforeEach(() => {
      vi.stubGlobal('ResizeObserver', NarrowObserver);
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 100, 100),
      );
    });
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('starts what Delete asks for once, after the drawer has closed (not from inside it)', async () => {
      const onRemove = vi.fn();
      const { user } = render(
        <DocumentListView
          {...base}
          sections={[section()]}
          editable
          onUpload={vi.fn()}
          onRemove={onRemove}
        />,
      );
      await user.click(screen.getByRole('button', { name: /one\.pdf/ }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      // the action is held until the drawer's leave transition has finished, then runs once
      await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(onRemove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a' }),
        expect.objectContaining({ key: 'valuation' }),
      );
    });
  });
});
