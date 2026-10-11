import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { fireEvent, render, screen } from '@/test/test-utils';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { AppraisalProvider } from '../../context/AppraisalContext';
import AppendixTab from './AppendixTab';

const h = vi.hoisted(() => ({
  addDocument: vi.fn(),
  removeDocument: vi.fn(),
  updateLayout: vi.fn(),
  uploadDocument: vi.fn(),
  download: vi.fn(),
  openViewer: vi.fn(),
}));

const appendices = {
  items: [
    {
      id: 'a1',
      appendixTypeId: 't1',
      appendixTypeCode: 'LAND_MAP',
      appendixTypeName: 'Land Map',
      sortOrder: 1,
      layoutColumns: 2,
      documents: [
        {
          id: 'p1',
          documentId: 'dp1',
          displaySequence: 1,
          fileName: 'map.png',
          mimeType: 'image/png',
          fileSizeBytes: 2048,
        },
        {
          id: 'p2',
          documentId: 'dp2',
          displaySequence: 2,
          fileName: 'plan.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 4096,
        },
      ],
    },
    {
      id: 'a2',
      appendixTypeId: 't2',
      appendixTypeCode: 'CITY_PLAN',
      appendixTypeName: 'City Plan',
      sortOrder: 2,
      layoutColumns: 1,
      documents: [],
    },
  ],
};

vi.mock('@features/appraisal/api', () => ({
  useGetAppendices: () => ({ data: appendices, isLoading: false, isError: false }),
  useAddAppendixDocument: () => ({ mutateAsync: h.addDocument }),
  useRemoveAppendixDocument: () => ({ mutate: h.removeDocument, isPending: false }),
  useUpdateAppendixLayout: () => ({ mutate: h.updateLayout }),
  useAddGalleryPhoto: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../../api/gallery', () => ({
  useGetGalleryPhotos: () => ({ data: { photos: [] }, isError: false }),
}));
vi.mock('@features/request/api/documents', () => ({
  createUploadSession: vi.fn().mockResolvedValue({ sessionId: 's1' }),
  useUploadDocument: () => ({ mutateAsync: h.uploadDocument }),
  useDownloadDocument: () => ({ mutateAsync: h.download }),
}));
vi.mock('../documentShared', async importOriginal => ({
  ...(await importOriginal<typeof import('../documentShared')>()),
  openDocumentViewer: h.openViewer,
}));
vi.mock('@/features/appraisal/utils/marketComparableFormat', () => ({ thumbnailUrl: () => '' }));
// The modals have their own tests; the stubs only say they are open.
vi.mock('../PhotoSourceModal', () => ({
  default: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div role="dialog">photo-source: {title}</div> : null,
}));
vi.mock('../GallerySelectionModal', () => ({ default: () => null }));
vi.mock('../AppendixChooserModal', () => ({
  default: ({
    isOpen,
    appendices: options,
  }: {
    isOpen: boolean;
    appendices: { appendixTypeName: string }[];
  }) =>
    isOpen ? (
      <div role="dialog">chooser: {options.map(o => o.appendixTypeName).join('|')}</div>
    ) : null,
}));

const renderTab = (readOnly = false) =>
  render(
    <AppraisalProvider
      value={{
        appraisal: { appraisalId: 'A1', requestId: 'R1' },
        isLoading: false,
        isError: false,
        error: null,
      }}
    >
      <PageReadOnlyContext.Provider value={readOnly}>
        <AppendixTab />
      </PageReadOnlyContext.Provider>
    </AppraisalProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // jsdom lays nothing out, so every box is 0x0 and Headless UI's dialog closes at once
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
});
afterEach(() => vi.restoreAllMocks());

describe('AppendixTab', () => {
  it('lists the appendix types as rows with their files, and the empty one as a chip', () => {
    renderTab();
    expect(screen.getByText('Land Map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /map\.png/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plan\.pdf/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ City Plan' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Expand all|Collapse all/ }),
    ).not.toBeInTheDocument();
  });

  it('shows the empty types as rows, with their layout, once "show all types" is on', async () => {
    const { user } = renderTab();
    expect(screen.getAllByRole('group', { name: 'Layout' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Show all types' }));
    expect(screen.getAllByRole('group', { name: 'Layout' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: '+ City Plan' })).not.toBeInTheDocument();
  });

  it('changes the layout of a type through the existing mutation', async () => {
    const { user } = renderTab();
    await user.click(screen.getByRole('button', { name: 'Layout: 3 per row' }));
    expect(h.updateLayout).toHaveBeenCalledWith(
      { appraisalId: 'A1', appendixId: 'a1', layoutColumns: 3 },
      expect.any(Object),
    );
  });

  it('opens the photo source for a type from its row, and the chooser from "Add Files"', async () => {
    const { user } = renderTab();
    await user.click(screen.getByRole('button', { name: 'Add a file to Land Map' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('photo-source: Add Land Map');
  });

  it('asks which appendix first from "Add Files"', async () => {
    const { user } = renderTab();
    await user.click(screen.getByRole('button', { name: 'Add Files' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('chooser: Land Map|City Plan');
  });

  it('offers "Edit image" for an image only, never for a PDF', async () => {
    const { user } = renderTab();
    const menus = screen.getAllByRole('button', { name: 'File actions' });
    await user.click(menus[0]); // map.png
    expect(screen.getByRole('menuitem', { name: 'Edit image' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getAllByRole('button', { name: 'File actions' })[1]); // plan.pdf
    expect(screen.queryByRole('menuitem', { name: 'Edit image' })).not.toBeInTheDocument();
  });

  it('asks before removing a file, then removes it from its own appendix', async () => {
    const { user } = renderTab();
    await user.click(screen.getByRole('button', { name: /plan\.pdf/ }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(h.removeDocument).not.toHaveBeenCalled();
    // the pane's own Delete is still there; the dialog's confirm is the last one
    await user.click(screen.getAllByText('Delete', { selector: 'button' }).at(-1) as HTMLElement);
    expect(h.removeDocument).toHaveBeenCalledWith(
      { appraisalId: 'A1', appendixId: 'a1', documentId: 'p2' },
      expect.any(Object),
    );
  });

  it('opens a file from its pane in the viewer', async () => {
    const { user } = renderTab();
    await user.click(screen.getByRole('button', { name: /plan\.pdf/ }));
    await user.click(screen.getByRole('button', { name: 'Open in new tab' }));
    expect(h.openViewer).toHaveBeenCalledWith(expect.objectContaining({ id: 'p2' }));
    // appendix files have no notes and no request source: neither block is in the pane
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
    expect(screen.queryByText('Source')).not.toBeInTheDocument();
  });

  it('puts a PDF dropped on a row straight into that appendix, after its last file', async () => {
    h.uploadDocument.mockResolvedValue({ documentId: 'new-doc' });
    h.addDocument.mockResolvedValue({});
    renderTab();
    const row = screen.getByText('Land Map').closest('div[class*="min-h-10"]') as HTMLElement;
    const pdf = new File(['x'], 'extra.pdf', { type: 'application/pdf' });
    const transfer = { types: ['Files'], files: [pdf] };
    fireEvent.dragOver(row, { dataTransfer: transfer });
    fireEvent.drop(row, { dataTransfer: transfer });
    await vi.waitFor(() => expect(h.addDocument).toHaveBeenCalled());
    expect(h.addDocument).toHaveBeenCalledWith({
      appraisalId: 'A1',
      appendixId: 'a1',
      body: { documentId: 'new-doc', displaySequence: 3 },
    });
  });

  it('takes a PDF dropped on an empty type\'s "+ type" chip into that appendix', async () => {
    h.uploadDocument.mockResolvedValue({ documentId: 'new-doc' });
    h.addDocument.mockResolvedValue({});
    renderTab();
    const chip = screen.getByRole('button', { name: '+ City Plan' });
    const pdf = new File(['x'], 'plan.pdf', { type: 'application/pdf' });
    const transfer = { types: ['Files'], files: [pdf] };
    fireEvent.dragOver(chip, { dataTransfer: transfer });
    fireEvent.drop(chip, { dataTransfer: transfer });
    await vi.waitFor(() => expect(h.addDocument).toHaveBeenCalled());
    expect(h.addDocument).toHaveBeenCalledWith({
      appraisalId: 'A1',
      appendixId: 'a2',
      body: { documentId: 'new-doc', displaySequence: 1 },
    });
  });

  it('is view-only when read-only: no layout, upload, edit, delete, drop or Add Files', async () => {
    const { user } = renderTab(true);
    expect(screen.queryByRole('group', { name: 'Layout' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add a file to/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Files' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /map\.png/ }));
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit image' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open in new tab' })).toBeInTheDocument();
  });
});
