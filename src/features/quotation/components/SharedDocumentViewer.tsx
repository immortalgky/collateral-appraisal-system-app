import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { isAxiosError } from 'axios';
import axiosInstance from '@shared/api/axiosInstance';
import Icon from '@/shared/components/Icon';

interface SharedDocumentViewerProps {
  quotationRequestId: string;
  documentId: string;
  fileName: string;
  fileType?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type ViewerState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; objectUrl: string; mimeType: string }
  | { status: 'forbidden' }
  | { status: 'error'; message: string };

/**
 * Inline document viewer for shared quotation documents.
 * Fetches the binary via axios (so Bearer auth is forwarded), then renders
 * PDFs in an iframe and images in an img tag.
 * No download control is shown.
 */
const SharedDocumentViewer = ({
  quotationRequestId,
  documentId,
  fileName,
  fileType,
  isOpen,
  onClose,
}: SharedDocumentViewerProps) => {
  const [state, setState] = useState<ViewerState>({ status: 'idle' });
  // Track the current object URL so we can revoke it on cleanup without
  // reading stale state inside the effect closure.
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState({ status: 'loading' });
      try {
        const response = await axiosInstance.get(
          `/quotations/${quotationRequestId}/shared-documents/${documentId}/content`,
          { responseType: 'blob' },
        );
        if (cancelled) return;
        const blob: Blob = response.data;
        const mimeType = blob.type || fileType || 'application/octet-stream';
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setState({ status: 'ready', objectUrl, mimeType });
      } catch (err) {
        if (cancelled) return;
        if (isAxiosError(err) && (err.response?.status === 403 || err.response?.status === 404)) {
          setState({ status: 'forbidden' });
        } else {
          setState({ status: 'error', message: 'Failed to load document.' });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quotationRequestId, documentId]);

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel className="w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="file" style="solid" className="size-4 text-blue-500 shrink-0" />
                <span className="text-sm font-medium text-gray-800 truncate">{fileName}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100 shrink-0 ml-3"
                aria-label="Close viewer"
              >
                <Icon name="xmark" style="regular" className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-[70vh] flex items-center justify-center bg-gray-50">
              {state.status === 'idle' || state.status === 'loading' ? (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Icon name="spinner" style="solid" className="size-6 animate-spin" />
                  <span className="text-sm">Loading document...</span>
                </div>
              ) : state.status === 'forbidden' ? (
                <div className="flex flex-col items-center gap-3 text-center max-w-sm px-4">
                  <div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Icon name="lock" style="solid" className="size-5 text-red-500" />
                  </div>
                  <p className="text-sm text-gray-600">
                    You no longer have access to this document — the quotation may have been
                    finalized or cancelled.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-primary hover:underline"
                  >
                    Close
                  </button>
                </div>
              ) : state.status === 'error' ? (
                <div className="flex flex-col items-center gap-3 text-center max-w-sm px-4">
                  <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Icon name="triangle-exclamation" style="solid" className="size-5 text-amber-500" />
                  </div>
                  <p className="text-sm text-gray-600">{state.message}</p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-primary hover:underline"
                  >
                    Close
                  </button>
                </div>
              ) : (
                // state.status === 'ready'
                isImage(state.mimeType) ? (
                  <img
                    src={state.objectUrl}
                    alt={fileName}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                ) : (
                  <iframe
                    src={state.objectUrl}
                    title={fileName}
                    className="w-full h-[70vh] border-0"
                  />
                )
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default SharedDocumentViewer;
