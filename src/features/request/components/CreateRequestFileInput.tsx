import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import FileInput from '@/shared/components/inputs/FileInput';
import {
  MAX_UPLOAD_BYTES,
  sizeLabel,
  type UploadDocumentResponse,
  useUploadDocument,
} from '../api';
import FileAssignmentModal from './FileAssignmentModal';
import {
  getDocumentCategory,
  REQUEST_DOCUMENT_UPLOADS,
  type UploadedDocument,
} from '../types/document';
import { useAuthStore } from '@/features/auth/store';
import { useUploadProgressStore } from '@/shared/api/uploadProgress';
import { makeUploadedRow, placeDocument } from '../utils/carryForward';

// The system's ceiling, not this screen's: anything past 20 MB is sent in chunks, so the 10 MB
// this screen used to enforce was a limit of its own invention and the reason a scanned deed had
// to be split by hand before it could be attached.
const MAX_FILE_SIZE = MAX_UPLOAD_BYTES;
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

/**
 * Merge new documents with existing documents: each fills an empty placeholder of its type (keeping
 * the slot's id and rowId) or is appended.
 */
const mergeDocumentsWithPlaceholders = (
  existingDocs: UploadedDocument[],
  newDocs: UploadedDocument[],
): UploadedDocument[] => newDocs.reduce(placeDocument, existingDocs);

interface UploadProgress {
  fileName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export interface CreateRequestFileInputHandle {
  /** Starts the same flow as choosing files: validate, then the type / title assignment dialog. */
  addFiles: (files: File[]) => void;
}

interface CreateRequestFileInputProps {
  getOrCreateSession: () => Promise<string>;
  /** Lets the card around this bar take a drop anywhere and hand the files here. */
  ref?: Ref<CreateRequestFileInputHandle>;
}

const CreateRequestFileInput = ({ getOrCreateSession, ref }: CreateRequestFileInputProps) => {
  const { t } = useTranslation(['request', 'common']);
  const { setValue, getValues } = useFormContext();
  const currentUser = useAuthStore(state => state.user);
  const { mutateAsync: uploadDocument, isPending } = useUploadDocument();
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<(UploadDocumentResponse & { file: File })[]>(
    [],
  );
  const [, setSelectedFiles] = useState<FileList | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const isUploading = uploadProgress.length > 0;

  // A batch is uploaded one file at a time, and each await is a chance for the screen to go. What
  // is left of the batch stops there: finishing it would store files whose assignment — the
  // setValue calls below — has nowhere to land, leaving them on the server attached to nothing.
  // Set on the way in as well as cleared on the way out, because StrictMode mounts twice in dev.
  const onScreen = useRef(true);
  useEffect(() => {
    onScreen.current = true;
    return () => {
      onScreen.current = false;
    };
  }, []);

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(
          `${file.name}: ${t('common:transfer.fileTooLarge', {
            limit: sizeLabel(MAX_FILE_SIZE),
            size: sizeLabel(file.size),
          })}`,
        );
        return;
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        const extension = `.${file.name.split('.').pop()}`;
        if (!ALLOWED_EXTENSIONS.includes(extension.toLowerCase())) {
          errors.push(`${file.name}: Unsupported file type. Use PDF, PNG, or JPG`);
          return;
        }
      }

      valid.push(file);
    });

    return { valid, errors };
  };

  // No new files while a batch is uploading or the assignment dialog is open: a second batch would
  // share the progress list and the dialog's state. Both the bar and a drop on the card come here.
  const isBusy =
    uploadProgress.some(p => p.status === 'pending' || p.status === 'uploading') ||
    showAssignmentModal;

  const addFiles = (files: File[]) => {
    if (files.length === 0) {
      return;
    }
    if (isBusy || isPending) {
      toast(t('docCard.drop.busy'));
      return;
    }

    // Validate files
    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      setValidationErrors(errors);
      setTimeout(() => setValidationErrors([]), 5000); // Clear errors after 5 seconds
    }

    if (valid.length === 0) {
      return;
    }

    // Create FileList from valid files
    const dataTransfer = new DataTransfer();
    valid.forEach(file => dataTransfer.items.add(file));

    setSelectedFiles(dataTransfer.files);

    // NEW FLOW: Show assignment modal immediately without uploading
    // Create temporary file data for assignment
    const tempFilesWithData = Array.from(dataTransfer.files).map((file, index) => ({
      documentId: `temp-${Date.now()}-${index}`, // Temporary ID for tracking
      fileName: file.name,
      filePath: '',
      uploadDate: new Date().toISOString(),
      file: file,
    }));

    setUploadedFiles(tempFilesWithData);
    setShowAssignmentModal(true);
  };

  useImperativeHandle(ref, () => ({ addFiles }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    addFiles(Array.from(e.target.files ?? []));

  // Update progress for a specific file
  const updateFileProgress = useCallback(
    (fileName: string, status: UploadProgress['status'], errorMessage?: string) => {
      setUploadProgress(prev =>
        prev.map(p => (p.fileName === fileName ? { ...p, status, errorMessage } : p)),
      );
    },
    [],
  );

  const handleAssign = async (assignments: any[]) => {
    // Close modal and initialize progress tracking
    setShowAssignmentModal(false);

    // The whole batch counts as an upload in progress until it is finished with, so nothing that
    // must not run beside an upload (changing the previous appraisal) starts between its files.
    const endBatch = useUploadProgressStore.getState().beginBatch(REQUEST_DOCUMENT_UPLOADS);

    // Initialize progress for all files
    const initialProgress: UploadProgress[] = assignments.map(a => ({
      fileName: a.file.name,
      status: 'pending' as const,
    }));
    setUploadProgress(initialProgress);

    try {
      // Get or create upload session first
      const sessionId = await getOrCreateSession();

      // Upload files sequentially and collect results
      const uploadResults: { assignment: any; documentId: string; fileName: string }[] = [];
      let failedCount = 0;

      for (const assignment of assignments) {
        if (!onScreen.current) return;

        // Update status to uploading
        updateFileProgress(assignment.file.name, 'uploading');

        try {
          // Awaited directly rather than through the mutation's per-call callbacks: React Query
          // drops those once the component has no listeners, so a screen closed mid-upload left
          // this loop suspended for the life of the page, holding on to every file still queued.
          const uploadedDoc = await uploadDocument({
            uploadSessionId: sessionId,
            file: assignment.file,
            documentType: assignment.docType,
            documentCategory: getDocumentCategory(assignment.docType),
          });

          uploadResults.push({
            assignment,
            documentId: uploadedDoc.documentId,
            fileName: uploadedDoc.fileName,
          });
          updateFileProgress(assignment.file.name, 'success');
        } catch (error: any) {
          console.error('Upload failed for file:', assignment.file.name, error);
          updateFileProgress(
            assignment.file.name,
            'error',
            error.apiError?.detail || 'Upload failed',
          );
          failedCount++;
        }
      }

      // Checked again after the last file: the screen can go while it is in flight, and what
      // follows writes to a form that would no longer be there and congratulates the user on a
      // page they have already left.
      if (!onScreen.current) return;

      // Map uploaded documents to form state
      const requestDocs: UploadedDocument[] = [];
      const titleDocsMap: Record<number, UploadedDocument[]> = {};

      uploadResults.forEach(({ assignment, documentId, fileName }) => {
        const newDoc = makeUploadedRow({
          // a file attached to a title belongs to that title, as a moved or restored one does
          titleId:
            assignment.entityType === 'title'
              ? (getValues(`titles.${assignment.entityIndex}.id`) ?? null)
              : null,
          documentId,
          documentType: assignment.docType || null,
          fileName,
          notes: assignment.comment || null,
          uploadedBy: currentUser?.username || null,
          uploadedByName: currentUser?.name || null,
          file: assignment.file,
        });

        if (assignment.entityType === 'request') {
          requestDocs.push(newDoc);
        } else {
          if (!titleDocsMap[assignment.entityIndex]) {
            titleDocsMap[assignment.entityIndex] = [];
          }
          titleDocsMap[assignment.entityIndex].push(newDoc);
        }
      });

      // Update form state - merge with existing placeholders
      if (requestDocs.length > 0) {
        const currentDocs: UploadedDocument[] = getValues('documents') || [];
        const mergedDocs = mergeDocumentsWithPlaceholders(currentDocs, requestDocs);
        setValue('documents', mergedDocs, {
          shouldDirty: true,
        });
      }

      // Update title documents - merge with existing placeholders
      Object.entries(titleDocsMap).forEach(([index, docs]) => {
        const titleIndex = parseInt(index);
        const currentTitleDocs: UploadedDocument[] =
          getValues(`titles.${titleIndex}.documents`) || [];
        const mergedDocs = mergeDocumentsWithPlaceholders(currentTitleDocs, docs);
        setValue(`titles.${titleIndex}.documents`, mergedDocs, {
          shouldDirty: true,
        });
      });

      // Reset state
      setUploadedFiles([]);
      setSelectedFiles(null);

      // Show success/partial message
      if (failedCount > 0) {
        toast.error(t('toasts.uploadPartialFailed', { n: failedCount }));
      }
      if (uploadResults.length > 0) {
        toast.success(t('toasts.uploadSuccess', { n: uploadResults.length }));
      }

      // Clear progress after a delay to show completion
      setTimeout(() => {
        setUploadProgress([]);
      }, 2000);
    } catch (error: any) {
      console.error('Session creation failed:', error);
      // Same rule as the success path: nothing to say to someone who has left, and the state this
      // resets belongs to a screen that is gone.
      if (!onScreen.current) return;
      toast.error(error.apiError?.detail || t('toasts.sessionFailed'));

      // Mark all pending as error
      setUploadProgress(prev =>
        prev.map(p =>
          p.status === 'pending' || p.status === 'uploading'
            ? { ...p, status: 'error' as const, errorMessage: 'Session creation failed' }
            : p,
        ),
      );

      // Reset state on error
      setUploadedFiles([]);
      setSelectedFiles(null);

      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);
    } finally {
      endBatch();
    }
  };

  return (
    <>
      {/* A slim bar: files can also be dropped anywhere on the card (the caller wires that up) */}
      <div className="mx-4 my-2.5">
        <FileInput
          onChange={handleChange}
          accept={ALLOWED_EXTENSIONS.join(', ')}
          multiple={true}
          // Unsupported files are refused with the same message as on a card drop, not dropped silently
          filterDroppedFiles={false}
          // Never disabled: a disabled input swallows a drop without a word, and this one answers
          // with the busy toast (addFiles) whether the drop lands here or elsewhere on the card.
        >
          {(isDragging: boolean) => (
            <span
              className={clsx(
                'flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-lg border-[1.5px] border-dashed px-3 py-2 text-sm transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5 text-(--palette-primary-text)'
                  : 'border-(--palette-line-strong) text-(--palette-gray-500) hover:border-(--palette-line-strong)',
              )}
            >
              {isDragging ? (
                t('docCard.drop.dragging')
              ) : (
                <>
                  {t('docCard.drop.text')}
                  <span className="rounded-md border border-(--palette-line-strong) bg-(--palette-surface) px-3 py-1 text-(--palette-ink)">
                    {t('docCard.drop.choose')}
                  </span>
                  {t('docCard.drop.hint')} ·{' '}
                  {t('documents.supportedText', { limit: sizeLabel(MAX_FILE_SIZE) })}
                </>
              )}
            </span>
          )}
        </FileInput>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mx-3.5 mb-2 p-3 bg-(--palette-req-wash) border border-(--palette-req-line) rounded-lg">
          <div className="flex items-start gap-2">
            <Icon
              name="triangle-exclamation"
              style="solid"
              className="w-5 h-5 text-(--palette-danger) mt-0.5"
            />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                {t('documents.validationErrorsTitle')}
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-(--palette-req)">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <FileAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => {
          setShowAssignmentModal(false);
          setUploadedFiles([]);
        }}
        uploadedFiles={uploadedFiles}
        onAssign={handleAssign}
      />

      {/* Inline upload progress */}
      {isUploading && (
        <div className="mx-3.5 mb-2 p-3 bg-(--palette-surface) border border-(--palette-line) rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" variant="default" />
              <span className="text-sm font-medium text-(--palette-ink)">
                {t('documents.uploadingDocuments')}
              </span>
            </div>
            <span className="text-xs text-(--palette-gray-500)">
              {t('documents.uploadComplete', {
                done: uploadProgress.filter(p => p.status === 'success').length,
                total: uploadProgress.length,
              })}
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uploadProgress.map((progress, index) => (
              <div
                key={index}
                className={clsx(
                  'flex items-center gap-3 p-2 rounded-lg text-sm',
                  progress.status === 'success' && 'bg-green-50 dark:bg-green-500/10',
                  progress.status === 'error' && 'bg-(--palette-req-wash)',
                  progress.status === 'uploading' && 'bg-blue-50 dark:bg-blue-500/10',
                  progress.status === 'pending' && 'bg-(--palette-surface-2)',
                )}
              >
                {progress.status === 'pending' && (
                  <Icon
                    name="clock"
                    style="regular"
                    className="w-4 h-4 text-(--palette-gray-400)"
                  />
                )}
                {progress.status === 'uploading' && <LoadingSpinner size="sm" variant="default" />}
                {progress.status === 'success' && (
                  <Icon
                    name="circle-check"
                    style="solid"
                    className="w-4 h-4 text-green-600 dark:text-green-400"
                  />
                )}
                {progress.status === 'error' && (
                  <Icon
                    name="circle-xmark"
                    style="solid"
                    className="w-4 h-4 text-(--palette-danger)"
                  />
                )}
                <span
                  className={clsx(
                    'flex-1 truncate',
                    progress.status === 'success' && 'text-green-700 dark:text-green-300',
                    progress.status === 'error' && 'text-(--palette-req)',
                    progress.status === 'uploading' && 'text-blue-700 dark:text-blue-300',
                    progress.status === 'pending' && 'text-(--palette-gray-600)',
                  )}
                >
                  {progress.fileName}
                </span>
                {progress.status === 'error' && progress.errorMessage && (
                  <span className="text-xs text-red-500">{progress.errorMessage}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default CreateRequestFileInput;
