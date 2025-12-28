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

const DocumentRow: React.FunctionComponent<DocumentRowProps> = ({
  document,
  documentType,
  documentTypeCode,
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
        <td className="px-4 py-3 text-gray-700">{documentType}</td>
        <td className="px-4 py-3 text-gray-400" colSpan={4}>
          <span className="text-gray-400 text-sm">No file uploaded</span>
        </td>
        <td className="px-4 py-3 text-center">
          <FileInput onChange={handleFileChange} fullWidth={false}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors cursor-pointer">
              <Icon name="upload" style="solid" className="w-3.5 h-3.5" />
              Upload
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
      <td className="px-4 py-3 text-gray-700">{documentType}</td>
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
      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(document.uploadDate)}</td>
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

  const { mutate: uploadDocument } = useUploadDocument();
  const { mutate: downloadDocument } = useDownloadDocument();

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
      const requestDocuments = watch('requestDocuments') || [];
      return requestDocuments.find((doc: UploadedDocument) => doc.docType === docType) || null;
    } else {
      const titleDocuments = watch(`titles.${entityIndex}.titleDocuments`) || [];
      return titleDocuments.find((doc: UploadedDocument) => doc.docType === docType) || null;
    }
  };

  const updateDocument = (
    entityType: 'request' | 'title',
    entityIndex: number,
    _docType: string,
    updater: (docs: UploadedDocument[]) => UploadedDocument[],
  ) => {
    if (entityType === 'request') {
      const requestDocuments = watch('requestDocuments') || [];
      setValue('requestDocuments', updater(requestDocuments), { shouldDirty: true });
    } else {
      const titleDocuments = watch(`titles.${entityIndex}.titleDocuments`) || [];
      setValue(`titles.${entityIndex}.titleDocuments`, updater(titleDocuments), {
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
    const tempDocument: UploadedDocument = {
      docType,
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      prefix: null,
      set: 1,
      comment: null,
      filePath: null,
      file,
      isUploading: true,
    };

    // Add/update document in form state with uploading flag
    updateDocument(entityType, entityIndex, docType, docs => {
      const existingIndex = docs.findIndex(doc => doc.docType === docType);
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
              const doc = docs.find(d => d.docType === docType);
              if (doc) {
                doc.documentId = uploadedDoc.documentId;
                doc.filePath = null; // Will be fetched from server when needed
                doc.isUploading = false;
              }
              return [...docs];
            });

            toast.success(`Document uploaded successfully`);
          },
          onError: () => {
            // Remove document on error
            updateDocument(entityType, entityIndex, docType, docs =>
              docs.filter(d => d.docType !== docType),
            );

            toast.error('Upload failed. Please try again.');
          },
        },
      );
    } catch (error) {
      // Session creation failed
      updateDocument(entityType, entityIndex, docType, docs =>
        docs.filter(d => d.docType !== docType),
      );
      toast.error('Failed to create upload session. Please try again.');
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
    const docTypeInfo = getDocumentTypeInfo(document.docType || '');
    const isRequired = docTypeInfo?.isRequired || false;

    // Remove the document to show empty placeholder
    updateDocument(entityType, entityIndex, document.docType || '', docs =>
      docs.filter(doc => doc.docType !== document.docType),
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

    updateDocument(entityType, entityIndex, updatedDocument.docType || '', docs =>
      docs.map(doc => (doc.docType === updatedDocument.docType ? updatedDocument : doc)),
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
      docType: document.docType || '',
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
    const tempDocument: UploadedDocument = {
      documentId: currentDoc?.documentId,
      docType,
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      prefix: currentDoc?.prefix || null,
      set: currentDoc?.set || 1,
      comment: currentDoc?.comment || null,
      filePath: currentDoc?.filePath || null,
      file,
      isUploading: true,
    };

    // Update document with uploading state
    updateDocument(entityType, entityIndex, docType, docs =>
      docs.map(doc => (doc.docType === docType ? tempDocument : doc)),
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
              const doc = docs.find(d => d.docType === docType);
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
          onError: () => {
            // Revert to original document on error
            if (currentDoc) {
              updateDocument(entityType, entityIndex, docType, docs =>
                docs.map(doc => (doc.docType === docType ? currentDoc : doc)),
              );
            }

            toast.error('Replace failed. Please try again.');
          },
        },
      );
    } catch (error) {
      // Session creation failed - revert to original
      if (currentDoc) {
        updateDocument(entityType, entityIndex, docType, docs =>
          docs.map(doc => (doc.docType === docType ? currentDoc : doc)),
        );
      }
      toast.error('Failed to create upload session. Please try again.');
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
        onError: () => {
          toast.error('Failed to download document');
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
        docs.filter(doc => doc.docType !== docType),
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

  return (
    <>
      {/* Bulk action bar */}
      {selectedDocuments.size > 0 && (
        <div className="mb-4 flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Icon name="check-circle" style="solid" className="w-5 h-5 text-primary" />
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
          {checklist.map(item => (
            <tbody key={`${item.entityType}.${item.entityKey}`}>
              <tr className={clsx('sticky z-10 bg-gray-100')} style={{ top: `${headerHeight}px` }}>
                <th colSpan={7} className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  {item.entityKey}
                </th>
              </tr>
              {item.requiredDocuments.map((docInfo, docIndex) => {
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
          ))}
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
