import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { createUploadSession, useUploadDocument } from '@/features/request/api/documents';
import { useLinkQuotationDocument } from '../api/quotation';
import type { QuotationDocumentDto } from '../api/types';

export const QUOTATION_DOCUMENT_TYPE = 'QUOTATION';
export const QUOTATION_DOCUMENT_CATEGORY = 'quotation';

export interface UseQuotationDocumentUploadResult {
  uploading: boolean;
  uploadAndLink: (e: React.ChangeEvent<HTMLInputElement>) => Promise<QuotationDocumentDto | null>;
}

/**
 * Encapsulates the upload-session + upload + link flow for quotation documents.
 * The session is created lazily on first upload and reused for subsequent ones.
 *
 * Returns `uploading` state and an `uploadAndLink` handler that:
 *  1. Resets the file input immediately (so re-selecting the same file fires onChange)
 *  2. Creates/reuses an upload session
 *  3. Uploads the file
 *  4. Links it to the quotation
 *  5. Shows success/failure toasts
 *  6. Returns the linked QuotationDocumentDto on success, or null on failure
 */
export const useQuotationDocumentUpload = (
  quotationId: string,
): UseQuotationDocumentUploadResult => {
  const { t } = useTranslation('quotation');
  const upload = useUploadDocument();
  const linkDocument = useLinkQuotationDocument();

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
  ): Promise<QuotationDocumentDto | null> => {
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
        documentType: QUOTATION_DOCUMENT_TYPE,
        documentCategory: QUOTATION_DOCUMENT_CATEGORY,
      });
      const linked = await linkDocument.mutateAsync({
        quotationId,
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
