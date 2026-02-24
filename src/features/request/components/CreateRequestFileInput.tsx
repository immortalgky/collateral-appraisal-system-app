import { useState, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import UploadArea from '@/shared/components/inputs/UploadArea';
import { type UploadDocumentResponse, useUploadDocument } from '../api';
import FileAssignmentModal from './FileAssignmentModal';
import { getDocumentCategory, getDocumentTypeInfo, type UploadedDocument } from '../types/document';
import { useAuthStore } from '@/features/auth/store';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

/**
 * Merge new documents with existing documents, updating placeholders for required documents
 * instead of creating duplicates.
 */
const mergeDocumentsWithPlaceholders = (
  existingDocs: UploadedDocument[],
  newDocs: UploadedDocument[],
): UploadedDocument[] => {
  const result = [...existingDocs];

  newDocs.forEach(newDoc => {
    // Find existing placeholder with same documentType that has no file
    const placeholderIndex = result.findIndex(
      doc => doc.documentType === newDoc.documentType && !doc.fileName,
    );

    if (placeholderIndex !== -1) {
      // Update the placeholder with file data
      result[placeholderIndex] = {
        ...result[placeholderIndex],
        ...newDoc,
        // Preserve isRequired from the placeholder
        isRequired: result[placeholderIndex].isRequired,
      };
    } else {
      // No placeholder found, append as new document
      result.push(newDoc);
    }
  });

  return result;
};

interface UploadProgress {
  fileName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface CreateRequestFileInputProps {
  getOrCreateSession: () => Promise<string>;
}

const CreateRequestFileInput = ({ getOrCreateSession }: CreateRequestFileInputProps) => {
  const { setValue, watch } = useFormContext();
  const currentUser = useAuthStore(state => state.user);
  const { mutate: uploadDocuments, isPending } = useUploadDocument();
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<(UploadDocumentResponse & { file: File })[]>(
    [],
  );
  const [, setSelectedFiles] = useState<FileList | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const isUploading = uploadProgress.length > 0;

  const validateFiles = (files: FileList): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File size exceeds 10MB`);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
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
        // Update status to uploading
        updateFileProgress(assignment.file.name, 'uploading');

        try {
          // Upload single file with session
          await new Promise<void>(resolve => {
            uploadDocuments(
              {
                uploadSessionId: sessionId,
                file: assignment.file,
                documentType: assignment.docType,
                documentCategory: getDocumentCategory(assignment.docType),
              },
              {
                onSuccess: uploadedDoc => {
                  uploadResults.push({
                    assignment,
                    documentId: uploadedDoc.documentId,
                    fileName: uploadedDoc.fileName,
                  });
                  updateFileProgress(assignment.file.name, 'success');
                  resolve();
                },
                onError: (error: any) => {
                  console.error('Upload failed for file:', assignment.file.name, error);
                  updateFileProgress(
                    assignment.file.name,
                    'error',
                    error.apiError?.detail || 'Upload failed',
                  );
                  failedCount++;
                  resolve(); // Continue with other files
                },
              },
            );
          });
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

      // Map uploaded documents to form state
      const requestDocs: UploadedDocument[] = [];
      const titleDocsMap: Record<number, UploadedDocument[]> = {};

      uploadResults.forEach(({ assignment, documentId, fileName }) => {
        const docTypeInfo = getDocumentTypeInfo(assignment.docType);
        const newDoc: UploadedDocument = {
          id: null,
          titleId: null,
          documentId,
          documentType: assignment.docType || null,
          fileName: fileName,
          uploadedAt: new Date().toISOString(),
          prefix: null,
          set: assignment.set ?? 1,
          documentDescription: assignment.comment || null,
          filePath: null,
          createdWorkstation: null,
          isRequired: docTypeInfo?.isRequired || false,
          uploadedBy: currentUser?.username || null,
          uploadedByName: currentUser?.name || null,
          file: assignment.file,
        };

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
        const currentDocs: UploadedDocument[] = watch('documents') || [];
        const mergedDocs = mergeDocumentsWithPlaceholders(currentDocs, requestDocs);
        setValue('documents', mergedDocs, {
          shouldDirty: true,
        });
      }

      // Update title documents - merge with existing placeholders
      Object.entries(titleDocsMap).forEach(([index, docs]) => {
        const titleIndex = parseInt(index);
        const currentTitleDocs: UploadedDocument[] = watch(`titles.${titleIndex}.documents`) || [];
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
        toast.error(`${failedCount} file(s) failed to upload`);
      }
      if (uploadResults.length > 0) {
        toast.success(`Successfully uploaded ${uploadResults.length} document(s)`);
      }

      // Clear progress after a delay to show completion
      setTimeout(() => {
        setUploadProgress([]);
      }, 2000);
    } catch (error: any) {
      console.error('Session creation failed:', error);
      toast.error(error.apiError?.detail || 'Failed to create upload session. Please try again.');

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
    }
  };

  return (
    <>
      <UploadArea
        onChange={handleChange}
        supportedText="PDF, PNG, JPG (Max 10MB each)"
        isLoading={isPending}
      />

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Icon
              name="triangle-exclamation"
              style="solid"
              className="w-5 h-5 text-red-600 mt-0.5"
            />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-2">File Validation Errors</h4>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">
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
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" variant="default" />
              <span className="text-sm font-medium text-gray-700">Uploading documents...</span>
            </div>
            <span className="text-xs text-gray-500">
              {uploadProgress.filter(p => p.status === 'success').length}/{uploadProgress.length}{' '}
              complete
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uploadProgress.map((progress, index) => (
              <div
                key={index}
                className={clsx(
                  'flex items-center gap-3 p-2 rounded-lg text-sm',
                  progress.status === 'success' && 'bg-green-50',
                  progress.status === 'error' && 'bg-red-50',
                  progress.status === 'uploading' && 'bg-blue-50',
                  progress.status === 'pending' && 'bg-gray-50',
                )}
              >
                {progress.status === 'pending' && (
                  <Icon name="clock" style="regular" className="w-4 h-4 text-gray-400" />
                )}
                {progress.status === 'uploading' && (
                  <LoadingSpinner size="sm" variant="default" />
                )}
                {progress.status === 'success' && (
                  <Icon name="circle-check" style="solid" className="w-4 h-4 text-green-600" />
                )}
                {progress.status === 'error' && (
                  <Icon name="circle-xmark" style="solid" className="w-4 h-4 text-red-600" />
                )}
                <span
                  className={clsx(
                    'flex-1 truncate',
                    progress.status === 'success' && 'text-green-700',
                    progress.status === 'error' && 'text-red-700',
                    progress.status === 'uploading' && 'text-blue-700',
                    progress.status === 'pending' && 'text-gray-600',
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
