import { useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import FileInput from '@/shared/components/inputs/FileInput';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import DocumentActionMenu from './DocumentActionMenu';
import DocumentEditModal from './DocumentEditModal';
import { useDownloadDocument, useUploadDocument } from '../api';
import {
  type DocumentChecklistItem,
  ENTITY_KEY_PREFIXES,
  getDocumentCategory,
  getDocumentTypeInfo,
  MOCK_REQUEST_DOCUMENTS,
  MOCK_TITLE_DOCUMENTS,
  type UploadedDocument,
} from '../types/document';
import clsx from 'clsx';

interface DocumentRowProps {
  document: UploadedDocument | null;
  documentType: string;
  documentTypeCode: string;
  isRequired: boolean;
  entityType: 'request' | 'title';
  entityIndex: number;
  docTypeIndex: number;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onUpload: (file: File, docType: string) => void;
  onDelete: (document: UploadedDocument) => void;
  onEdit: (document: UploadedDocument) => void;
  onReplace: (document: UploadedDocument) => void;
  onView: (document: UploadedDocument) => void;
}

interface ProgressStats {
  uploaded: number;
  required: number;
  total: number;
  percentage: number;
}

const DocumentRow: React.FunctionComponent<DocumentRowProps> = ({
  document,
  documentType,
  documentTypeCode,
  isRequired,
  isSelected,
  onSelect,
  onUpload,
  onDelete,
  onEdit,
  onReplace,
  onView,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(files[0], documentTypeCode);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFileIcon = (fileName?: string | null, file?: File) => {
    if (!fileName) return null;
    const extension = fileName.split('.').pop()?.toLowerCase();

    // Show image thumbnail if it's an image file
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '') && file) {
      const imageUrl = URL.createObjectURL(file);
      return (
        <img
          src={imageUrl}
          alt={fileName}
          className="w-12 h-12 object-cover rounded border border-gray-200"
          onLoad={() => URL.revokeObjectURL(imageUrl)}
        />
      );
    }

    if (extension === 'pdf') {
      return <Icon name="file-pdf" style="solid" className="w-8 h-8 text-red-500" />;
    }
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '')) {
      return <Icon name="file-image" style="solid" className="w-8 h-8 text-blue-500" />;
    }
    return <Icon name="file" style="solid" className="w-8 h-8 text-gray-500" />;
  };

  const isUploading = document?.isUploading || false;

  if (!document) {
    return (
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 w-12">{/* Empty checkbox for placeholder rows */}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-700">{documentType}</span>
            {isRequired && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                Required
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3" colSpan={4}>
          <div className="flex items-center gap-3 py-2 px-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
            <Icon name="file-circle-plus" style="regular" className="w-5 h-5 text-gray-400" />
            <span className="text-gray-500 text-sm">No file uploaded</span>
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <FileInput onChange={handleFileChange} fullWidth={false}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors cursor-pointer shadow-sm">
              <Icon name="cloud-arrow-up" style="solid" className="w-3.5 h-3.5" />
              Upload file
            </span>
          </FileInput>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={clsx(
        'hover:bg-gray-50 transition-colors',
        isUploading && 'opacity-60',
        isSelected && 'bg-primary/5',
      )}
    >
      <td className="px-4 py-3 w-12">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={e => onSelect(e.target.checked)}
          disabled={isUploading}
          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-700">{documentType}</span>
          {isRequired && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
              Required
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {isUploading ? (
            <LoadingSpinner size="sm" variant="default" />
          ) : (
            getFileIcon(document.fileName, document.file)
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{document.fileName}</span>
            <span className="text-xs text-gray-500">
              {isUploading ? 'Uploading...' : formatFileSize(document.file?.size)}
            </span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(document.uploadedAt)}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{document.prefix || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{document.set}</td>
      <td className="px-4 py-3 text-center">
        {isUploading ? (
          <span className="text-xs text-gray-500">Processing...</span>
        ) : (
          <DocumentActionMenu
            document={document}
            onView={onView}
            onDelete={onDelete}
            onEdit={onEdit}
            onReplace={onReplace}
          />
        )}
      </td>
    </tr>
  );
};

interface DocumentUploaderProps {
  getOrCreateSession: () => Promise<string>;
}

const DocumentUploader: React.FunctionComponent<DocumentUploaderProps> = ({
  getOrCreateSession,
}) => {
  const { watch, setValue } = useFormContext();
  const titles = watch('titles') || [];
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [editingDocument, setEditingDocument] = useState<{
    document: UploadedDocument;
    entityType: 'request' | 'title';
    entityIndex: number;
  } | null>(null);
  const [replacingDocument, setReplacingDocument] = useState<{
    docType: string;
    entityType: 'request' | 'title';
    entityIndex: number;
  } | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    document: UploadedDocument | null;
    entityType: 'request' | 'title';
    entityIndex: number;
  }>({ isOpen: false, document: null, entityType: 'request', entityIndex: -1 });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const { mutate: uploadDocument } = useUploadDocument();
  const { mutate: downloadDocument } = useDownloadDocument();

  // Toggle section collapse state
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  // Expand/collapse all sections
  const toggleAllSections = (collapse: boolean) => {
    if (collapse) {
      const allKeys = generateDocumentChecklist().map(
        item => `${item.entityType}-${item.entityIndex}`,
      );
      setCollapsedSections(new Set(allKeys));
    } else {
      setCollapsedSections(new Set());
    }
  };

  // Helper to create unique document identifier
  const getDocumentId = (entityType: 'request' | 'title', entityIndex: number, docType: string) => {
    return `${entityType}-${entityIndex}-${docType}`;
  };

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, []);

  const generateDocumentChecklist = (): DocumentChecklistItem[] => {
    const checklist: DocumentChecklistItem[] = [];

    // Add request-level documents
    checklist.push({
      entityType: 'request',
      entityKey: `${ENTITY_KEY_PREFIXES.request}XXXXXXX`,
      entityIndex: -1,
      requiredDocuments: MOCK_REQUEST_DOCUMENTS,
    });

    // Add title-level documents
    titles.forEach((_title: any, index: number) => {
      const prefix =
        index % 2 === 0 ? ENTITY_KEY_PREFIXES.title_chonot : ENTITY_KEY_PREFIXES.title_regis;
      const suffix = index % 2 === 0 ? 'xxxx' : `xxxx`;

      checklist.push({
        entityType: 'title',
        entityKey: `${prefix}${suffix}`,
        entityIndex: index,
        requiredDocuments: MOCK_TITLE_DOCUMENTS,
      });
    });

    return checklist;
  };

  const getDocumentForSlot = (
    entityType: 'request' | 'title',
    entityIndex: number,
    docType: string,
  ): UploadedDocument | null => {
    if (entityType === 'request') {
      const documents = watch('documents') || [];
      return documents.find((doc: UploadedDocument) => doc.documentType === docType) || null;
    } else {
      const titleDocuments = watch(`titles.${entityIndex}.documents`) || [];
      return titleDocuments.find((doc: UploadedDocument) => doc.documentType === docType) || null;
    }
  };

  // Calculate progress stats for a single entity section
  const calculateSectionProgress = (
    entityType: 'request' | 'title',
    entityIndex: number,
    requiredDocs: { type: string; isRequired: boolean }[],
  ): ProgressStats => {
    const requiredDocsOnly = requiredDocs.filter(d => d.isRequired);
    const uploadedRequired = requiredDocsOnly.filter(doc =>
      getDocumentForSlot(entityType, entityIndex, doc.type),
    ).length;

    return {
      uploaded: uploadedRequired,
      required: requiredDocsOnly.length,
      total: requiredDocs.length,
      percentage: requiredDocsOnly.length > 0 ? (uploadedRequired / requiredDocsOnly.length) * 100 : 100,
    };
  };

  // Calculate overall progress across all entities
  const calculateOverallProgress = (): ProgressStats => {
    const checklist = generateDocumentChecklist();
    let totalRequired = 0;
    let totalUploaded = 0;
    let totalDocs = 0;

    checklist.forEach(item => {
      const stats = calculateSectionProgress(item.entityType, item.entityIndex, item.requiredDocuments);
      totalRequired += stats.required;
      totalUploaded += stats.uploaded;
      totalDocs += stats.total;
    });

    return {
      uploaded: totalUploaded,
      required: totalRequired,
      total: totalDocs,
      percentage: totalRequired > 0 ? (totalUploaded / totalRequired) * 100 : 100,
    };
  };

  const updateDocument = (
    entityType: 'request' | 'title',
    entityIndex: number,
    _docType: string,
    updater: (docs: UploadedDocument[]) => UploadedDocument[],
  ) => {
    if (entityType === 'request') {
      const documents = watch('documents') || [];
      setValue('documents', updater(documents), { shouldDirty: true });
    } else {
      const titleDocuments = watch(`titles.${entityIndex}.documents`) || [];
      setValue(`titles.${entityIndex}.documents`, updater(titleDocuments), {
        shouldDirty: true,
      });
    }
  };

  const handleUpload = async (
    file: File,
    docType: string,
    entityType: 'request' | 'title',
    entityIndex: number,
  ) => {
    // Create temporary document with uploading state
    const docTypeInfo = getDocumentTypeInfo(docType);
    const tempDocument: UploadedDocument = {
      id: null,
      titleId: null,
      documentId: null,
      documentType: docType || null,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      prefix: null,
      set: 1,
      documentDescription: null,
      filePath: null,
      createdWorkstation: null,
      isRequired: docTypeInfo?.isRequired || false,
      uploadedBy: null,
      uploadedByName: null,
      file,
      isUploading: true,
    };

    // Add/update document in form state with uploading flag
    updateDocument(entityType, entityIndex, docType, docs => {
      const existingIndex = docs.findIndex(doc => doc.documentType === docType);
      if (existingIndex >= 0) {
        docs[existingIndex] = tempDocument;
      } else {
        docs.push(tempDocument);
      }
      return [...docs];
    });

    try {
      // Get or create upload session
      const sessionId = await getOrCreateSession();

      // Upload file with session
      uploadDocument(
        {
          uploadSessionId: sessionId,
          file,
          documentType: docType,
          documentCategory: getDocumentCategory(docType),
        },
        {
          onSuccess: uploadedDoc => {
            // Update document with documentId and remove uploading flag
            updateDocument(entityType, entityIndex, docType, docs => {
              const doc = docs.find(d => d.documentType === docType);
              if (doc) {
                doc.documentId = uploadedDoc.documentId;
                doc.fileName = uploadedDoc.fileName;
                doc.filePath = null; // Will be fetched from server when needed
                doc.isUploading = false;
              }
              return [...docs];
            });

            toast.success(`Document uploaded successfully`);
          },
          onError: (error: any) => {
            // Remove document on error
            updateDocument(entityType, entityIndex, docType, docs =>
              docs.filter(d => d.documentType !== docType),
            );

            toast.error(error.apiError?.detail || 'Upload failed. Please try again.');
          },
        },
      );
    } catch (error: any) {
      // Session creation failed
      updateDocument(entityType, entityIndex, docType, docs =>
        docs.filter(d => d.documentType !== docType),
      );
      toast.error(error.apiError?.detail || 'Failed to create upload session. Please try again.');
    }
  };

  const handleDelete = (
    document: UploadedDocument,
    entityType: 'request' | 'title',
    entityIndex: number,
  ) => {
    setDeleteConfirm({ isOpen: true, document, entityType, entityIndex });
  };

  const confirmDelete = () => {
    if (!deleteConfirm.document) return;

    const { document, entityType, entityIndex } = deleteConfirm;
    const docTypeInfo = getDocumentTypeInfo(document.documentType || '');
    const isRequired = docTypeInfo?.isRequired || false;

    // Remove the document to show empty placeholder
    updateDocument(entityType, entityIndex, document.documentType || '', docs =>
      docs.filter(doc => doc.documentType !== document.documentType),
    );

    const message = isRequired
      ? 'Required document removed. You can upload a new file.'
      : 'Document deleted';
    toast.success(message);
    setDeleteConfirm({ isOpen: false, document: null, entityType: 'request', entityIndex: -1 });
  };

  const handleEdit = (
    document: UploadedDocument,
    entityType: 'request' | 'title',
    entityIndex: number,
  ) => {
    setEditingDocument({ document, entityType, entityIndex });
  };

  const handleSaveEdit = (updatedDocument: UploadedDocument) => {
    if (!editingDocument) return;

    const { entityType, entityIndex } = editingDocument;

    updateDocument(entityType, entityIndex, updatedDocument.documentType || '', docs =>
      docs.map(doc => (doc.documentType === updatedDocument.documentType ? updatedDocument : doc)),
    );

    setEditingDocument(null);
    toast.success('Document details updated');
  };

  const handleReplace = (
    document: UploadedDocument,
    entityType: 'request' | 'title',
    entityIndex: number,
  ) => {
    setReplacingDocument({
      docType: document.documentType || '',
      entityType,
      entityIndex,
    });
    replaceFileInputRef.current?.click();
  };

  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingDocument) return;

    const { docType, entityType, entityIndex } = replacingDocument;

    // Get current document to preserve metadata
    const currentDoc = getDocumentForSlot(entityType, entityIndex, docType);

    // Create new document preserving metadata
    const docTypeInfo = getDocumentTypeInfo(docType);
    const tempDocument: UploadedDocument = {
      id: currentDoc?.id || null,
      titleId: currentDoc?.titleId || null,
      documentId: currentDoc?.documentId || null,
      documentType: docType || null,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      prefix: currentDoc?.prefix || null,
      set: currentDoc?.set || 1,
      documentDescription: currentDoc?.documentDescription || null,
      filePath: currentDoc?.filePath || null,
      createdWorkstation: currentDoc?.createdWorkstation || null,
      isRequired: docTypeInfo?.isRequired || currentDoc?.isRequired || false,
      uploadedBy: currentDoc?.uploadedBy || null,
      uploadedByName: currentDoc?.uploadedByName || null,
      file,
      isUploading: true,
    };

    // Update document with uploading state
    updateDocument(entityType, entityIndex, docType, docs =>
      docs.map(doc => (doc.documentType === docType ? tempDocument : doc)),
    );

    // Reset replace state early
    setReplacingDocument(null);
    e.target.value = '';

    try {
      // Get or create upload session
      const sessionId = await getOrCreateSession();

      // Upload new file with session
      uploadDocument(
        {
          uploadSessionId: sessionId,
          file,
          documentType: docType,
          documentCategory: getDocumentCategory(docType),
        },
        {
          onSuccess: uploadedDoc => {
            updateDocument(entityType, entityIndex, docType, docs => {
              const doc = docs.find(d => d.documentType === docType);
              if (doc) {
                doc.documentId = uploadedDoc.documentId;
                doc.filePath = null;
                doc.fileName = uploadedDoc.fileName;
                doc.isUploading = false;
              }
              return [...docs];
            });

            toast.success('Document replaced successfully');
          },
          onError: (error: any) => {
            // Revert to original document on error
            if (currentDoc) {
              updateDocument(entityType, entityIndex, docType, docs =>
                docs.map(doc => (doc.documentType === docType ? currentDoc : doc)),
              );
            }

            toast.error(error.apiError?.detail || 'Replace failed. Please try again.');
          },
        },
      );
    } catch (error: any) {
      // Session creation failed - revert to original
      if (currentDoc) {
        updateDocument(entityType, entityIndex, docType, docs =>
          docs.map(doc => (doc.documentType === docType ? currentDoc : doc)),
        );
      }
      toast.error(error.apiError?.detail || 'Failed to create upload session. Please try again.');
    }
  };

  const handleView = (document: UploadedDocument) => {
    if (document.file) {
      // View local file
      const url = URL.createObjectURL(document.file);
      window.open(url, '_blank');
    } else if (document.documentId) {
      // Download from server
      downloadDocument(document.documentId, {
        onSuccess: blob => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || 'Failed to download document');
        },
      });
    } else if (document.filePath) {
      // Fallback to filePath
      window.open(document.filePath, '_blank');
    }
  };

  const handleSelectDocument = (
    entityType: 'request' | 'title',
    entityIndex: number,
    docType: string,
    selected: boolean,
  ) => {
    const docId = getDocumentId(entityType, entityIndex, docType);
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(docId);
      } else {
        newSet.delete(docId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const checklist = generateDocumentChecklist();
      const allDocIds = new Set<string>();

      checklist.forEach(item => {
        item.requiredDocuments.forEach(docInfo => {
          const document = getDocumentForSlot(item.entityType, item.entityIndex, docInfo.type);
          if (document && !document.isUploading) {
            allDocIds.add(getDocumentId(item.entityType, item.entityIndex, docInfo.type));
          }
        });
      });

      setSelectedDocuments(allDocIds);
    } else {
      setSelectedDocuments(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedDocuments.size === 0) return;
    setBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    let deletedCount = 0;

    selectedDocuments.forEach(docId => {
      const [entityType, entityIndexStr, docType] = docId.split('-');
      const entityIndex = parseInt(entityIndexStr);

      updateDocument(entityType as 'request' | 'title', entityIndex, docType, docs =>
        docs.filter(doc => doc.documentType !== docType),
      );

      deletedCount++;
    });

    setSelectedDocuments(new Set());
    setBulkDeleteConfirm(false);
    toast.success(`Deleted ${deletedCount} document(s)`);
  };

  const checklist = generateDocumentChecklist();

  // Calculate if all selectable documents are selected
  const selectableDocuments = checklist.flatMap(item =>
    item.requiredDocuments
      .map(docInfo => {
        const document = getDocumentForSlot(item.entityType, item.entityIndex, docInfo.type);
        return document && !document.isUploading
          ? getDocumentId(item.entityType, item.entityIndex, docInfo.type)
          : null;
      })
      .filter(Boolean),
  ) as string[];

  const allSelected =
    selectableDocuments.length > 0 &&
    selectableDocuments.every(docId => selectedDocuments.has(docId));
  const someSelected = selectedDocuments.size > 0 && !allSelected;

  const overallProgress = calculateOverallProgress();

  return (
    <>
      {/* Overall progress bar */}
      <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon
              name={overallProgress.percentage === 100 ? 'circle-check' : 'file-lines'}
              style="solid"
              className={clsx(
                'w-5 h-5',
                overallProgress.percentage === 100 ? 'text-green-600' : 'text-primary',
              )}
            />
            <span className="text-sm font-medium text-gray-700">Required Documents</span>
          </div>
          <span
            className={clsx(
              'text-sm font-semibold',
              overallProgress.percentage === 100 ? 'text-green-600' : 'text-primary',
            )}
          >
            {overallProgress.uploaded}/{overallProgress.required} uploaded
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={clsx(
              'h-2.5 rounded-full transition-all duration-300',
              overallProgress.percentage === 100
                ? 'bg-green-500'
                : overallProgress.percentage > 0
                  ? 'bg-primary'
                  : 'bg-gray-300',
            )}
            style={{ width: `${overallProgress.percentage}%` }}
          />
        </div>
        {overallProgress.percentage === 100 && (
          <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
            <Icon name="check" style="solid" className="w-3 h-3" />
            All required documents have been uploaded
          </p>
        )}
      </div>

      {/* Validation summary - missing required documents */}
      {overallProgress.percentage < 100 && overallProgress.required > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Icon
              name="triangle-exclamation"
              style="solid"
              className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">
                Missing Required Documents ({overallProgress.required - overallProgress.uploaded})
              </h4>
              <div className="space-y-2">
                {checklist.map(item => {
                  const missingDocs = item.requiredDocuments.filter(
                    docInfo =>
                      docInfo.isRequired &&
                      !getDocumentForSlot(item.entityType, item.entityIndex, docInfo.type),
                  );

                  if (missingDocs.length === 0) return null;

                  const entityLabel =
                    item.entityType === 'request'
                      ? 'Request'
                      : `Title ${item.entityIndex + 1}`;

                  return (
                    <div key={`missing-${item.entityType}-${item.entityIndex}`} className="text-sm">
                      <span className="font-medium text-amber-700">{entityLabel}:</span>
                      <span className="text-amber-600 ml-1">
                        {missingDocs.map(d => d.displayName).join(', ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expand/Collapse controls */}
      <div className="mb-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => toggleAllSections(false)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          <Icon name="angles-down" style="solid" className="w-3 h-3" />
          Expand all
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={() => toggleAllSections(true)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          <Icon name="angles-up" style="solid" className="w-3 h-3" />
          Collapse all
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedDocuments.size > 0 && (
        <div className="mb-4 flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Icon name="circle-check" style="solid" className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              {selectedDocuments.size} document(s) selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDocuments(new Set())}
              className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded transition-colors"
            >
              Clear selection
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 rounded transition-colors flex items-center gap-2"
            >
              <Icon name="trash" style="solid" className="w-4 h-4" />
              Delete selected
            </button>
          </div>
        </div>
      )}

      <div className="h-96 overflow-auto rounded-lg">
        <table className="table w-full">
          <thead ref={headerRef} className="sticky top-0 z-20 bg-primary-50">
            <tr>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left first:rounded-tl-lg w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={e => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                  title={allSelected ? 'Deselect all' : 'Select all'}
                />
              </th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left">
                Document type
              </th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left">File name</th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left">
                Date uploaded
              </th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Prefix</th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Set</th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-center last:rounded-tr-lg"></th>
            </tr>
          </thead>
          {checklist.map(item => {
            const sectionProgress = calculateSectionProgress(
              item.entityType,
              item.entityIndex,
              item.requiredDocuments,
            );
            const isComplete = sectionProgress.percentage === 100;
            const sectionKey = `${item.entityType}-${item.entityIndex}`;
            const isCollapsed = collapsedSections.has(sectionKey);

            return (
            <tbody key={`${item.entityType}.${item.entityKey}`}>
              <tr
                className={clsx('sticky z-10 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors')}
                style={{ top: `${headerHeight}px` }}
                onClick={() => toggleSection(sectionKey)}
              >
                <th colSpan={7} className="px-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon
                        name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                        style="solid"
                        className="w-4 h-4 text-gray-500 transition-transform"
                      />
                      <Icon
                        name={item.entityType === 'request' ? 'folder-open' : 'file-certificate'}
                        style="solid"
                        className="w-4 h-4 text-gray-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{item.entityKey}</span>
                      <span className="text-xs text-gray-400">
                        ({item.requiredDocuments.length} documents)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                          <Icon name="check" style="solid" className="w-3 h-3" />
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                          <Icon name="clock" style="regular" className="w-3 h-3" />
                          {sectionProgress.uploaded}/{sectionProgress.required} required
                        </span>
                      )}
                    </div>
                  </div>
                </th>
              </tr>
              {!isCollapsed && item.requiredDocuments.map((docInfo, docIndex) => {
                const document = getDocumentForSlot(
                  item.entityType,
                  item.entityIndex,
                  docInfo.type,
                );
                const docId = getDocumentId(item.entityType, item.entityIndex, docInfo.type);
                const isSelected = selectedDocuments.has(docId);

                return (
                  <DocumentRow
                    key={`${item.entityType}.${item.entityIndex}.${docInfo.type}`}
                    document={document}
                    documentType={docInfo.displayName}
                    documentTypeCode={docInfo.type}
                    isRequired={docInfo.isRequired}
                    entityType={item.entityType}
                    entityIndex={item.entityIndex}
                    docTypeIndex={docIndex}
                    isSelected={isSelected}
                    onSelect={selected =>
                      handleSelectDocument(
                        item.entityType,
                        item.entityIndex,
                        docInfo.type,
                        selected,
                      )
                    }
                    onUpload={(file, docType) =>
                      handleUpload(file, docType, item.entityType, item.entityIndex)
                    }
                    onDelete={doc => handleDelete(doc, item.entityType, item.entityIndex)}
                    onEdit={doc => handleEdit(doc, item.entityType, item.entityIndex)}
                    onReplace={doc => handleReplace(doc, item.entityType, item.entityIndex)}
                    onView={handleView}
                  />
                );
              })}
            </tbody>
          );
          })}
        </table>
      </div>

      {/* Hidden file input for replace functionality */}
      <input
        ref={replaceFileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleReplaceFileSelected}
      />

      {/* Edit modal */}
      {editingDocument && (
        <DocumentEditModal
          isOpen={true}
          onClose={() => setEditingDocument(null)}
          document={editingDocument.document}
          onSave={handleSaveEdit}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() =>
          setDeleteConfirm({
            isOpen: false,
            document: null,
            entityType: 'request',
            entityIndex: -1,
          })
        }
        onConfirm={confirmDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Bulk delete confirmation dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Documents"
        message={`Are you sure you want to delete ${selectedDocuments.size} selected document(s)? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
};

export default DocumentUploader;
