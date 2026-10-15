import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { AppraisalProvider } from '../../context/AppraisalContext';
import ValuationDocumentChecklist from './ValuationDocumentChecklist';

const h = vi.hoisted(() => ({
  updateNotes: vi.fn(),
  remove: vi.fn(),
  trigger: vi.fn(),
  view: vi.fn(),
}));

const state = vi.hoisted(() => ({ empty: false }));
const fullData = {
  totalTypes: 3,
  typesWithFiles: 1,
  types: [
    {
      code: 'D001',
      name: 'Appraisal Book',
      nameTh: null,
      category: 'VAL_REPORT',
      totalFiles: 0,
      files: [],
    },
    {
      code: 'V010',
      name: 'Market Survey',
      nameTh: null,
      category: 'VAL_DOC',
      totalFiles: 1,
      files: [
        {
          id: 'f1',
          documentId: 'doc1',
          fileName: 'survey.pdf',
          notes: 'zone A',
          fileSizeBytes: 2048,
          sortOrder: 1,
        },
      ],
    },
    { code: 'V020', name: 'Zoning', nameTh: null, category: 'VAL_DOC', totalFiles: 0, files: [] },
  ],
};

vi.mock('@features/appraisal/api', () => ({
  useGetAppraisalDocuments: () => ({
    data: state.empty ? { totalTypes: 0, typesWithFiles: 0, types: [] } : fullData,
    isLoading: false,
    isError: false,
  }),
  useAttachAppraisalDocument: () => ({ mutateAsync: vi.fn() }),
  useRemoveAppraisalDocument: () => ({ mutate: h.remove, isPending: false }),
  useUpdateAppraisalDocumentNotes: () => ({ mutate: h.updateNotes }),
}));
vi.mock('@features/request/api/documents', () => ({
  createUploadSession: vi.fn(),
  useUploadDocument: () => ({ mutateAsync: vi.fn() }),
  useViewDocument: () => h.view,
}));
vi.mock('@features/reportGeneration/hooks/useAsyncReportJob', () => ({
  useAsyncReportJob: () => ({ trigger: h.trigger }),
}));
vi.mock('@/features/appraisal/utils/marketComparableFormat', () => ({ thumbnailUrl: () => '' }));

const renderList = (readOnly = false, allowGenerate = true) =>
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
        <ValuationDocumentChecklist allowGenerate={allowGenerate} />
      </PageReadOnlyContext.Provider>
    </AppraisalProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  state.empty = false;
  // jsdom lays nothing out, so every box is 0x0 and Headless UI's dialog closes at once
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
});
afterEach(() => vi.restoreAllMocks());

describe('ValuationDocumentChecklist', () => {
  it('lists the types as rows, with Generate on the system-generated one and an empty type as a chip', () => {
    renderList();
    expect(screen.getByText('Market Survey')).toBeInTheDocument();
    expect(screen.getByText('Appraisal Book')).toBeInTheDocument(); // a row, not a chip
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Zoning' })).toBeInTheDocument();
    expect(screen.getByText('1/3 types')).toBeInTheDocument();
  });

  it('generates the report for the type, and opens a file from its chip', async () => {
    const { user } = renderList();
    await user.click(screen.getByRole('button', { name: 'Generate' }));
    expect(h.trigger).toHaveBeenCalledWith('appraisal-book', 'A1', { autoOpen: true });
    await user.click(screen.getByRole('button', { name: /survey\.pdf/ }));
    await user.click(screen.getByRole('button', { name: 'Open in new tab' }));
    expect(h.view).toHaveBeenCalledWith('doc1', 2048, 'survey.pdf');
  });

  it('shows the note, saves an edited one, and confirms before removing a file', async () => {
    const { user } = renderList();
    await user.click(screen.getByRole('button', { name: /survey\.pdf/ }));
    const notes = screen.getByRole('textbox', { name: 'Notes' });
    expect(notes).toHaveValue('zone A');
    await user.clear(notes);
    await user.type(notes, 'zone B');
    await user.click(screen.getByRole('button', { name: 'Save note' }));
    expect(h.updateNotes).toHaveBeenCalledWith(
      { appraisalId: 'A1', id: 'f1', body: { notes: 'zone B' } },
      expect.any(Object),
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(h.remove).not.toHaveBeenCalled(); // asks first
    expect(await screen.findByText('Remove Document')).toBeInTheDocument();
    await user.click(screen.getByText('Remove', { selector: 'button' }));
    expect(h.remove).toHaveBeenCalledWith({ appraisalId: 'A1', id: 'f1' }, expect.any(Object));
  });

  it('has no file input when read-only, and one when editable', () => {
    const { container, unmount } = renderList(false);
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
    unmount();
    const readOnly = renderList(true);
    expect(readOnly.container.querySelector('input[type="file"]')).toBeNull();
  });

  it('cannot attach, edit notes or remove when read-only, but still opens and generates', async () => {
    const { user } = renderList(true);
    expect(screen.queryByRole('button', { name: /Add a file to/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Zoning' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /survey\.pdf/ }));
    expect(screen.queryByRole('textbox', { name: 'Notes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open in new tab' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
  });

  it('has no Generate button where it may not generate (the embedded checklist)', () => {
    renderList(true, false);
    expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument();
    // the system-generated type is then an ordinary empty type, a chip in the optional line
    expect(screen.getByText(/No file yet for 2 types/)).toBeInTheDocument();
  });

  it('does not describe a valuation file by the request wording in the pane', async () => {
    const { user } = renderList();
    await user.click(screen.getByRole('button', { name: /survey\.pdf/ }));
    expect(screen.getByText('Open in new tab')).toBeInTheDocument();
    expect(screen.queryByText('Source')).not.toBeInTheDocument();
    expect(screen.queryByText(/Uploaded for this request/)).not.toBeInTheDocument();
  });

  it('says the valuation list is empty, in the valuation wording, when there are no types', () => {
    state.empty = true;
    renderList();
    expect(screen.getByText('No document types found')).toBeInTheDocument();
  });
});
