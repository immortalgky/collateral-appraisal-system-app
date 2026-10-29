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
  useTranslation: () => ({
    // Appends an interpolated `number` so the carried-from chip's value is assertable.
    t: (k: string, o?: { number?: string }) =>
      k.split('.').pop() + (o?.number ? ` ${o.number}` : ''),
  }),
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
  source: 'Appraisal',
  titleNumber: null,
  collateralTypeName: null,
  carriedFromAppraisalNumber: null,
});

const other = (documentId: string, over: Partial<BriefDocument> = {}): BriefDocument => ({
  ...doc(documentId),
  isPrimary: false,
  ...over,
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

  it('shows only the locked card when not released and there are no rows', () => {
    renderList([], { released: false });
    expect(screen.getByText('locked')).toBeInTheDocument();
    expect(screen.queryByText('noFile')).toBeNull();
    expect(screen.queryByText('others')).toBeNull();
  });

  it('still lists request and title rows under the lock card when not released', () => {
    renderList([other('R1', { source: 'Request' }), other('T1', { source: 'Title' })], {
      released: false,
    });
    expect(screen.getByText('locked')).toBeInTheDocument();
    expect(screen.queryByText('noFile')).toBeNull();
    expect(screen.getByText(/R1\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/T1\.pdf/)).toBeInTheDocument();
  });
});

describe('DocumentList other documents', () => {
  const mixed = () => [
    doc('D043'),
    other('R1', { source: 'Request' }),
    other('R2', { source: 'Request', carriedFromAppraisalNumber: '69105531' }),
    other('T1', {
      source: 'Title',
      titleNumber: 'LT-1',
      collateralTypeName: 'ที่ดิน',
    }),
  ];
  const chip = (name: RegExp) => screen.getByRole('button', { name });

  it('counts each source on its chip and disables a chip with none', () => {
    renderList(mixed());
    expect(chip(/filterAll 3/)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(/Request 2/)).toBeEnabled();
    expect(chip(/Title 1/)).toBeEnabled();
    expect(chip(/Appraisal 0/)).toBeDisabled();
  });

  it('does not count the primary tile among the others', () => {
    renderList(mixed());
    // D043 is a tile (file name + size); the three others are quiet rows led by their type code.
    expect(screen.getAllByText(/^(R1|R2|T1) · /)).toHaveLength(3);
    expect(screen.queryByText(/^D043 · /)).toBeNull();
  });

  it('filters the list by the chosen source and back to all', () => {
    renderList(mixed());
    fireEvent.click(chip(/Title 1/));
    expect(chip(/Title 1/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/T1\.pdf/)).toBeInTheDocument();
    expect(screen.queryByText(/R1\.pdf/)).toBeNull();
    fireEvent.click(chip(/filterAll/));
    expect(screen.getByText(/R1\.pdf/)).toBeInTheDocument();
  });

  it('labels a request row, adds the carried-from chip, and names the title row', () => {
    renderList(mixed());
    expect(screen.getAllByText('Request', { selector: 'span[title]' })).toHaveLength(2);
    expect(screen.getByText('carriedFrom 69105531')).toBeInTheDocument();
    expect(screen.getByText('LT-1 · ที่ดิน')).toBeInTheDocument();
  });

  it('falls back to the plain collateral label when a title row has no number or type', () => {
    renderList([other('T2', { source: 'Title' })]);
    // The filter button reads "Title 1", so an exact "Title" match is the row chip.
    expect(screen.getByText('Title', { selector: 'span[title]' })).toBeInTheDocument();
  });

  it('joins only the title parts that exist', () => {
    renderList([other('T3', { source: 'Title', titleNumber: 'LT-9' })]);
    expect(screen.getByText('LT-9')).toBeInTheDocument();
  });

  it('puts the carried-from chip on a title row too', () => {
    renderList([
      other('T4', { source: 'Title', titleNumber: 'LT-4', carriedFromAppraisalNumber: '69100001' }),
    ]);
    expect(screen.getByText('LT-4')).toBeInTheDocument();
    expect(screen.getByText('carriedFrom 69100001')).toBeInTheDocument();
  });

  it('hides the Appraisal filter while locked', () => {
    renderList([other('R1', { source: 'Request' })], { released: false });
    expect(screen.queryByRole('button', { name: /Appraisal/ })).toBeNull();
    expect(chip(/Request 1/)).toBeEnabled();
  });

  it('says the appraisal has no files, then still lists request rows', () => {
    renderList([other('R1', { source: 'Request' })], { canGenerate: false });
    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(screen.getByText(/R1\.pdf/)).toBeInTheDocument();
  });

  it('lists the same document once per source it is linked from', () => {
    renderList([
      other('D9', { source: 'Request' }),
      other('D9', { source: 'Title', titleNumber: 'LT-9' }),
    ]);
    expect(screen.getAllByText(/^D9 · D9\.pdf/)).toHaveLength(2);
  });

  it('heads a row with the file name when the type master gave no name or code', () => {
    renderList([
      other('X', { source: 'Request', typeCode: '', typeName: null, fileName: 'scan.pdf' }),
    ]);
    expect(screen.getByText('scan.pdf')).toBeInTheDocument();
  });

  it('still offers Generate when the only D043 is attached to the request', () => {
    renderList([other('D043', { source: 'Request', typeCode: 'D043' })]);
    expect(screen.getByText('noFile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/ })).toBeInTheDocument();
  });
});
