import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import axios from '@shared/api/axiosInstance';
import { useUploadDocument } from '../api/documents';
import { useGetDocumentChecklist } from '../api/requiredDocuments';
import { getDocumentCategory } from '../types/document';
import type { ApplicationDocumentChecklistItem } from '../types/document';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

interface MissingDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  onSubmit: () => void;
  isSubmitting: boolean;
  getOrCreateSession: () => Promise<string>;
}

interface MissingDocRowProps {
  code: string;
  name: string;
  category: string | null;
  requestId: string;
  titleId?: string;
  getOrCreateSession: () => Promise<string>;
}

const MissingDocRow = ({ code, name, category, requestId, titleId, getOrCreateSession }: MissingDocRowProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { mutate: uploadDocument, isPending: isUploading } = useUploadDocument();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const typeAllowed = ALLOWED_TYPES.includes(file.type) || ['.pdf', '.png', '.jpg', '.jpeg'].includes(extension);
    if (!typeAllowed) {
      toast.error(`${file.name}: Unsupported file type. Use PDF, PNG, or JPG.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name}: File size exceeds 10MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const sessionId = await getOrCreateSession();
      uploadDocument(
        {
          uploadSessionId: sessionId,
          file,
          documentType: code,
          documentCategory: getDocumentCategory(code),
        },
        {
          onSuccess: async (uploadedDoc) => {
            try {
              // Attach the uploaded document to the request or title
              const attachUrl = titleId
                ? `/requests/${requestId}/titles/${titleId}/documents`
                : `/requests/${requestId}/documents`;

              await axios.post(attachUrl, {
                documentId: uploadedDoc.documentId,
                documentType: code,
                fileName: uploadedDoc.fileName,
              });

              queryClient.invalidateQueries({ queryKey: ['document-checklist', requestId] });
              queryClient.invalidateQueries({ queryKey: ['request', requestId] });
            } catch {
              toast.error(`File uploaded but failed to attach to request. Please try again.`);
            }
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || `Failed to upload ${name}.`);
          },
        },
      );
    } catch {
      toast.error('Failed to start upload session. Please try again.');
    }

    // Reset the input so the same file can be re-selected after an error
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 border border-gray-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon name="file-circle-exclamation" style="solid" className="size-4 text-amber-500 shrink-0" />
        <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
        {category && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium shrink-0">
            {category}
          </span>
        )}
      </div>
      <div className="shrink-0 ml-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Icon name="spinner" style="solid" className="size-3 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Icon name="arrow-up-from-bracket" style="solid" className="size-3" />
              Upload
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const MissingDocumentsModal = ({
  isOpen,
  onClose,
  requestId,
  onSubmit,
  isSubmitting,
  getOrCreateSession,
}: MissingDocumentsModalProps) => {
  const { data: checklist, isLoading, isFetching } = useGetDocumentChecklist(requestId);

  if (!isOpen) return null;

  const missingAppDocs: ApplicationDocumentChecklistItem[] =
    checklist?.applicationDocuments.filter(d => d.isRequired && !d.isUploaded) ?? [];

  const missingTitleGroups = (checklist?.titleDocuments ?? [])
    .map(group => ({
      ...group,
      documents: group.documents.filter(d => d.isRequired && !d.isUploaded),
    }))
    .filter(group => group.documents.length > 0);

  const isComplete = checklist?.isComplete ?? false;
  const missingCount = checklist?.missingRequiredCount ?? 0;

  return (
    <dialog className="modal modal-open z-[60]">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isComplete ? 'bg-green-100' : 'bg-amber-100'
              }`}
            >
              <Icon
                name={isComplete ? 'circle-check' : 'triangle-exclamation'}
                style="solid"
                className={`size-5 ${isComplete ? 'text-green-600' : 'text-amber-500'}`}
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base">
                {isComplete ? 'All required documents uploaded' : 'Required documents missing'}
              </h3>
              {!isComplete && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {missingCount} required document{missingCount !== 1 ? 's' : ''} must be uploaded before submitting.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-4 shrink-0"
          >
            <Icon name="xmark" style="solid" className="size-5" />
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-500">
            <Icon name="spinner" style="solid" className="size-5 animate-spin" />
            <span className="text-sm">Checking documents...</span>
          </div>
        ) : isComplete ? (
          <div className="flex items-center gap-2 py-6 justify-center text-green-700">
            <Icon name="circle-check" style="solid" className="size-5" />
            <span className="text-sm font-medium">All required documents have been uploaded. You may now submit.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-1">
            {/* Application / Request Documents */}
            {missingAppDocs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Request Documents
                </p>
                <div className="flex flex-col gap-2">
                  {missingAppDocs.map(doc => (
                    <MissingDocRow
                      key={doc.code}
                      code={doc.code}
                      name={doc.name}
                      category={doc.category}
                      requestId={requestId}
                      getOrCreateSession={getOrCreateSession}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Title Documents */}
            {missingTitleGroups.map(group => (
              <div key={group.titleId}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Title Documents
                  {(group.ownerName || group.collateralType) && (
                    <span className="normal-case font-normal ml-1 text-gray-400">
                      — {[group.ownerName, group.collateralType].filter(Boolean).join(', ')}
                    </span>
                  )}
                </p>
                <div className="flex flex-col gap-2">
                  {group.documents.map(doc => (
                    <MissingDocRow
                      key={`${group.titleId}-${doc.code}`}
                      code={doc.code}
                      name={doc.name}
                      category={doc.category}
                      requestId={requestId}
                      titleId={group.titleId}
                      getOrCreateSession={getOrCreateSession}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!isComplete || isSubmitting || isFetching}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Icon name="paper-plane" style="solid" className="size-4" />
                Submit
              </span>
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={!isSubmitting ? onClose : undefined}>
        <button type="button">close</button>
      </div>
    </dialog>
  );
};

export default MissingDocumentsModal;
