import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BriefDocument } from '../api/appraisalBrief';
import DocumentList from './DocumentList';

const trigger = vi.hoisted(() => vi.fn());
const jobs = vi.hoisted(() => ({
  current: [] as { jobId: string; entityId: string; reportTypeKey: string; resolved: boolean }[],
}));
vi.mock('@features/reportGeneration/hooks/useAsyncReportJob', () => ({
  JobPoller: () => null,
  useAsyncReportJob: () => ({ trigger, jobsForEntity: () => jobs.current }),
}));
vi.mock('@features/request/api/documents', () => ({
  useViewDocument: () => vi.fn(),
  useDownloadDocument: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k.split('.').pop() }),
}));

const doc = (typeCode: string, documentId = typeCode): BriefDocument => ({
  documentId,
  typeCode,
  typeName: typeCode,
  typeNameTh: null,
  isPrimary: true,
  fileName: `${typeCode}.pdf`,
  fileSizeBytes: 1024,
  uploadedAt: null,
});

const renderList = (
  documents: BriefDocument[],
  over: { released?: boolean; canGenerate?: boolean } = {},
) =>
  render(
    <DocumentList
      documents={documents}
      released={over.released ?? true}
      lockedReason="locked"
      appraisalId="a1"
      summaryTypeName="Appraisal Summary"
      canGenerate={over.canGenerate ?? true}
    />,
  );

describe('DocumentList summary generation', () => {
  beforeEach(() => {
    trigger.mockReset().mockResolvedValue(undefined);
    jobs.current = [];
  });

  it('shows a placeholder with a generate button when there is no D042/D043, even with no documents', () => {
    renderList([]);
    expect(screen.getByText('Appraisal Summary')).toBeInTheDocument();
    expect(screen.getByText('noFile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/ })).toBeInTheDocument();
  });

  it('triggers the appraisal-summary report job, opening the PDF', () => {
    renderList([doc('D001')]);
    fireEvent.click(screen.getByRole('button', { name: /generate/ }));
    expect(trigger).toHaveBeenCalledWith('appraisal-summary', 'a1', { autoOpen: true });
  });

  it('sends one request for two fast clicks, and re-enables once the enqueue settles', async () => {
    let settle!: () => void;
    trigger.mockReturnValue(new Promise<void>(r => (settle = r)));
    renderList([doc('D001')]);
    const button = screen.getByRole('button', { name: /generate/ });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    settle();
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('keeps the file name on a busy summary tile and disables only its regenerate button', () => {
    jobs.current = [
      { jobId: 'j1', entityId: 'a1', reportTypeKey: 'appraisal-summary', resolved: false },
    ];
    renderList([doc('D043')]);
    expect(screen.getByText(/D043\.pdf/)).toBeInTheDocument();
    expect(screen.queryByText('generating')).toBeNull();
    expect(screen.getByTitle('regenerate')).toBeDisabled();
  });

  it('triggers the same job from the regenerate button on an existing tile', () => {
    renderList([doc('D043')]);
    fireEvent.click(screen.getByTitle('regenerate'));
    expect(trigger).toHaveBeenCalledWith('appraisal-summary', 'a1', { autoOpen: true });
  });

  it('shows the waiting state and disables the buttons while a job for this report is unresolved', () => {
    jobs.current = [
      { jobId: 'j1', entityId: 'a1', reportTypeKey: 'appraisal-summary', resolved: false },
    ];
    renderList([]);
    expect(screen.getByText('generating')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/ })).toBeDisabled();
  });

  it('is idle once the job is resolved, or when the job is another report', () => {
    jobs.current = [
      { jobId: 'j1', entityId: 'a1', reportTypeKey: 'appraisal-summary', resolved: true },
      { jobId: 'j2', entityId: 'a1', reportTypeKey: 'other', resolved: false },
    ];
    renderList([]);
    expect(screen.getByRole('button', { name: /generate/ })).toBeEnabled();
  });

  it('offers regenerate on an existing D043 tile and no placeholder', () => {
    renderList([doc('D043')]);
    expect(screen.getByTitle('regenerate')).toBeInTheDocument();
    expect(screen.queryByText('noFile')).toBeNull();
  });

  it('offers regenerate on a D042 tile too', () => {
    renderList([doc('D042')]);
    expect(screen.getByTitle('regenerate')).toBeInTheDocument();
  });

  it('shows neither placeholder nor regenerate for a cancelled appraisal', () => {
    renderList([doc('D043')], { canGenerate: false });
    expect(screen.queryByTitle('regenerate')).toBeNull();
    renderList([doc('D001')], { canGenerate: false });
    expect(screen.queryByText('noFile')).toBeNull();
  });

  it('shows only the locked card when not released', () => {
    renderList([], { released: false });
    expect(screen.getByText('locked')).toBeInTheDocument();
    expect(screen.queryByText('noFile')).toBeNull();
  });
});
