import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUploadProgressStore } from '@/shared/api/uploadProgress';
import { isRequestUploadBusy } from '../utils/carryForward';
import {
  APPOINTMENT_LETTER_DOC_TYPE,
  isGeneratedAppointmentLetter,
  useAppointmentLetter,
} from './useAppointmentLetter';

const fetchReportPdf = vi.hoisted(() => vi.fn());
const uploadDocument = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/features/reportGeneration/api/reports', () => ({ fetchReportPdf }));
vi.mock('../api/documents', () => ({ useUploadDocument: () => ({ mutateAsync: uploadDocument }) }));
vi.mock('react-hot-toast', () => ({ default: { error: toastError } }));
vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

beforeEach(() => {
  fetchReportPdf.mockReset();
  uploadDocument.mockReset();
  toastError.mockReset();
  useUploadProgressStore.setState({ uploads: [], batches: [] });
});

describe('useAppointmentLetter', () => {
  it('generates the letter for the request and uploads it as a D035 file', async () => {
    fetchReportPdf.mockResolvedValue(new Blob(['pdf']));
    uploadDocument.mockResolvedValue({ documentId: 'doc-1', fileName: 'appointment-letter.pdf' });
    const { result } = renderHook(() => useAppointmentLetter('req-1', async () => 'session-1'));

    let letter: Awaited<ReturnType<typeof result.current.generate>> = null;
    await act(async () => {
      letter = await result.current.generate();
    });

    expect(fetchReportPdf).toHaveBeenCalledWith('appointment-letter', 'req-1');
    expect(uploadDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadSessionId: 'session-1',
        documentType: APPOINTMENT_LETTER_DOC_TYPE,
      }),
    );
    expect(letter).toMatchObject({ documentId: 'doc-1', fileName: 'appointment-letter.pdf' });
    expect((letter as unknown as { file: File }).file.type).toBe('application/pdf');
  });

  it('counts as an upload of the document card while it runs, and no longer afterwards', async () => {
    let finish: (blob: Blob) => void = () => {};
    fetchReportPdf.mockReturnValue(new Promise<Blob>(resolve => (finish = resolve)));
    uploadDocument.mockResolvedValue({ documentId: 'd', fileName: 'appointment-letter.pdf' });
    const { result } = renderHook(() => useAppointmentLetter('req-1', async () => 's'));

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.generate();
    });
    expect(result.current.busy).toBe(true);
    expect(isRequestUploadBusy(() => ({ titles: [] }))).toBe(true);
    await act(async () => {
      finish(new Blob(['pdf']));
      await pending;
    });
    expect(result.current.busy).toBe(false);
    expect(isRequestUploadBusy(() => ({ titles: [] }))).toBe(false);
  });

  it('reports a failure with the server detail, returns nothing, and frees the lock', async () => {
    fetchReportPdf.mockRejectedValue({ apiError: { detail: 'the connection stopped' } });
    const { result } = renderHook(() => useAppointmentLetter('req-1', async () => 's'));
    let letter: unknown = 'unset';
    await act(async () => {
      letter = await result.current.generate();
    });
    expect(letter).toBeNull();
    expect(toastError).toHaveBeenCalledWith('the connection stopped');
    expect(result.current.busy).toBe(false);
    expect(isRequestUploadBusy(() => ({ titles: [] }))).toBe(false);
  });

  it('does nothing without a saved request', async () => {
    const { result } = renderHook(() => useAppointmentLetter(undefined, async () => 's'));
    let letter: unknown = 'unset';
    await act(async () => {
      letter = await result.current.generate();
    });
    expect(letter).toBeNull();
    expect(fetchReportPdf).not.toHaveBeenCalled();
  });
});

describe('isGeneratedAppointmentLetter', () => {
  const file = (documentType: string, fileName: string | null) =>
    ({ documentType, fileName }) as never;

  it('tells the system letter from a maker upload by type and name', () => {
    expect(isGeneratedAppointmentLetter(file('D035', 'appointment-letter.pdf'))).toBe(true);
    expect(isGeneratedAppointmentLetter(file('D035', 'Appointment-Letter.PDF'))).toBe(true);
    expect(isGeneratedAppointmentLetter(file('D035', 'my-letter.pdf'))).toBe(false);
    expect(isGeneratedAppointmentLetter(file('D036', 'appointment-letter.pdf'))).toBe(false);
    expect(isGeneratedAppointmentLetter(file('D035', null))).toBe(false);
  });
});
