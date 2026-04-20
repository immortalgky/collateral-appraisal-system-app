import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import { getDocumentTypeName, useGetDocumentTypes } from '@/features/request/api/documentTypes';
import { useGetRequestById } from '@/features/request/api/requests';
import {
  createUploadSession,
  useUploadDocument,
} from '@/features/request/api/documents';
import { getDocumentCategory } from '@/features/request/types/document';
import type { FollowupLineItem } from '../types/followup';

/**
 * The staged attachment the dialog returns to its parent. Nothing is sent to the backend
 * from here — the parent page batches these and POSTs them on "Submit Response".
 */
export interface StagedAttachment {
  lineItemId: string;
  documentType: string;
  documentId: string;
  fileName: string;
  attachToRequest: boolean;
  titleId?: string | null;
  targetLabel: string;
}

type Target = { kind: 'request' } | { kind: 'title'; titleId: string; label: string };

interface UploadLineItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  lineItem: FollowupLineItem;
  onStaged: (attachment: StagedAttachment) => void;
}

export function UploadLineItemDialog({
  isOpen,
  onClose,
  requestId,
  lineItem,
  onStaged,
}: UploadLineItemDialogProps) {
  const { data: documentTypes = [] } = useGetDocumentTypes();
  const { data: request, isLoading: titlesLoading } = useGetRequestById(
    isOpen ? requestId : undefined,
  );
  const titles = request?.titles ?? [];

  const [target, setTarget] = useState<Target>({ kind: 'request' });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = useUploadDocument();

  useEffect(() => {
    if (!isOpen) {
      setTarget({ kind: 'request' });
      setFile(null);
      setUploading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const documentTypeLabel = getDocumentTypeName(documentTypes, lineItem.documentType);

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please choose a file to upload.');
      return;
    }
    setUploading(true);
    try {
      const session = await createUploadSession();

      const uploaded = await uploadDocument.mutateAsync({
        uploadSessionId: session.sessionId,
        file,
        documentType: lineItem.documentType,
        documentCategory: getDocumentCategory(lineItem.documentType),
      });

      const staged: StagedAttachment =
        target.kind === 'request'
          ? {
              lineItemId: lineItem.id,
              documentType: lineItem.documentType,
              documentId: uploaded.documentId,
              fileName: uploaded.fileName,
              attachToRequest: true,
              titleId: null,
              targetLabel: 'Application level',
            }
          : {
              lineItemId: lineItem.id,
              documentType: lineItem.documentType,
              documentId: uploaded.documentId,
              fileName: uploaded.fileName,
              attachToRequest: false,
              titleId: target.titleId,
              targetLabel: target.label,
            };

      onStaged(staged);
      toast.success('File staged. It will be attached when you submit.');
      onClose();
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const message =
        apiError?.response?.data?.detail ?? apiError?.message ?? 'Upload failed. Please try again.';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return createPortal(
    <div className="modal modal-open z-[70]" role="dialog" aria-modal="true">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Icon name="upload" style="solid" className="size-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Upload Document</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Fulfilling: <span className="font-medium text-gray-700">{documentTypeLabel}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <Icon name="xmark" style="solid" className="size-4" />
          </button>
        </div>

        {/* Target picker */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Attach to
          </label>
          {titlesLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <Icon name="spinner" style="solid" className="size-4 animate-spin" />
              Loading titles...
            </div>
          ) : (
            <select
              value={target.kind === 'request' ? '__request__' : target.titleId}
              onChange={e => {
                const val = e.target.value;
                if (val === '__request__') {
                  setTarget({ kind: 'request' });
                } else {
                  const picked = titles.find((t: any) => t.id === val);
                  const label =
                    (picked?.titleNumber as string | null | undefined) ??
                    (picked?.collateralType as string | null | undefined) ??
                    'Title';
                  setTarget({ kind: 'title', titleId: val, label });
                }
              }}
              disabled={uploading}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white"
            >
              <option value="__request__">Application level (request)</option>
              {titles.map((t: any, idx: number) => {
                const label =
                  (t.titleNumber as string | null | undefined) ??
                  (t.collateralType as string | null | undefined) ??
                  `Title ${idx + 1}`;
                const titleId = (t.id as string | null | undefined) ?? '';
                return (
                  <option key={titleId || `title-${idx}`} value={titleId} disabled={!titleId}>
                    {label}
                    {t.collateralType ? ` — ${t.collateralType}` : ''}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {/* File input */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">File</label>
          <input
            ref={fileInputRef}
            type="file"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
            className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
          />
          {file && (
            <p className="mt-2 text-xs text-gray-500 truncate">
              Selected: <span className="text-gray-700">{file.name}</span>
            </p>
          )}
        </div>

        <div className="text-xs text-gray-500 mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
          The file is uploaded to storage now but <span className="font-semibold">not</span>{' '}
          attached to the request yet. Attachments happen atomically when you click{' '}
          <span className="font-semibold">Submit Response</span>.
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/80 rounded-xl transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Icon name="upload" style="solid" className="size-4" />
                Stage file
              </>
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={uploading ? undefined : onClose}>
        <button type="button">close</button>
      </div>
    </div>,
    document.body,
  );
}
