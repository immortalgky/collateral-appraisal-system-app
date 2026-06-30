import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import Icon from '@/shared/components/Icon';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import DocumentActionMenu from './DocumentActionMenu';
import DocumentEditModal from './DocumentEditModal';
import MoveDocumentModal, { type MoveTargetSection } from './MoveDocumentModal';
import AppointmentLetterButton from './AppointmentLetterButton';
import { useDownloadDocument, useUploadDocument } from '../api';
import { getDocumentCategory, type UploadedDocument } from '../types/document';
import { useGetDocumentTypes, getDocumentTypeName } from '../api/documentTypes';
import clsx from 'clsx';
import { useAuthStore } from '@features/auth/store.ts';
import { useFormReadOnly } from '@/shared/components/form/context';

interface UploadedDocumentRowProps {
  document: UploadedDocument;
  entityType: 'request' | 'title';
  entityIndex: number;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: (document: UploadedDocument) => void;
  onEdit: (document: UploadedDocument) => void;
  onReplace: (document: UploadedDocument) => void;
  onMove: (document: UploadedDocument) => void;
  onView: (document: UploadedDocument) => void;
  onUpload: (document: UploadedDocument) => void;
  readOnly?: boolean;
  getDocTypeName: (code: string) => string;
}

const UploadedDocumentRow: React.FunctionComponent<UploadedDocumentRowProps> = ({
  document,
  isSelected,
  onSelect,
  onDelete,
  onEdit,
  onReplace,
  onMove,
  onView,
  onUpload,
  readOnly,
  getDocTypeName,
}) => {
  const { t } = useTranslation('request');
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return (
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' +
      date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    );
  };

  const getFileIcon = (fileName?: string | null) => {
    if (!fileName) return null;
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      return <Icon name="file-pdf" style="solid" className="w-8 h-8 text-red-500" />;
    }
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '')) {
      return <Icon name="file-image" style="solid" className="w-8 h-8 text-blue-500" />;
    }
    return <Icon name="file" style="solid" className="w-8 h-8 text-gray-500" />;
  };

  const isUploading = document?.isUploading || false;
  const displayName =
    document.displayName ||
    (document.documentType ? getDocTypeName(document.documentType) : 'Unknown');
  const isRequired = document.isRequired;
  const hasFile = !!document.fileName;
  const isEmpty = !hasFile;
  const isRequiredEmpty = isRequired && !hasFile;
  const noteText = document.notes?.trim() || '';
  const hasNotes = noteText.length > 0;

  return (
    <tr
      className={clsx(
        'hover:bg-gray-50 transition-colors',
        isUploading && 'opacity-60',
        isSelected && 'bg-primary/5',
        isRequiredEmpty && 'bg-amber-50/50',
      )}
    >
      <td className="px-4 py-3 w-10">
        {!readOnly && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => onSelect(e.target.checked)}
            disabled={isUploading || isEmpty}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 cursor-pointer"
          />
        )}
      </td>
      <td className="px-4 py-3 w-[25%]">
        <div className="flex items-center gap-2">
          <span className="text-gray-700 text-sm">{displayName}</span>
          {isRequired && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0',
                hasFile ? 'bg-success/10 text-success' : 'bg-amber-100 text-amber-700',
              )}
            >
              <Icon name={hasFile ? 'check' : 'asterisk'} style="solid" className="w-2.5 h-2.5" />
              {t('documents.requiredBadge')}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 w-[37%]">
        {isEmpty ? (
          <button
            type="button"
            onClick={() => !readOnly && onUpload(document)}
            disabled={readOnly}
            className={clsx('flex items-center gap-2', !readOnly && 'cursor-pointer group')}
          >
            <div
              className={clsx(
                'w-10 h-10 rounded border-2 border-dashed flex items-center justify-center shrink-0 transition-colors',
                isRequiredEmpty
                  ? 'border-amber-300 bg-amber-50 group-hover:border-amber-400 group-hover:bg-amber-100'
                  : 'border-gray-300 bg-gray-50 group-hover:border-gray-400 group-hover:bg-gray-100',
              )}
            >
              <Icon
                name="cloud-arrow-up"
                style="solid"
                className={clsx('w-4 h-4', isRequiredEmpty ? 'text-amber-400' : 'text-gray-400')}
              />
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span
                className={clsx(
                  'text-sm font-medium',
                  isRequiredEmpty ? 'text-amber-700' : 'text-gray-500',
                )}
              >
                {isRequiredEmpty ? t('documents.awaitingUpload') : t('documents.optional')}
              </span>
              <span
                className={clsx('text-xs', isRequiredEmpty ? 'text-amber-500' : 'text-gray-400')}
              >
                {t('documents.clickToUpload')}
              </span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {isUploading ? (
              <LoadingSpinner size="sm" variant="default" />
            ) : (
              <button
                type="button"
                onClick={() => onView(document)}
                className="shrink-0 cursor-pointer"
              >
                {getFileIcon(document.fileName)}
              </button>
            )}
            <div className="flex flex-col min-w-0">
              {isUploading ? (
                <span className="text-sm font-medium text-gray-900 truncate">
                  {document.fileName}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onView(document)}
                  className="text-sm font-medium text-gray-900 truncate text-left hover:underline hover:text-primary cursor-pointer"
                >
                  {document.fileName}
                </button>
              )}
              <span className="text-xs text-gray-500">
                {isUploading ? t('documents.uploading') : formatFileSize(document.file?.size)}
              </span>
            </div>
          </div>
        )}
      </td>
      <td className="px-4 py-3 w-44 text-sm text-gray-700">
        {isEmpty ? '-' : formatDate(document.uploadedAt)}
      </td>
      <td className="px-4 py-3 w-16 text-center">
        {hasNotes ? (
          <Popover className="relative inline-block">
            <PopoverButton
              aria-label={t('documents.notesLabel')}
              title={t('documents.notesLabel')}
              className="inline-flex items-center justify-center text-amber-500 hover:text-amber-600 focus:outline-none cursor-pointer"
            >
              <Icon name="note-sticky" style="solid" className="w-4 h-4" />
            </PopoverButton>
            <PopoverPanel
              anchor="bottom end"
              className="w-64 max-w-xs bg-white rounded-lg border border-neutral-300 shadow-lg p-3 z-50"
            >
              {({ close }) => (
                <>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase">
                      {t('documents.notesLabel')}
                    </p>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          onEdit(document);
                        }}
                        aria-label={t('documentActions.editDetails')}
                        title={t('documentActions.editDetails')}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus:outline-none cursor-pointer"
                      >
                        <Icon name="pen-to-square" style="regular" className="w-3 h-3" />
                        {t('documentActions.editDetails')}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{noteText}</p>
                </>
              )}
            </PopoverPanel>
          </Popover>
        ) : (
          <span className="text-sm text-gray-300">-</span>
        )}
      </td>
      <td className="px-4 py-3 w-20 text-center">
        {isUploading ? (
          <span className="text-xs text-gray-500">{t('documents.processing')}</span>
        ) : readOnly ? (
          isEmpty ? (
            <span className="text-sm text-gray-400">-</span>
          ) : (
            <DocumentActionMenu document={document} onView={onView} />
          )
        ) : isEmpty ? (
          <span className="text-sm text-gray-400">-</span>
        ) : (
          <DocumentActionMenu
            document={document}
            onView={onView}
            onDelete={onDelete}
            onEdit={onEdit}
            onReplace={onReplace}
            onMove={onMove}
          />
        )}
      </td>
    </tr>
  );
};

interface DocumentUploaderProps {
  getOrCreateSession: () => Promise<string>;
  /** Saved request id — enables the Appointment Letter action in the summary bar. */
  requestId?: string;
}

const DocumentUploader: React.FunctionComponent<DocumentUploaderProps> = ({
  getOrCreateSession,
  requestId,
}) => {
  const { t } = useTranslation(['request', 'common']);
  const isReadOnly = useFormReadOnly();
  const currentUser = useAuthStore(state => state.user);
  const { data: documentTypes = [] } = useGetDocumentTypes();
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
    docKey: string;
    entityType: 'request' | 'title';
    entityIndex: number;
  } | null>(null);
  const [movingDocument, setMovingDocument] = useState<{
    document: UploadedDocument;
    entityType: 'request' | 'title';
    entityIndex: number;
  } | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingToDocument, setUploadingToDocument] = useState<{
    docType: string;
    entityType: 'request' | 'title';
    entityIndex: number;
  } | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
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
      const allKeys = generateDocumentSections().map(
        item => `${item.entityType}-${item.entityIndex}`,
      );
      setCollapsedSections(new Set(allKeys));
    } else {
      setCollapsedSections(new Set());
    }
  };

  // Stable per-document identity. Saved docs use id/documentId; locally-created docs may carry a
  // rowId; placeholders (one per type) fall back to documentType. Lets same-type duplicates coexist.
  const getDocKey = (doc: UploadedDocument): string =>
    doc.rowId ?? doc.id ?? doc.documentId ?? doc.documentType ?? '';

  // Helper to create unique document identifier (per section + per document)
  // Uses | as separator to avoid issues with negative entityIndex (-1)
  const getDocumentId = (entityType: 'request' | 'title', entityIndex: number, docKey: string) => {
    return `${entityType}|${entityIndex}|${docKey}`;
  };

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, []);

  // Get uploaded documents for request level
  const getRequestDocuments = (): UploadedDocument[] => {
    return watch('documents') || [];
  };

  // Get uploaded documents for a specific title
  const getTitleDocuments = (entityIndex: number): UploadedDocument[] => {
    return watch(`titles.${entityIndex}.documents`) || [];
  };

  // Generate sections with their uploaded documents
  interface DocumentSection {
    entityType: 'request' | 'title';
    entityKey: string;
    entityIndex: number;
    documents: UploadedDocument[];
  }

  const generateDocumentSections = (): DocumentSection[] => {
    const sections: DocumentSection[] = [];
    const requestNumber = watch('requestNumber');

    // Add request-level section
    sections.push({
      entityType: 'request',
      entityKey: requestNumber || 'This request',
      entityIndex: -1,
      documents: getRequestDocuments(),
    });

    // Add title-level sections
    titles.forEach((title: any, index: number) => {
      sections.push({
        entityType: 'title',
        entityKey: title?.titleNumber || `Title ${index + 1}`,
        entityIndex: index,
        documents: getTitleDocuments(index),
      });
    });

    return sections;
  };

  // Count total uploaded documents (excluding empty required placeholders)
  const getTotalUploadedCount = (): number => {
    const sections = generateDocumentSections();
    return sections.reduce(
      (total, section) => total + section.documents.filter(doc => doc.fileName).length,
      0,
    );
  };

  // Count required documents statistics
  const getRequiredDocStats = (): { total: number; completed: number } => {
    const sections = generateDocumentSections();
    let total = 0;
    let completed = 0;

    sections.forEach(section => {
      section.documents.forEach(doc => {
        if (doc.isRequired) {
          total++;
          if (doc.fileName) {
            completed++;
          }
        }
      });
    });

    return { total, completed };
  };

  // Get a specific document by entity and document type
  const getDocumentForSlot = (
    entityType: 'request' | 'title',
    entityIndex: number,
    docType: string,
  ): UploadedDocument | null => {
    if (entityType === 'request') {
      const documents = getRequestDocuments();
      return documents.find((doc: UploadedDocument) => doc.documentType === docType) || null;
    } else {
      const titleDocuments = getTitleDocuments(entityIndex);
      return titleDocuments.find((doc: UploadedDocument) => doc.documentType === docType) || null;
    }
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
    const isRequired = document.isRequired;
    const targetKey = getDocKey(document);

    // Helper to identify the specific document row
    const isTargetDoc = (doc: UploadedDocument) => getDocKey(doc) === targetKey;

    if (isRequired) {
      // For required documents: clear file but keep placeholder
      updateDocument(entityType, entityIndex, document.documentType || '', docs =>
        docs.map(doc =>
          isTargetDoc(doc)
            ? {
                ...doc,
                fileName: null,
                file: undefined,
                documentId: null,
                filePath: null,
                uploadedAt: new Date().toISOString(),
                uploadedBy: null,
                uploadedByName: null,
              }
            : doc,
        ),
      );
      toast.success(t('toasts.documentFileRemoved'));
    } else {
      // For non-required documents: remove entire record
      updateDocument(entityType, entityIndex, document.documentType || '', docs =>
        docs.filter(doc => !isTargetDoc(doc)),
      );
      toast.success(t('toasts.documentDeleted'));
    }

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
    const targetKey = getDocKey(editingDocument.document);

    updateDocument(entityType, entityIndex, updatedDocument.documentType || '', docs =>
      docs.map(doc => (getDocKey(doc) === targetKey ? updatedDocument : doc)),
    );

    setEditingDocument(null);
    toast.success(t('toasts.documentDetailsUpdated'));
  };

  const handleMove = (
    document: UploadedDocument,
    entityType: 'request' | 'title',
    entityIndex: number,
  ) => {
    setMovingDocument({ document, entityType, entityIndex });
  };

  const performMove = (target: MoveTargetSection) => {
    if (!movingDocument) return;

    const { document, entityType, entityIndex } = movingDocument;
    const movingKey = getDocKey(document);

    // Remove from the source section (required placeholders are re-added by the required-doc hooks)
    updateDocument(entityType, entityIndex, document.documentType || '', docs =>
      docs.filter(doc => getDocKey(doc) !== movingKey),
    );

    // Build the moved doc: new identity so the backend deletes the source row and inserts a new one
    // in the target collection; storage documentId (the file) is preserved.
    const movedDoc: UploadedDocument = {
      ...document,
      id: null,
      rowId: crypto.randomUUID(),
      titleId:
        target.entityType === 'title'
          ? (watch(`titles.${target.entityIndex}.id`) ?? null)
          : null,
    };

    updateDocument(target.entityType, target.entityIndex, document.documentType || '', docs => {
      // Fill an existing empty placeholder of the same type (e.g. a required slot) instead of
      // leaving it behind as a duplicate "Awaiting upload" row. Append only if no empty slot exists.
      const emptyIdx = docs.findIndex(
        d => d.documentType === movedDoc.documentType && !d.fileName && !d.isUploading,
      );
      if (emptyIdx >= 0) {
        const placeholder = docs[emptyIdx];
        const filled: UploadedDocument = {
          ...movedDoc,
          isRequired: placeholder.isRequired,
          displayName: placeholder.displayName ?? movedDoc.displayName,
        };
        return docs.map((d, i) => (i === emptyIdx ? filled : d));
      }
      return [...docs, movedDoc];
    });

    setMovingDocument(null);
    toast.success(t('toasts.documentMoved'));
  };

  const handleReplace = (
    document: UploadedDocument,
    entityType: 'request' | 'title',
    entityIndex: number,
  ) => {
    setReplacingDocument({
      docType: document.documentType || '',
      docKey: getDocKey(document),
      entityType,
      entityIndex,
    });
    replaceFileInputRef.current?.click();
  };

  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingDocument) return;

    const { docType, docKey, entityType, entityIndex } = replacingDocument;

    // Get current document to preserve metadata (match the exact row by key)
    const currentDoc =
      (entityType === 'request' ? getRequestDocuments() : getTitleDocuments(entityIndex)).find(
        d => getDocKey(d) === docKey,
      ) || null;

    // Create new document preserving metadata
    const tempDocument: UploadedDocument = {
      id: currentDoc?.id || null,
      titleId: currentDoc?.titleId || null,
      documentId: currentDoc?.documentId || null,
      documentType: docType || null,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      prefix: currentDoc?.prefix || null,
      notes: currentDoc?.notes || null,
      filePath: currentDoc?.filePath || null,
      createdWorkstation: currentDoc?.createdWorkstation || null,
      isRequired: currentDoc?.isRequired || false,
      uploadedBy: currentUser?.username || 'anonymous',
      uploadedByName: currentUser?.name || 'Anonymous',
      file,
      isUploading: true,
      displayName: currentDoc?.displayName,
      rowId: currentDoc?.rowId,
    };

    // Update document with uploading state
    updateDocument(entityType, entityIndex, docType, docs =>
      docs.map(doc => (getDocKey(doc) === docKey ? tempDocument : doc)),
    );

    // Reset replace state early
    setReplacingDocument(null);
    e.target.value = '';

    try {
      // Get or create an upload session
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
              const doc = docs.find(d => getDocKey(d) === docKey);
              if (doc) {
                doc.documentId = uploadedDoc.documentId;
                doc.filePath = null;
                doc.fileName = uploadedDoc.fileName;
                doc.isUploading = false;
              }
              return [...docs];
            });

            toast.success(t('toasts.documentReplaced'));
          },
          onError: (error: any) => {
            // Revert to an original document on error
            if (currentDoc) {
              updateDocument(entityType, entityIndex, docType, docs =>
                docs.map(doc => (getDocKey(doc) === docKey ? currentDoc : doc)),
              );
            }

            toast.error(error.apiError?.detail || t('toasts.documentReplaceFailed'));
          },
        },
      );
    } catch (error: any) {
      // Session creation failed - revert to original
      if (currentDoc) {
        updateDocument(entityType, entityIndex, docType, docs =>
          docs.map(doc => (getDocKey(doc) === docKey ? currentDoc : doc)),
        );
      }
      toast.error(error.apiError?.detail || t('toasts.sessionFailed'));
    }
  };

  const handleUploadToSlot = (
    document: UploadedDocument,
    entityType: 'request' | 'title',
    entityIndex: number,
  ) => {
    setUploadingToDocument({
      docType: document.documentType || '',
      entityType,
      entityIndex,
    });
    uploadFileInputRef.current?.click();
  };

  const handleUploadFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingToDocument) return;

    const { docType, entityType, entityIndex } = uploadingToDocument;

    // Get current document (placeholder) to preserve metadata
    const currentDoc = getDocumentForSlot(entityType, entityIndex, docType);

    // Create new document with file data
    const tempDocument: UploadedDocument = {
      id: currentDoc?.id || null,
      titleId: currentDoc?.titleId || null,
      documentId: null,
      documentType: docType || null,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      prefix: currentDoc?.prefix || null,
      notes: currentDoc?.notes || null,
      filePath: null,
      createdWorkstation: null,
      isRequired: currentDoc?.isRequired || false,
      uploadedBy: currentUser?.username || 'anonymous',
      uploadedByName: currentUser?.name || 'Anonymous',
      file,
      isUploading: true,
      displayName: currentDoc?.displayName,
    };

    // Update document with uploading state
    updateDocument(entityType, entityIndex, docType, docs =>
      docs.map(doc => (doc.documentType === docType ? tempDocument : doc)),
    );

    // Reset upload state early
    setUploadingToDocument(null);
    e.target.value = '';

    try {
      // Get or create an upload session
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
            updateDocument(entityType, entityIndex, docType, docs =>
              docs.map(doc =>
                doc.documentType === docType
                  ? {
                      ...doc,
                      documentId: uploadedDoc.documentId,
                      fileName: uploadedDoc.fileName,
                      isUploading: false,
                    }
                  : doc,
              ),
            );

            toast.success(t('toasts.documentUploaded'));
          },
          onError: (error: any) => {
            // Revert to placeholder on error
            if (currentDoc) {
              updateDocument(entityType, entityIndex, docType, docs =>
                docs.map(doc => (doc.documentType === docType ? currentDoc : doc)),
              );
            }

            toast.error(error.apiError?.detail || t('toasts.documentUploadFailed'));
          },
        },
      );
    } catch (error: any) {
      // Session creation failed - revert to placeholder
      if (currentDoc) {
        updateDocument(entityType, entityIndex, docType, docs =>
          docs.map(doc => (doc.documentType === docType ? currentDoc : doc)),
        );
      }
      toast.error(error.apiError?.detail || t('toasts.sessionFailed'));
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
        onSuccess: ({ blob }) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || t('toasts.documentDownloadFailed'));
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
    docKey: string,
    selected: boolean,
  ) => {
    const docId = getDocumentId(entityType, entityIndex, docKey);
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
      const sections = generateDocumentSections();
      const allDocIds = new Set<string>();

      sections.forEach(section => {
        section.documents.forEach(doc => {
          if (!doc.isUploading && doc.documentType && doc.fileName) {
            allDocIds.add(
              getDocumentId(section.entityType, section.entityIndex, getDocKey(doc)),
            );
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
    let clearedCount = 0;

    selectedDocuments.forEach(docId => {
      const [entityType, entityIndexStr, docKey] = docId.split('|');
      const entityIndex = parseInt(entityIndexStr);

      // Get the document to check if it's required
      const docs =
        entityType === 'request' ? getRequestDocuments() : getTitleDocuments(entityIndex);
      const targetDoc = docs.find(doc => getDocKey(doc) === docKey);

      if (targetDoc?.isRequired) {
        // For required documents: clear file but keep placeholder
        updateDocument(entityType as 'request' | 'title', entityIndex, docKey, docs =>
          docs.map(doc =>
            getDocKey(doc) === docKey
              ? {
                  ...doc,
                  fileName: null,
                  file: undefined,
                  documentId: null,
                  filePath: null,
                  uploadedAt: new Date().toISOString(),
                  uploadedBy: null,
                  uploadedByName: null,
                }
              : doc,
          ),
        );
        clearedCount++;
      } else {
        // For non-required documents: remove entire record
        updateDocument(entityType as 'request' | 'title', entityIndex, docKey, docs =>
          docs.filter(doc => getDocKey(doc) !== docKey),
        );
        deletedCount++;
      }
    });

    setSelectedDocuments(new Set());
    setBulkDeleteConfirm(false);

    // Show appropriate message
    if (clearedCount > 0 && deletedCount > 0) {
      toast.success(t('toasts.bulkDeleted', { deleted: deletedCount, cleared: clearedCount }));
    } else if (clearedCount > 0) {
      toast.success(t('toasts.bulkCleared', { n: clearedCount }));
    } else {
      toast.success(t('toasts.bulkDeletedSimple', { n: deletedCount }));
    }
  };

  const sections = generateDocumentSections();
  const totalUploadedCount = getTotalUploadedCount();
  const requiredStats = getRequiredDocStats();

  // Calculate if all selectable documents are selected (only docs with files)
  const selectableDocuments = sections.flatMap(section =>
    section.documents
      .map(doc =>
        !doc.isUploading && doc.documentType && doc.fileName
          ? getDocumentId(section.entityType, section.entityIndex, getDocKey(doc))
          : null,
      )
      .filter(Boolean),
  ) as string[];

  const allSelected =
    selectableDocuments.length > 0 &&
    selectableDocuments.every(docId => selectedDocuments.has(docId));
  const someSelected = selectedDocuments.size > 0 && !allSelected;

  return (
    <>
      {/* Document count summary */}
      <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Icon name="file-lines" style="solid" className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-gray-700">
                {t('documents.uploadedDocuments')}
              </span>
              <span className="text-sm font-semibold text-primary">{totalUploadedCount}</span>
            </div>
            {requiredStats.total > 0 && (
              <>
                <div className="h-4 w-px bg-gray-200" />
                <div className="flex items-center gap-2">
                  <Icon
                    name="asterisk"
                    style="solid"
                    className={clsx(
                      'w-3 h-3',
                      requiredStats.completed === requiredStats.total
                        ? 'text-success'
                        : 'text-amber-500',
                    )}
                  />
                  <span className="text-sm text-gray-600">{t('documents.required')}</span>
                  <span
                    className={clsx(
                      'text-sm font-semibold',
                      requiredStats.completed === requiredStats.total
                        ? 'text-success'
                        : 'text-amber-600',
                    )}
                  >
                    {requiredStats.completed}/{requiredStats.total}
                  </span>
                  {requiredStats.completed === requiredStats.total && requiredStats.total > 0 && (
                    <Icon name="check-circle" style="solid" className="w-4 h-4 text-success" />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Appointment Letter — generate / generate & attach */}
          <AppointmentLetterButton requestId={requestId} getOrCreateSession={getOrCreateSession} />
        </div>
        {totalUploadedCount === 0 && requiredStats.total === 0 && (
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <Icon name="info-circle" style="solid" className="w-3 h-3" />
            {t('documents.noDocsYet')}
          </p>
        )}
        {requiredStats.total > 0 && requiredStats.completed < requiredStats.total && (
          <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
            <Icon name="exclamation-triangle" style="solid" className="w-3 h-3" />
            {t('documents.pendingRequired', { n: requiredStats.total - requiredStats.completed })}
          </p>
        )}
      </div>

      {/* Expand/Collapse controls - only show if there are documents or required placeholders */}
      {(totalUploadedCount > 0 || requiredStats.total > 0) && (
        <div className="mb-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => toggleAllSections(false)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            <Icon name="angles-down" style="solid" className="w-3 h-3" />
            {t('documents.expandAll')}
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => toggleAllSections(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            <Icon name="angles-up" style="solid" className="w-3 h-3" />
            {t('documents.collapseAll')}
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedDocuments.size > 0 && !isReadOnly && (
        <div className="mb-4 flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Icon name="circle-check" style="solid" className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t('documents.selectedCount', { n: selectedDocuments.size })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDocuments(new Set())}
              className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded transition-colors"
            >
              {t('documents.clearSelection')}
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 rounded transition-colors flex items-center gap-2"
            >
              <Icon name="trash" style="solid" className="w-4 h-4" />
              {t('documents.deleteSelected')}
            </button>
          </div>
        </div>
      )}

      {/* Empty state when no documents and no required placeholders */}
      {totalUploadedCount === 0 && requiredStats.total === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          <Icon name="folder-open" style="regular" className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">{t('empty.noDocuments')}</h3>
          <p className="text-sm text-gray-500 text-center max-w-md">{t('empty.noDocumentsDesc')}</p>
        </div>
      ) : (
        <div className="h-96 overflow-auto rounded-lg">
          <table className="table w-full">
            <thead ref={headerRef} className="sticky top-0 z-20 bg-primary-50">
              <tr>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-left first:rounded-tl-lg w-10">
                  {!isReadOnly && (
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
                  )}
                </th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-left w-[25%]">
                  {t('documents.columnDocumentType')}
                </th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-left w-[37%]">
                  {t('documents.columnFileName')}
                </th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-left w-44">
                  {t('documents.columnUploadedAt')}
                </th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center w-16">
                  {t('documents.notesLabel')}
                </th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center last:rounded-tr-lg w-20"></th>
              </tr>
            </thead>
            {sections.map(section => {
              const sectionKey = `${section.entityType}-${section.entityIndex}`;
              const isCollapsed = collapsedSections.has(sectionKey);
              const uploadedCount = section.documents.filter(d => d.fileName).length;
              const requiredCount = section.documents.filter(d => d.isRequired).length;
              const requiredCompleted = section.documents.filter(
                d => d.isRequired && d.fileName,
              ).length;

              return (
                <tbody key={`${section.entityType}.${section.entityKey}`}>
                  <tr
                    className={clsx(
                      'sticky z-10 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors',
                    )}
                    style={{ top: `${headerHeight}px` }}
                    onClick={() => toggleSection(sectionKey)}
                  >
                    <th colSpan={6} className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon
                            name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                            style="solid"
                            className="w-4 h-4 text-gray-500 transition-transform"
                          />
                          <Icon
                            name={
                              section.entityType === 'request' ? 'folder-open' : 'file-certificate'
                            }
                            style="solid"
                            className="w-4 h-4 text-gray-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {section.entityKey}
                          </span>
                          <span className="text-xs text-gray-400">
                            {t('documents.uploaded', { n: uploadedCount })}
                          </span>
                          {requiredCount > 0 && (
                            <span
                              className={clsx(
                                'text-xs px-1.5 py-0.5 rounded',
                                requiredCompleted === requiredCount
                                  ? 'bg-success/10 text-success'
                                  : 'bg-amber-100 text-amber-700',
                              )}
                            >
                              {t('documents.requiredProgress', {
                                done: requiredCompleted,
                                total: requiredCount,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  </tr>
                  {!isCollapsed &&
                    (section.documents.length > 0 ? (
                      section.documents.map(doc => {
                        const docKey = getDocKey(doc);
                        const docId = getDocumentId(
                          section.entityType,
                          section.entityIndex,
                          docKey,
                        );
                        const isSelected = selectedDocuments.has(docId);

                        return (
                          <UploadedDocumentRow
                            key={`${section.entityType}.${section.entityIndex}.${docKey}`}
                            document={doc}
                            entityType={section.entityType}
                            entityIndex={section.entityIndex}
                            isSelected={isSelected}
                            onSelect={selected =>
                              handleSelectDocument(
                                section.entityType,
                                section.entityIndex,
                                docKey,
                                selected,
                              )
                            }
                            onDelete={d => handleDelete(d, section.entityType, section.entityIndex)}
                            onEdit={d => handleEdit(d, section.entityType, section.entityIndex)}
                            onReplace={d =>
                              handleReplace(d, section.entityType, section.entityIndex)
                            }
                            onMove={d => handleMove(d, section.entityType, section.entityIndex)}
                            onView={handleView}
                            onUpload={d =>
                              handleUploadToSlot(d, section.entityType, section.entityIndex)
                            }
                            readOnly={isReadOnly}
                            getDocTypeName={code => getDocumentTypeName(documentTypes, code)}
                          />
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center">
                          <span className="text-sm text-gray-400">
                            {t('empty.noDocumentsSection')}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              );
            })}
          </table>
        </div>
      )}

      {/* Hidden file input for replace functionality */}
      {!isReadOnly && (
        <input
          ref={replaceFileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleReplaceFileSelected}
        />
      )}

      {/* Hidden file input for upload to slot functionality */}
      {!isReadOnly && (
        <input
          ref={uploadFileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleUploadFileSelected}
        />
      )}

      {/* Edit modal */}
      {editingDocument && (
        <DocumentEditModal
          isOpen={true}
          onClose={() => setEditingDocument(null)}
          document={editingDocument.document}
          onSave={handleSaveEdit}
        />
      )}

      {/* Move document modal */}
      {movingDocument && (
        <MoveDocumentModal
          isOpen={true}
          onClose={() => setMovingDocument(null)}
          targets={generateDocumentSections()
            .filter(
              s =>
                !(
                  s.entityType === movingDocument.entityType &&
                  s.entityIndex === movingDocument.entityIndex
                ),
            )
            .map(s => ({
              entityType: s.entityType,
              entityIndex: s.entityIndex,
              label: s.entityType === 'request' ? t('moveDocument.requestLevelLabel') : s.entityKey,
            }))}
          onConfirm={performMove}
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
        title={t('confirm.deleteDocumentTitle')}
        message={t('confirm.deleteDocumentMessage')}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
      />

      {/* Bulk delete confirmation dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title={t('confirm.bulkDeleteTitle')}
        message={t('confirm.bulkDeleteMessage', { n: selectedDocuments.size })}
        confirmText={t('confirm.bulkDeleteConfirm')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
      />
    </>
  );
};

export default DocumentUploader;
