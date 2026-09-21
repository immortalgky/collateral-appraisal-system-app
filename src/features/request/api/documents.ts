import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { z } from 'zod';
import i18n from '@/i18n';
import axios from '@shared/api/axiosInstance';
import { downloadBlob, uploadForm } from '@shared/api/blobTransfer';
import type { TransferOptions } from '@shared/api/blobTransfer';
import { CHUNKED_UPLOAD_THRESHOLD_BYTES, uploadFileInChunks } from '@shared/api/chunkedUpload';
import { useBlobViewerTab } from '@shared/hooks/useBlobViewerTab';
import type {
  CreateUploadSessionResponse,
  UploadDocumentParams,
  UploadDocumentResult,
} from '../types/document';

/**
 * The largest file the system accepts, chunked upload included. Matches
 * FileStorage:ChunkedUpload:MaxFileSizeBytes on the server, which is what actually enforces it —
 * and which arrives with the API's chunked-upload endpoints. Until that ships, anything above the
 * 20 MB threshold has nowhere to go: these two must be released together.
 */
export const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;

/**
 * The unit people expect to read the number in — "1 GB", not "1024 MB". Exported because
 * `common:transfer.fileTooLarge` carries no unit of its own: every caller that fills that message
 * in has to produce the unit here, or the sentence comes out as a bare number.
 */
export const sizeLabel = (bytes: number) => {
  const megabytes = bytes / (1024 * 1024);
  // Rounded up, both here and in GB, so a file that is over the limit never reads as the same
  // number as the limit — "larger than the 1 GB limit (it is 1 GB)" contradicts itself. Two
  // decimals rather than one: rounding a gigabyte up by a tenth overstates it by 100 MB, which is
  // its own kind of wrong answer. Whole gigabytes stay whole — bytes/2^30 is exact in binary.
  return megabytes >= 1024
    ? `${Math.ceil((megabytes / 1024) * 100) / 100} GB`
    : `${Math.ceil(megabytes)} MB`;
};

/**
 * Shaped like the error the response interceptor attaches, so the screens that show
 * `apiError.detail` say why without any of them needing to know about this check.
 */
const fileTooLargeError = (size: number) =>
  Object.assign(new Error('File too large'), {
    apiError: {
      detail: i18n.t('common:transfer.fileTooLarge', {
        limit: sizeLabel(MAX_UPLOAD_BYTES),
        size: sizeLabel(size),
      }),
    },
  });

/** Same shape, for a file that was never started because the screen had already gone. */
const screenClosedError = () =>
  Object.assign(new Error('Screen closed'), {
    apiError: { detail: i18n.t('common:transfer.uploadAbandoned') },
  });

export interface UploadDocumentResponse {
  documentId: string;
  fileName: string;
  filePath: string;
  uploadDate: string;
}

/**
 * Create an upload session for document uploads
 * This session ID is used for all subsequent document uploads until page refresh
 */
export const createUploadSession = async (): Promise<CreateUploadSessionResponse> => {
  const { data } = await axios.post<CreateUploadSessionResponse>('/documents/session');
  return data;
};

/**
 * Hook for uploading a single document to the server
 * Uses the upload session ID for all uploads within a session
 *
 * @param uploadSessionId - Session ID from createUploadSession()
 * @param file - Single file to upload
 * @param documentType - Type of document (e.g., TITLE_DEED, ID_CARD)
 * @param documentCategory - Category derived from type (legal, supporting_document, request_document)
 */
export const useUploadDocument = () => {
  // A chunked upload that runs out of tries parks and waits to be told whether to carry on — and
  // the buttons for that live in the app-level progress panel, which outlives the screen that
  // started the upload. An upload parked past that point answers to a mutation whose observer is
  // gone: resuming it would finish the file server-side while the caller's own onSuccess — the
  // step that attaches the document to the request — never runs, leaving an orphan nobody can see.
  // So an upload is tied to the life of the screen that began it.
  //
  // That life is shorter than it looks. Most of these screens are modals, which makes closing one
  // an obvious end — but several callers are tab panels rendered from a switch (GalleryTab,
  // AppendixTab, PhotosTab, the valuation checklist), and those unmount on a plain tab change. A
  // long upload does not survive the user going to another tab to check a figure, which is why it
  // says so out loud rather than just vanishing.
  //
  // ponytail: the real fix is an upload that outlives every screen — one app-level owner holding
  // the attach step — but that is a larger change than the panel it would need.
  const inFlight = useRef(new Set<AbortController>());
  const gone = useRef(false);

  useEffect(() => {
    // Cleared on the way in, not just set on the way out. StrictMode runs setup → cleanup → setup
    // in development, and a ref survives that: leaving it latched would refuse every upload the
    // app makes, at all seventeen call sites, from the first render onwards.
    gone.current = false;

    const controllers = inFlight.current;
    return () => {
      gone.current = true;
      // Said out loud, because the progress card disappears along with the screen: a large upload
      // silently vanishing looks like it finished, and the file would never appear on the request.
      // The wording avoids claiming the bytes were stopped — by the time the screen goes, the
      // server may already have the file; what is certainly lost is the step that attaches it.
      // One id, so a batch of abandoned files says it once rather than once per file.
      if (controllers.size > 0)
        toast.error(i18n.t('common:transfer.uploadAbandoned'), { id: 'upload-abandoned' });
      controllers.forEach(controller => controller.abort());
    };
  }, []);

  return useMutation({
    mutationFn: async (params: UploadDocumentParams): Promise<UploadDocumentResult> => {
      const { uploadSessionId, file, documentType, documentCategory } = params;

      if (file.size > MAX_UPLOAD_BYTES) {
        // Refused here, before a byte is sent. The server would refuse it too, but only after the
        // browser had spent the whole upload getting there.
        throw fileTooLargeError(file.size);
      }

      if (file.size > CHUNKED_UPLOAD_THRESHOLD_BYTES) {
        // Only the chunked path is tied to the screen, and only from here. Several callers upload
        // a selection one file at a time, awaiting each, so the cleanup — which runs once — reaches
        // only the file in flight at that moment; this is what covers the ones queued behind it.
        // A small file is left alone deliberately: it is sent in one request that nothing aborts,
        // it cannot park waiting for an answer, and its caller attaches it in the same closure, so
        // it finishes correctly from a screen that has gone.
        if (gone.current) throw screenClosedError();

        const controller = new AbortController();
        inFlight.current.add(controller);

        try {
          return await uploadFileInChunks<UploadDocumentResult>(
            file,
            {
              uploadSessionId,
              fileName: file.name,
              fileSizeBytes: file.size,
              contentType: file.type || 'application/octet-stream',
              documentType,
              documentCategory,
              description: null,
            },
            { onProgress: params.onProgress, label: file.name, signal: controller.signal },
          );
        } catch (error) {
          // An abort we caused reads to the caller as "cancelled", which is the one thing the user
          // did not do. Callers that show `apiError.detail` would then contradict the toast the
          // cleanup just raised, so both say the same thing.
          throw gone.current ? screenClosedError() : error;
        } finally {
          inFlight.current.delete(controller);
        }
      }

      const formData = new FormData();
      formData.append('uploadSessionId', uploadSessionId);
      formData.append('files', file);
      formData.append('documentType', documentType);
      formData.append('documentCategory', documentCategory);

      const { data } = await uploadForm<UploadDocumentResult>('/documents', formData, {
        onProgress: params.onProgress,
        label: file.name,
      });
      return data;
    },
  });
};

/**
 * Legacy hook for uploading documents (kept for backward compatibility during migration)
 * @deprecated Use useUploadDocument with UploadDocumentParams instead
 */
export const useUploadDocumentLegacy = () => {
  return useMutation({
    mutationFn: async (files: FileList): Promise<UploadDocumentResponse[]> => {
      // MOCK IMPLEMENTATION - to be removed
      await new Promise(resolve => setTimeout(resolve, 1000));

      return Array.from(files).map((file, index) => ({
        documentId: `doc-${Date.now()}-${index}`,
        fileName: file.name,
        filePath: `/uploads/${file.name}`,
        uploadDate: new Date().toISOString(),
      }));
    },
  });
};

/**
 * Hook for downloading/viewing documents from the server
 *
 * ⚠️ CURRENTLY USING MOCK API ⚠️
 * To integrate with real backend:
 * 1. See /docs/API_INTEGRATION.md for detailed instructions
 * 2. Uncomment the real API call below
 * 3. Remove the mock implementation
 * 4. Ensure your API endpoint matches: GET /api/documents/{documentId}/download
 */
export interface DownloadDocumentResult {
  blob: Blob;
  fileName: string | null;
}

const parseFileName = (disposition: string | undefined): string | null => {
  if (!disposition) return null;
  const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
  return match ? decodeURIComponent(match[1].replace(/"/g, '')) : null;
};

/**
 * Downloads a document as a blob, reporting progress as the bytes arrive.
 *
 * `total` is null when the response carries no usable Content-Length (a compressing proxy in
 * front of the API, say) — callers should show an indeterminate indicator rather than a
 * percentage they cannot compute.
 */
export const fetchDocumentBlob = async (
  documentId: string,
  options: TransferOptions = {},
): Promise<DownloadDocumentResult> => {
  const response = await downloadBlob(`/documents/${documentId}/download`, {
    ...options,
    params: { ...options.params, download: false },
  });

  return {
    blob: response.data,
    fileName: parseFileName(response.headers?.['content-disposition'] as string | undefined),
  };
};

export const useDownloadDocument = () => {
  return useMutation({
    mutationFn: (documentId: string): Promise<DownloadDocumentResult> =>
      fetchDocumentBlob(documentId),
  });
};

/**
 * Past this, a document is handed to the browser to download rather than opened inline.
 *
 * Viewing buffers the whole file in the *opening* tab before a pixel is shown, and the browser's
 * PDF viewer then expands it again — roughly twice the file in memory, held until the viewer tab
 * is closed. At a few hundred megabytes that tab can die, and it takes any half-filled form in it
 * with it. The browser's own download manager has none of that problem, and rather more to offer:
 * a real progress bar, a transfer that can be paused and resumed (the API answers range requests),
 * and a file that survives the page.
 *
 * Nothing stored today can reach this: uploads are capped at 50 MB server-side. It is here for
 * the chunked upload that raises that to 1 GB, so that the first gigabyte-sized document does not
 * arrive at a viewer with no ceiling — not as a rule that fires now.
 */
export const MAX_INLINE_VIEW_BYTES = 300 * 1024 * 1024;

/**
 * A plain URL, so the browser downloads it itself rather than this tab holding the bytes.
 *
 * That also means it carries no Authorization header: the token lives in memory and is attached by
 * the axios interceptor, which a raw navigation does not go through. It works because
 * DownloadDocumentEndpoint is `.AllowAnonymous()`. If that is ever secured — it should be — this
 * needs a signed URL or a cookie, and every `<img src>` in the app needs the same.
 */
const documentDownloadUrl = (documentId: string) =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/documents/${documentId}/download?download=true`;

/**
 * Returns a function that opens a stored document inline in a new browser tab, with the loading
 * page, progress and cancellation that useBlobViewerTab provides.
 *
 * Pass `fileSizeBytes` where the caller knows it: past {@link MAX_INLINE_VIEW_BYTES} the document
 * is downloaded instead of opened. Callers that omit it keep the inline behaviour.
 */
export const useViewDocument = () => {
  const openInTab = useBlobViewerTab();
  const { t } = useTranslation('common');

  // Memoised for the same reason the hook it wraps is: this ends up in callers' dependency arrays.
  return useCallback(
    (documentId: string, fileSizeBytes?: number | null, fileName?: string | null) => {
      if (fileSizeBytes != null && fileSizeBytes > MAX_INLINE_VIEW_BYTES) {
        // A link click rather than a window: a link is not a pop-up, so nothing blocks it, and an
        // attachment response goes to the browser's download manager with the page left alone.
        //
        // `target="_blank"` because the response is not always an attachment: a missing document
        // answers 404 with a plain body, and a file gone from storage answers 500. Without a
        // target those render *in this tab*, and the half-filled form that was on screen is gone —
        // the loss this whole ceiling exists to prevent. The cost is an empty tab on those two
        // error paths in Safari and Firefox, which is the cheaper mistake by a distance.
        const link = document.createElement('a');
        link.href = documentDownloadUrl(documentId);
        link.target = '_blank';
        link.rel = 'noopener';
        document.body.append(link);
        link.click();
        link.remove();

        // Said out loud, because a download has no window of its own to look at: the page does not
        // change, and a browser that suppressed the click would otherwise leave the user clicking
        // an eye icon that appears to do nothing at all.
        toast.success(
          fileName
            ? t('documentViewer.downloadStarted', { name: fileName })
            : t('documentViewer.downloadStartedUnnamed'),
        );
        return;
      }

      openInTab(options => fetchDocumentBlob(documentId, options).then(result => result.blob));
    },
    [openInTab, t],
  );
};

// ─── v7: GET /requests/{requestId}/documents ─────────────────────────────────

const RequestDocumentItemSchema = z.object({
  id: z.string(),
  documentId: z.string().nullable().optional(),
  documentType: z.string().nullable().optional(),
  documentTypeName: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  filePath: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isRequired: z.boolean().optional(),
  uploadedBy: z.string().nullable().optional(),
  uploadedByName: z.string().nullable().optional(),
  uploadedAt: z.string().nullable().optional(),
});

export const RequestDocumentSectionSchema = z.object({
  titleId: z.string().nullable().optional(),
  titleIdentifier: z.string().nullable().optional(),
  collateralType: z.string().nullable().optional(),
  collateralTypeName: z.string().nullable().optional(),
  sectionLabel: z.string(),
  totalDocuments: z.number().int(),
  uploadedDocuments: z.number().int(),
  documents: z.array(RequestDocumentItemSchema),
});

export const RequestDocumentsResponseSchema = z.object({
  totalDocuments: z.number().int(),
  totalUploaded: z.number().int(),
  sections: z.array(RequestDocumentSectionSchema),
});

export type RequestDocumentItem = z.infer<typeof RequestDocumentItemSchema>;
export type RequestDocumentSection = z.infer<typeof RequestDocumentSectionSchema>;
export type RequestDocumentsResponse = z.infer<typeof RequestDocumentsResponseSchema>;

export const requestDocumentKeys = {
  all: ['request-documents'] as const,
  byRequest: (requestId: string) => [...requestDocumentKeys.all, requestId] as const,
};

/**
 * Fetch all document sections for a given request.
 * First section (titleId === null) = "Application Documents" (request-level).
 * Subsequent sections = per-title collateral documents.
 *
 * Used by the Share Documents step in the Send Quotation flow (v7).
 */
export const useGetRequestDocuments = (requestId: string | undefined) => {
  return useQuery({
    queryKey: requestDocumentKeys.byRequest(requestId ?? ''),
    queryFn: async (): Promise<RequestDocumentsResponse> => {
      const { data } = await axios.get(`/requests/${requestId}/documents`);
      return RequestDocumentsResponseSchema.parse(data);
    },
    enabled: !!requestId,
    staleTime: 30_000,
  });
};
