import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import FileInput from '@/shared/components/inputs/FileInput';
import clsx from 'clsx';
import { type UploadDocumentResponse, useUploadDocument } from '../api';
import FileAssignmentModal from './FileAssignmentModal';
import { getDocumentCategory, type UploadedDocument } from '../types/document';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

interface CreateRequestFileInputProps {
  getOrCreateSession: () => Promise<string>;
}

const CreateRequestFileInput = ({ getOrCreateSession }: CreateRequestFileInputProps) => {
  const { setValue, watch } = useFormContext();
  const { mutate: uploadDocuments, isPending } = useUploadDocument();
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<(UploadDocumentResponse & { file: File })[]>(
    [],
  );
  const [, setSelectedFiles] = useState<FileList | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleAssign = async (assignments: any[]) => {
    // Close modal and show uploading state
    setShowAssignmentModal(false);
    setIsUploading(true);

    try {
      // Get or create upload session first
      const sessionId = await getOrCreateSession();

      // Upload files sequentially and collect results
      const uploadResults: { assignment: any; documentId: string; fileName: string }[] = [];
      let failedCount = 0;

      for (const assignment of assignments) {
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
                  resolve();
                },
                onError: error => {
                  console.error('Upload failed for file:', assignment.file.name, error);
                  failedCount++;
                  resolve(); // Continue with other files
                },
              },
            );
          });
        } catch (error) {
          console.error('Upload failed for file:', assignment.file.name, error);
          failedCount++;
        }
      }

      // Map uploaded documents to form state
      const requestDocs: UploadedDocument[] = [];
      const titleDocsMap: Record<number, UploadedDocument[]> = {};

      uploadResults.forEach(({ assignment, documentId, fileName }) => {
        const newDoc: UploadedDocument = {
          documentId,
          docType: assignment.docType,
          fileName,
          uploadDate: new Date().toISOString(),
          prefix: null,
          set: assignment.set,
          comment: assignment.comment || null,
          filePath: null,
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

      // Update form state
      if (requestDocs.length > 0) {
        const currentRequestDocs = watch('requestDocuments') || [];
        setValue('requestDocuments', [...currentRequestDocs, ...requestDocs], {
          shouldDirty: true,
        });
      }

      // Update title documents
      Object.entries(titleDocsMap).forEach(([index, docs]) => {
        const titleIndex = parseInt(index);
        const currentTitleDocs = watch(`titles.${titleIndex}.titleDocuments`) || [];
        setValue(`titles.${titleIndex}.titleDocuments`, [...currentTitleDocs, ...docs], {
          shouldDirty: true,
        });
      });

      // Reset state
      setUploadedFiles([]);
      setSelectedFiles(null);
      setIsUploading(false);

      // Show success/partial message
      if (failedCount > 0) {
        toast.error(`${failedCount} file(s) failed to upload`);
      }
      if (uploadResults.length > 0) {
        toast.success(`Successfully uploaded ${uploadResults.length} document(s)`);
      }
    } catch (error) {
      console.error('Session creation failed:', error);
      toast.error('Failed to create upload session. Please try again.');

      // Reset state on error
      setUploadedFiles([]);
      setSelectedFiles(null);
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Create a synthetic change event
      const event = {
        target: { files },
      } as React.ChangeEvent<HTMLInputElement>;
      handleChange(event);
    }
  };

  return (
    <>
      <FileInput onChange={handleChange}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={clsx(
            'w-full',
            'border-2',
            'border-dashed',
            'p-10',
            'transition-all',
            'duration-200',
            isDragging
              ? 'border-blue-500 bg-blue-100 scale-105'
              : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50',
            isPending && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className={clsx('flex', 'flex-col', 'gap-5', 'items-center', 'justify-center')}>
            {isPending ? (
              <LoadingSpinner size="lg" variant="document" text="Uploading files..." />
            ) : (
              <>
                <Icon
                  style="solid"
                  name={isDragging ? 'cloud-arrow-up' : 'folder-open'}
                  className={clsx(
                    'text-6xl',
                    isDragging ? 'text-blue-600 animate-bounce' : 'text-gray-400',
                  )}
                />
                <p className={clsx('font-medium', isDragging ? 'text-blue-600' : 'text-gray-600')}>
                  {isDragging ? 'Drop files here' : 'Drag and drop your files here or choose files'}
                </p>
                {!isDragging && (
                  <p className="text-sm text-gray-400">Supported: PDF, PNG, JPG (Max 10MB each)</p>
                )}
              </>
            )}
          </div>
        </div>
      </FileInput>

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

      {/* Upload loading overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 shadow-xl flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" variant="document" text="Uploading documents..." />
            <p className="text-sm text-gray-500">Please wait while we upload your files</p>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateRequestFileInput;
