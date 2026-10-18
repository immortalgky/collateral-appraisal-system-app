import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { render, screen, waitFor } from '@/test/test-utils';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import type { UploadedDocument } from '../types/document';
import DocumentUploader from './DocumentUploader';

const generate = vi.hoisted(() => vi.fn());
vi.mock('../hooks/useAppointmentLetter', async importOriginal => ({
  ...(await importOriginal<typeof import('../hooks/useAppointmentLetter')>()),
  useAppointmentLetter: () => ({ busy: false, generate }),
}));
const toasts = vi.hoisted(() => ({ info: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(toasts.info, {
    success: toasts.success,
    error: toasts.error,
    dismiss: vi.fn(),
    remove: vi.fn(),
  }),
}));
vi.mock('../api/documentTypes', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/documentTypes')>()),
  useGetDocumentTypes: () => ({ data: [] }),
}));
vi.mock('./FileAssignmentModal', () => ({ default: () => null }));

const doc = (over: Partial<UploadedDocument>): UploadedDocument => ({
  documentType: 'D035',
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
const letter = {
  file: new File(['x'], 'appointment-letter.pdf'),
  documentId: 'new',
  fileName: 'appointment-letter.pdf',
};

let names: () => (string | null)[] = () => [];
function Names() {
  const documents = (useWatch({ name: 'documents' }) ?? []) as UploadedDocument[];
  names = () => documents.filter(d => d.documentType === 'D035').map(d => d.fileName);
  return null;
}
function Harness({
  docs = [],
  saved = true,
  readOnly = false,
}: {
  docs?: UploadedDocument[];
  saved?: boolean;
  readOnly?: boolean;
}) {
  const methods = useForm({
    defaultValues: { documents: docs, titles: [] as unknown[], detail: { prevAppraisalId: null } },
  });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...methods}>
        <DocumentUploader
          getOrCreateSession={async () => 's'}
          requestId={saved ? 'req-1' : undefined}
        />
        <Names />
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
}
const generateButton = () => screen.getByRole('button', { name: 'Generate' });
// The confirm dialog is a <dialog> that is not `open` for the accessibility tree: found by its text
const confirmButton = () => screen.getByText('Generate the letter');

beforeEach(() => {
  generate.mockReset();
  Object.values(toasts).forEach(fn => fn.mockClear());
});

describe('the appointment letter on the document card', () => {
  it('has no button in the card header, and always shows the D035 row with Generate', () => {
    render(<Harness />);
    expect(screen.queryByRole('button', { name: /Appointment Letter/i })).not.toBeInTheDocument();
    // optional and empty, yet a full row (not folded into the "+ type" line), with its own actions
    expect(screen.getAllByText('D035').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '+ D035' })).not.toBeInTheDocument();
    expect(generateButton()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add a file to/i })).toBeInTheDocument();
  });

  it('does not add a second row when the checklist already lists D035', () => {
    render(<Harness docs={[doc({ isRequired: true, displayName: 'Appointment request' })]} />);
    expect(screen.getAllByText('Appointment request')).toHaveLength(1);
    expect(screen.getByTitle('Required')).toBeInTheDocument();
  });

  it('generates the letter straight into the row when it has no file', async () => {
    generate.mockResolvedValue(letter);
    const { user } = render(<Harness />);
    await user.click(generateButton());
    await waitFor(() => expect(names()).toEqual(['appointment-letter.pdf']));
    expect(toasts.success).toHaveBeenCalled();
  });

  it('fills the empty slot a required row has, rather than adding beside it', async () => {
    generate.mockResolvedValue(letter);
    const { user } = render(<Harness docs={[doc({ isRequired: true, displayName: 'Appt' })]} />);
    await user.click(generateButton());
    await waitFor(() => expect(names()).toEqual(['appointment-letter.pdf']));
  });

  it('takes the pending letter back out when generating fails', async () => {
    generate.mockResolvedValue(null);
    const { user } = render(<Harness docs={[doc({ isRequired: true, displayName: 'Appt' })]} />);
    await user.click(generateButton());
    await waitFor(() => expect(generate).toHaveBeenCalled());
    await waitFor(() => expect(names()).toEqual([null]));
  });

  it("asks before replacing the maker's own files, and keeps them if declined", async () => {
    const { user } = render(<Harness docs={[doc({ documentId: 'm', fileName: 'mine.pdf' })]} />);
    await user.click(generateButton());
    expect(await screen.findByText(/none of them is a generated letter/)).toBeInTheDocument();
    await user.click(screen.getByText(/^cancel$/i));
    expect(generate).not.toHaveBeenCalled();
    expect(names()).toEqual(['mine.pdf']);
  });

  it("replaces all the row's files once confirmed when none is a generated letter", async () => {
    generate.mockResolvedValue(letter);
    const { user } = render(<Harness docs={[doc({ documentId: 'm', fileName: 'mine.pdf' })]} />);
    await user.click(generateButton());
    await screen.findByText(/none of them is a generated letter/);
    await user.click(confirmButton());
    await waitFor(() => expect(names()).toEqual(['appointment-letter.pdf']));
  });

  it("replaces only the earlier generated letter, and keeps the maker's own file", async () => {
    generate.mockResolvedValue({ ...letter, documentId: 'newer' });
    const { user } = render(
      <Harness
        docs={[
          doc({ documentId: 'm', fileName: 'mine.pdf' }),
          doc({ documentId: 'g', fileName: 'appointment-letter.pdf' }),
        ]}
      />,
    );
    await user.click(generateButton());
    expect(
      await screen.findByText(/replaces the appointment letter generated earlier/i),
    ).toBeInTheDocument();
    await user.click(confirmButton());
    await waitFor(() => expect(names()).toEqual(['mine.pdf', 'appointment-letter.pdf']));
  });

  it('leaves a file still uploading alone: it is not asked about, and it is not replaced', async () => {
    generate.mockResolvedValue(letter);
    const { user } = render(
      <Harness
        docs={[
          doc({ fileName: 'uploading.pdf', isUploading: true, rowId: 'u1', documentId: null }),
        ]}
      />,
    );
    await user.click(generateButton());
    // nothing settled to replace, so no question; the upload stays beside the new letter
    await waitFor(() => expect(names()).toEqual(['uploading.pdf', 'appointment-letter.pdf']));
  });

  it('replaces the settled files but not one still uploading', async () => {
    generate.mockResolvedValue(letter);
    const { user } = render(
      <Harness
        docs={[
          doc({ documentId: 'm', fileName: 'mine.pdf' }),
          doc({ fileName: 'uploading.pdf', isUploading: true, rowId: 'u1', documentId: null }),
        ]}
      />,
    );
    await user.click(generateButton());
    await screen.findByText(/none of them is a generated letter/);
    await user.click(confirmButton());
    await waitFor(() => expect(names()).toEqual(['uploading.pdf', 'appointment-letter.pdf']));
  });

  it('needs a saved request: Generate is disabled and its tooltip says why, not the row status', async () => {
    const { user } = render(<Harness saved={false} />);
    const button = generateButton();
    const reason = /Save the request first/;
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', expect.stringMatching(reason));
    // the nearest title above the button is the reason too (the status dot's title is its own element)
    expect(button.closest('span[title]')).toHaveAttribute('title', expect.stringMatching(reason));
    expect(button.parentElement?.closest('[title]')).toBe(button.closest('span[title]'));
    await user.click(button);
    expect(generate).not.toHaveBeenCalled();
  });

  it('shows no empty D035 row when read-only, but still shows a letter the request holds', () => {
    const { unmount } = render(<Harness readOnly />);
    expect(screen.queryByText('D035')).not.toBeInTheDocument();
    unmount();
    render(
      <Harness readOnly docs={[doc({ documentId: 'g', fileName: 'appointment-letter.pdf' })]} />,
    );
    expect(screen.getByRole('button', { name: /appointment-letter\.pdf/ })).toBeInTheDocument();
  });

  it('offers neither Generate nor attaching when read-only', () => {
    render(<Harness readOnly />);
    expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add a file to/i })).not.toBeInTheDocument();
  });
});
