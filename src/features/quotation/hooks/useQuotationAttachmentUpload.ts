import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { createUploadSession, useUploadDocument } from '@/features/request/api/documents';

const QUOTATION_DOCUMENT_TYPE = 'QUOTATION';
const QUOTATION_DOCUMENT_CATEGORY = 'quotation';

export interface UseQuotationAttachmentUploadResult {
  uploading: boolean;
  /** Uploads a file and returns its document id + display name, or null on failure. */
  uploadFile: (file: File) => Promise<{ id: string; name: string } | null>;
}

export const useQuotationAttachmentUpload = (): UseQuotationAttachmentUploadResult => {
  const upload = useUploadDocument();
  const sessionIdRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const getOrCreateSession = async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const { sessionId } = await createUploadSession();
    sessionIdRef.current = sessionId;
    return sessionId;
  };

  const uploadFile = async (file: File): Promise<{ id: string; name: string } | null> => {
    setUploading(true);
    try {
      const sessionId = await getOrCreateSession();
      const result = await upload.mutateAsync({
        uploadSessionId: sessionId,
        file,
        documentType: QUOTATION_DOCUMENT_TYPE,
        documentCategory: QUOTATION_DOCUMENT_CATEGORY,
      });
      return { id: result.documentId, name: result.fileName };
    } catch {
      toast.error('Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadFile };
};
