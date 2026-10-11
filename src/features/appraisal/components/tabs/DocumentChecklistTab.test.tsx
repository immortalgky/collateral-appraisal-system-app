import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocation } from 'react-router-dom';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { PageReadOnlyContext, usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { AppraisalProvider } from '../../context/AppraisalContext';
import { DocumentChecklistTab } from './DocumentChecklistTab';

// The tabs' own contents have their own tests; each stub only says what it was handed.
const Stub = ({ name, extra = '' }: { name: string; extra?: string }) => (
  <div>
    {name} readonly:{String(usePageReadOnly())} {extra}
  </div>
);
vi.mock('../RequestDocumentsSection', () => ({
  default: () => <Stub name="request-list" />,
}));
vi.mock('./ValuationDocumentChecklist', () => ({
  default: ({ allowGenerate }: { allowGenerate?: boolean }) => (
    <Stub name="valuation-list" extra={`generate:${String(allowGenerate)}`} />
  ),
}));
vi.mock('./AppendixTab', () => ({
  default: () => <Stub name="appendix" />,
}));
vi.mock('./ReportPreviewTab', () => ({
  default: ({ allowGenerate }: { allowGenerate?: boolean }) => (
    <div>book-preview generate:{String(allowGenerate)}</div>
  ),
}));
vi.mock('./MachineryBookSection1Tab', () => ({ default: () => <div>machinery</div> }));
vi.mock('../../hooks/useEnrichedPropertyGroups', () => ({
  useEnrichedPropertyGroups: () => ({ groups: [] }),
}));
const loaded = vi.hoisted(() => ({ requestDocs: undefined as unknown }));
vi.mock('../../api', () => ({
  useGetRequestDocuments: () => ({ data: loaded.requestDocs }),
  useGetAppraisalDocuments: () => ({ data: { totalTypes: 4, typesWithFiles: 2, types: [] } }),
  useGetAppendices: () => ({
    data: { items: [{ documents: [{}, {}] }, { documents: [{}] }] },
  }),
}));
vi.mock('../../api/workflow', () => ({
  useGetActivityActions: () => ({ data: { canRaiseFollowup: true } }),
}));
vi.mock('@/features/document-followup/components/OpenFollowupBanner', () => ({
  OpenFollowupBanner: () => null,
}));
vi.mock('@/features/document-followup/components/RaiseFollowupDialog', () => ({
  RaiseFollowupDialog: () => null,
}));

const Location = () => <output data-testid="search">{useLocation().search}</output>;

const renderTab = (
  props: { embedded?: boolean; readOnly?: boolean; owner?: boolean } = {},
  entry = '/',
) =>
  render(
    <AppraisalProvider
      value={{
        appraisal: {
          appraisalId: 'A1',
          requestId: 'R1',
          isTaskOwner: props.owner ?? true,
          workflowInstanceId: 'W1',
          activityId: 'ACT1',
        },
        isLoading: false,
        isError: false,
        error: null,
      }}
    >
      <PageReadOnlyContext.Provider value={props.readOnly ?? false}>
        <DocumentChecklistTab embedded={props.embedded} />
        <Location />
      </PageReadOnlyContext.Provider>
    </AppraisalProvider>,
    { initialEntries: [entry] },
  );

beforeEach(() => {
  localStorage.clear();
  loaded.requestDocs = undefined;
});

describe('DocumentChecklistTab', () => {
  it('shows the tabs in order, valuation documents first, with their counts', () => {
    renderTab();
    expect(screen.getAllByRole('tab').map(tab => tab.id)).toEqual([
      'checklist-tab-valuation',
      'checklist-tab-request',
      'checklist-tab-appendix',
    ]);
    expect(screen.getByRole('tab', { name: /Valuation documents\s*2\/4/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /Request documents/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Report Book\s*3 files/ })).toBeInTheDocument();
    expect(screen.getByText(/valuation-list/)).toBeInTheDocument();
  });

  it('shows no badge on a tab whose data has not come in, neither "complete" nor a count', () => {
    renderTab();
    // the request documents are still loading in this render: no "Complete", no "missing"
    expect(screen.getByRole('tab', { name: /^Request documents$/ })).toBeInTheDocument();
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();
  });

  it('shows "Complete" once the request documents are in and nothing required is missing', () => {
    loaded.requestDocs = { totalDocuments: 0, totalUploaded: 0, sections: [] };
    renderTab();
    expect(screen.getByRole('tab', { name: /Request documents\s*Complete/ })).toBeInTheDocument();
  });

  it('remembers the chosen tab in the URL and in this browser, and a deep link wins over memory', async () => {
    const { user, unmount } = renderTab();
    await user.click(screen.getByRole('tab', { name: /Request documents/ }));
    expect(screen.getByText(/request-list/)).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?tab=request');
    expect(localStorage.getItem('appraisal.documentChecklist.tab')).toBe('request');
    unmount();

    // a visit with nothing in the URL starts where the viewer left off
    renderTab();
    expect(screen.getByText(/request-list/)).toBeInTheDocument();
  });

  it('opens the tab named in the link, whatever was remembered', () => {
    localStorage.setItem('appraisal.documentChecklist.tab', 'request');
    renderTab({}, '/?tab=appendix');
    expect(screen.getByText(/appendix readonly/)).toBeInTheDocument();
    expect(screen.getByText('book-preview generate:true')).toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys', async () => {
    const { user } = renderTab();
    screen.getByRole('tab', { name: /Valuation documents/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Request documents/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: /Report Book/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('offers "request more documents" only to an editor', () => {
    renderTab();
    expect(
      screen.getByRole('button', { name: 'Request Additional Documents' }),
    ).toBeInTheDocument();
  });

  it('hides it, and passes read-only to every tab, when the page is read-only', async () => {
    const { user } = renderTab({ readOnly: true });
    expect(screen.queryByRole('button', { name: 'Request Additional Documents' })).toBeNull();
    // a read-only page can still generate a report; only the embedded one cannot
    expect(screen.getByText('valuation-list readonly:true generate:true')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Request documents/ }));
    expect(screen.getByText('request-list readonly:true')).toBeInTheDocument();
  });

  describe('embedded in another page', () => {
    it('is read-only on every tab even when the page is editable, with no "request more" button', async () => {
      const { user } = renderTab({ embedded: true });
      expect(screen.queryByRole('button', { name: 'Request Additional Documents' })).toBeNull();
      // the valuation documents are first here too, and cannot generate a report from here
      expect(screen.getByText('valuation-list readonly:true generate:false')).toBeInTheDocument();
      await user.click(screen.getByRole('tab', { name: /Request documents/ }));
      expect(screen.getByText('request-list readonly:true')).toBeInTheDocument();
      await user.click(screen.getByRole('tab', { name: /Report Book/ }));
      expect(screen.getByText('appendix readonly:true')).toBeInTheDocument();
      // the book is shown, not made, from here
      expect(screen.getByText('book-preview generate:false')).toBeInTheDocument();
    });

    it('leaves the host page URL and the page tab memory alone', async () => {
      localStorage.setItem('appraisal.documentChecklist.tab', 'appendix');
      const { user } = renderTab({ embedded: true }, '/?tab=appendix');
      // it neither reads the page's memory nor its URL
      expect(screen.getByText(/valuation-list/)).toBeInTheDocument();
      await user.click(screen.getByRole('tab', { name: /Request documents/ }));
      expect(screen.getByTestId('search')).toHaveTextContent('?tab=appendix');
      expect(localStorage.getItem('appraisal.documentChecklist.tab')).toBe('appendix');
    });
  });
});
