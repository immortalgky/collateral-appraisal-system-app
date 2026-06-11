import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { createUploadSession, useUploadDocument } from '@/features/request/api/documents';
import { useLinkMeetingDocument } from '../api/meetings';
import type { MeetingDocumentDto } from '../api/types';

export const MEETING_DOCUMENT_TYPE = 'MEETING';
export const MEETING_DOCUMENT_CATEGORY = 'meeting';

export interface UseMeetingDocumentUploadResult {
  uploading: boolean;
  uploadAndLink: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<MeetingDocumentDto | null>;
}

/**
 * Encapsulates the upload-session + upload + link flow for meeting documents.
 * The session is created lazily on first upload and reused for subsequent ones.
 *
 * Returns `uploading` state and an `uploadAndLink` handler that:
 *  1. Resets the file input immediately (so re-selecting the same file fires onChange)
 *  2. Creates/reuses an upload session
 *  3. Uploads the file
 *  4. Links it to the meeting
 *  5. Shows success/failure toasts
 *  6. Returns the linked MeetingDocumentDto on success, or null on failure
 */
export const useMeetingDocumentUpload = (
  meetingId: string,
): UseMeetingDocumentUploadResult => {
  const { t } = useTranslation('meeting');
  const upload = useUploadDocument();
  const linkDocument = useLinkMeetingDocument();

  const sessionIdRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const getOrCreateSession = async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const { sessionId } = await createUploadSession();
    sessionIdRef.current = sessionId;
    return sessionId;
  };

  const uploadAndLink = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<MeetingDocumentDto | null> => {
    const file = e.target.files?.[0];
    // Reset the input so re-selecting the SAME file (e.g. to retry after a failed upload)
    // still fires onChange.
    e.target.value = '';
    if (!file) return null;

    setUploading(true);
    try {
      const sessionId = await getOrCreateSession();
      const result = await upload.mutateAsync({
        uploadSessionId: sessionId,
        file,
        documentType: MEETING_DOCUMENT_TYPE,
        documentCategory: MEETING_DOCUMENT_CATEGORY,
      });
      const linked = await linkDocument.mutateAsync({
        meetingId,
        body: { documentId: result.documentId, fileName: result.fileName },
      });
      toast.success(t('documents.uploaded'));
      return linked;
    } catch {
      toast.error(t('documents.uploadFailed'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadAndLink };
};
