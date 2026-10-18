import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useUploadProgressStore } from '@/shared/api/uploadProgress';
import { fetchReportPdf } from '@/features/reportGeneration/api/reports';
import { useUploadDocument } from '../api/documents';
import {
  getDocumentCategory,
  REQUEST_DOCUMENT_UPLOADS,
  type UploadedDocument,
} from '../types/document';

/** The appointment letter in the document taxonomy: D035 = ใบขอนัดสำรวจและประเมินราคา. */
export const APPOINTMENT_LETTER_DOC_TYPE = 'D035';
/** What a letter made by the system is called; it is how one is told from a maker's own D035 file. */
export const APPOINTMENT_LETTER_FILE = 'appointment-letter.pdf';

/** A D035 file that the system generated (by name: the source column cannot carry this). */
export const isGeneratedAppointmentLetter = (doc: UploadedDocument) =>
  doc.documentType === APPOINTMENT_LETTER_DOC_TYPE &&
  doc.fileName?.toLowerCase() === APPOINTMENT_LETTER_FILE;

/** What a generated letter comes back as once it is uploaded. */
export interface GeneratedLetter {
  file: File;
  documentId: string;
  fileName: string;
}

/**
 * Generates the appointment letter PDF for a saved request and uploads it to the request's upload
 * session. It does not touch the form: the caller attaches the result where the letter belongs (the
 * D035 row of the document card). Failures are reported with a toast and come back as null.
 *
 * While it runs the letter counts as an upload of the document card, so nothing that would shift the
 * titles (reorder, delete) can run underneath it.
 */
export function useAppointmentLetter(
  requestId: string | undefined,
  getOrCreateSession: () => Promise<string>,
) {
  const { t } = useTranslation('request');
  const { mutateAsync: uploadDocument } = useUploadDocument();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const generate = async (): Promise<GeneratedLetter | null> => {
    if (!requestId || running.current) return null;
    running.current = true;
    setBusy(true);
    const endBatch = useUploadProgressStore.getState().beginBatch(REQUEST_DOCUMENT_UPLOADS);
    try {
      const blob = await fetchReportPdf('appointment-letter', requestId);
      const sessionId = await getOrCreateSession();
      const file = new File([blob], APPOINTMENT_LETTER_FILE, { type: 'application/pdf' });
      const result = await uploadDocument({
        uploadSessionId: sessionId,
        file,
        documentType: APPOINTMENT_LETTER_DOC_TYPE,
        documentCategory: getDocumentCategory(APPOINTMENT_LETTER_DOC_TYPE),
      });
      return { file, documentId: result.documentId, fileName: result.fileName };
    } catch (error) {
      // blobTransfer fills apiError.detail for both a ProblemDetails body and a stalled transfer
      // ("the connection stopped…"): reporting a stall as "could not generate the letter" sends
      // the user after the wrong problem.
      const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
      toast.error(
        detail || t('appointmentLetter.error', 'Failed to generate the appointment letter.'),
      );
      return null;
    } finally {
      endBatch();
      running.current = false;
      setBusy(false);
    }
  };

  return { busy, generate };
}
