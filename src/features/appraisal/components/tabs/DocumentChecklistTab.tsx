import { useState, useRef, useCallback } from 'react';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';
import PhotoSourceModal from '../PhotoSourceModal';
import GallerySelectionModal from '../GallerySelectionModal';
import type { GalleryImage } from '../../types/gallery';
import {
  APPENDIX_DOCUMENT_TYPES,
  APPENDIX_DOCUMENT_TYPE_LABELS,
  type AppendixDocumentType,
  type AppendixDocument,
  type RequestDocument,
  type RequestDocumentGroup,
} from '../../types/documentChecklist';

// Mock data for development
const MOCK_REQUEST_GROUPS: RequestDocumentGroup[] = [
  {
    entityType: 'title_chonot',
    entityKey: 'xxxx',
    displayKey: 'ฉ.xxxx',
    documents: [
      {
        id: 'doc-1',
        requestId: 'req-1',
        entityType: 'title_chonot',
        entityKey: 'xxxx',
        documentType: 'Title Deed',
        fileName: 'Title deed document.pdf',
        filePath: '/uploads/title-deed.pdf',
        fileSize: 1572864,
        mimeType: 'application/pdf',
        prefix: 'Title',
        set: 1,
        comment: 'Bacon ipsum dolor amet...',
        uploadedAt: '2024-01-06T10:00:00Z',
        uploadedBy: 'user-001',
        uploadedByName: 'John Doe',
      },
    ],
  },
  {
    entityType: 'title_regis',
    entityKey: 'xxxx',
    displayKey: 'Regis no xxxx',
    documents: [
      {
        id: 'doc-2',
        requestId: 'req-1',
        entityType: 'title_regis',
        entityKey: 'xxxx',
        documentType: 'Registration document',
        fileName: null,
        filePath: null,
        fileSize: null,
        mimeType: null,
        prefix: null,
        set: 1,
        comment: null,
        uploadedAt: null,
        uploadedBy: null,
        uploadedByName: null,
      },
      {
        id: 'doc-3',
        requestId: 'req-1',
        entityType: 'title_regis',
        entityKey: 'xxxx',
        documentType: 'Invoice',
        fileName: null,
        filePath: null,
        fileSize: null,
        mimeType: null,
        prefix: null,
        set: 1,
        comment: null,
        uploadedAt: null,
        uploadedBy: null,
        uploadedByName: null,
      },
    ],
  },
  {
    entityType: 'request',
    entityKey: 'xxxxxxx',
    displayKey: '67xxxxxxx',
    documents: [
      {
        id: 'doc-4',
        requestId: 'req-1',
        entityType: 'request',
        entityKey: 'xxxxxxx',
        documentType: 'Building plan',
        fileName: 'Building plan.png',
        filePath: '/uploads/building-plan.png',
        fileSize: 4194304,
        mimeType: 'image/png',
        prefix: null,
        set: 1,
        comment: 'Bacon ipsum dolor amet...',
        uploadedAt: '2024-01-06T10:00:00Z',
        uploadedBy: 'user-001',
        uploadedByName: 'John Doe',
      },
    ],
  },
];

interface AppendixSectionState {
  documentType: AppendixDocumentType;
  label: string;
  layout: 1 | 2 | 3;
  documents: AppendixDocument[];
  isExpanded: boolean;
}

// Helper functions
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string | null, fileName: string | null): { name: string; color: string } => {
  if (!mimeType && !fileName) return { name: 'file', color: 'text-gray-400' };

  const type = mimeType?.toLowerCase() || '';
  const name = fileName?.toLowerCase() || '';

  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return { name: 'file-pdf', color: 'text-red-500' };
  }
  if (type.includes('image') || name.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return { name: 'file-image', color: 'text-blue-500' };
  }
  if (type.includes('word') || name.match(/\.(doc|docx)$/)) {
    return { name: 'file-word', color: 'text-blue-600' };
  }
  if (type.includes('excel') || type.includes('spreadsheet') || name.match(/\.(xls|xlsx)$/)) {
    return { name: 'file-excel', color: 'text-green-600' };
  }
  return { name: 'file', color: 'text-gray-500' };
};

// Status Badge Component
const StatusBadge = ({ hasFile }: { hasFile: boolean }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      hasFile ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
    )}
  >
    <span className={clsx('w-1.5 h-1.5 rounded-full', hasFile ? 'bg-green-500' : 'bg-amber-500')} />
    {hasFile ? 'Uploaded' : 'Pending'}
  </span>
);

// Progress Bar Component
const ProgressBar = ({ uploaded, total }: { uploaded: number; total: number }) => {
  const percentage = total > 0 ? (uploaded / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300',
            percentage === 100 ? 'bg-green-500' : 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {uploaded}/{total}
      </span>
    </div>
  );
};

// Action Dropdown Component
const ActionDropdown = ({
  onView,
  onEdit,
  onDelete,
  isEditable = false,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isEditable?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <Icon name="ellipsis-vertical" className="text-sm" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[140px]">
            {onView && (
              <button
                type="button"
                onClick={() => {
                  onView();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon name="eye" className="text-gray-400" />
                View
              </button>
            )}
            {isEditable && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon name="pen-to-square" className="text-gray-400" />
                Edit
              </button>
            )}
            {isEditable && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Icon name="trash" className="text-red-400" />
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Empty State Component
const EmptyUploadState = ({ onUpload, isDragging }: { onUpload: () => void; isDragging?: boolean }) => (
  <div
    onClick={onUpload}
    className={clsx(
      'flex flex-col items-center justify-center py-8 cursor-pointer transition-all duration-200 rounded-xl',
      isDragging
        ? 'bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10'
        : 'hover:bg-gray-50'
    )}
  >
    <div
      className={clsx(
        'w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-200',
        isDragging
          ? 'bg-primary/10 text-primary animate-bounce'
          : 'bg-gray-100 text-gray-400'
      )}
    >
      <Icon name="cloud-arrow-up" className="text-2xl" />
    </div>
    <p
      className={clsx(
        'text-sm font-medium mb-1 transition-colors',
        isDragging ? 'text-primary' : 'text-gray-600'
      )}
    >
      {isDragging ? 'Drop files here' : 'Click to upload'}
    </p>
    <p className="text-xs text-gray-400">or drag and drop files</p>
  </div>
);

export const DocumentChecklistTab = () => {
  const [requestGroups] = useState<RequestDocumentGroup[]>(MOCK_REQUEST_GROUPS);
  const [appendixSections, setAppendixSections] = useState<AppendixSectionState[]>(
    APPENDIX_DOCUMENT_TYPES.map(type => ({
      documentType: type,
      label: APPENDIX_DOCUMENT_TYPE_LABELS[type],
      layout: 1,
      documents: [],
      isExpanded: false,
    }))
  );
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [activeDocumentType, setActiveDocumentType] = useState<AppendixDocumentType | null>(null);
  const [dragOverSection, setDragOverSection] = useState<AppendixDocumentType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock gallery images
  const galleryImages: GalleryImage[] = [];

  // Calculate stats
  const totalRequestDocs = requestGroups.reduce((sum, g) => sum + g.documents.length, 0);
  const uploadedRequestDocs = requestGroups.reduce(
    (sum, g) => sum + g.documents.filter(d => d.fileName).length,
    0
  );
  const totalAppendixDocs = appendixSections.reduce((sum, s) => sum + s.documents.length, 0);

  const handleToggleSection = (documentType: AppendixDocumentType) => {
    setAppendixSections(prev =>
      prev.map(section =>
        section.documentType === documentType
          ? { ...section, isExpanded: !section.isExpanded }
          : section
      )
    );
  };

  const handleExpandAll = () => {
    setAppendixSections(prev => prev.map(section => ({ ...section, isExpanded: true })));
  };

  const handleCollapseAll = () => {
    setAppendixSections(prev => prev.map(section => ({ ...section, isExpanded: false })));
  };

  const handleLayoutChange = (documentType: AppendixDocumentType, layout: 1 | 2 | 3) => {
    setAppendixSections(prev =>
      prev.map(section =>
        section.documentType === documentType ? { ...section, layout } : section
      )
    );
  };

  const handleAddFiles = (documentType: AppendixDocumentType) => {
    setActiveDocumentType(documentType);
    setShowPhotoSourceModal(true);
  };

  const processFiles = useCallback(
    (files: FileList, documentType: AppendixDocumentType) => {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          const newDoc: AppendixDocument = {
            id: `appendix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            appraisalId: 'current-appraisal',
            documentType: documentType,
            fileName: file.name,
            originalFileName: file.name,
            filePath: reader.result as string,
            fileSize: file.size,
            mimeType: file.type,
            prefix: null,
            set: 1,
            comment: null,
            layout: 1,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'current-user',
            uploadedByName: 'Current User',
          };

          setAppendixSections(prev =>
            prev.map(section =>
              section.documentType === documentType
                ? { ...section, documents: [...section.documents, newDoc], isExpanded: true }
                : section
            )
          );
        };
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const handleUploadFromDevice = (files: FileList) => {
    if (!activeDocumentType) return;
    processFiles(files, activeDocumentType);
    setActiveDocumentType(null);
  };

  const handleChooseFromGallery = () => {
    setShowGalleryModal(true);
  };

  const handleGallerySelect = (selectedImages: GalleryImage[]) => {
    console.log('Selected from gallery:', selectedImages);
  };

  const handleDeleteDocument = (documentType: AppendixDocumentType, documentId: string) => {
    setAppendixSections(prev =>
      prev.map(section =>
        section.documentType === documentType
          ? { ...section, documents: section.documents.filter(d => d.id !== documentId) }
          : section
      )
    );
  };

  const handleViewDocument = (doc: RequestDocument | AppendixDocument) => {
    console.log('View document:', doc);
  };

  const handlePreviewLayout = (documentType: AppendixDocumentType) => {
    console.log('Preview layout for:', documentType);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent, documentType: AppendixDocumentType) => {
    e.preventDefault();
    setDragOverSection(documentType);
  };

  const handleDragLeave = () => {
    setDragOverSection(null);
  };

  const handleDrop = (e: React.DragEvent, documentType: AppendixDocumentType) => {
    e.preventDefault();
    setDragOverSection(null);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files, documentType);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Page Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Document Checklist</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {uploadedRequestDocs + totalAppendixDocs} documents uploaded
        </p>
      </div>

      {/* Request Documents Section */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="file-lines" className="text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900">Request Documents</h3>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                Read-only
              </span>
            </div>
            <ProgressBar uploaded={uploadedRequestDocs} total={totalRequestDocs} />
          </div>
        </div>

        {/* Document Groups */}
        <div className="divide-y divide-gray-100">
          {requestGroups.map(group => {
            const uploadedCount = group.documents.filter(d => d.fileName).length;
            return (
              <div key={`${group.entityType}-${group.entityKey}`}>
                {/* Group Header */}
                <div className="px-6 py-3 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{group.displayKey}</span>
                    <span className="text-xs text-gray-400">
                      ({uploadedCount}/{group.documents.length} uploaded)
                    </span>
                  </div>
                </div>

                {/* Group Documents */}
                {group.documents.map(doc => {
                  const fileIcon = getFileIcon(doc.mimeType, doc.fileName);
                  return (
                    <div
                      key={doc.id}
                      className="px-6 py-4 hover:bg-gray-50/50 transition-colors grid grid-cols-[200px_1fr_100px_80px] gap-4 items-center"
                    >
                      {/* Document Type & Status */}
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-900">{doc.documentType}</span>
                        <StatusBadge hasFile={!!doc.fileName} />
                      </div>

                      {/* File Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {doc.fileName ? (
                          <>
                            <div className={clsx('flex-shrink-0', fileIcon.color)}>
                              <Icon name={fileIcon.name} className="text-lg" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-gray-900 truncate">{doc.fileName}</p>
                              <p className="text-xs text-gray-400">
                                {formatFileSize(doc.fileSize)} &bull; {formatDate(doc.uploadedAt)}
                              </p>
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400 italic">No file uploaded</span>
                        )}
                      </div>

                      {/* Comment */}
                      <div className="text-sm text-gray-500 truncate" title={doc.comment || undefined}>
                        {doc.comment || '-'}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end">
                        {doc.fileName && (
                          <ActionDropdown onView={() => handleViewDocument(doc)} isEditable={false} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      {/* Appendix Documents Section */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="folder-plus" className="text-primary" />
              <h3 className="text-base font-semibold text-gray-900">Appendix Documents</h3>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {totalAppendixDocs} files
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors"
              >
                Collapse All
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setActiveDocumentType(APPENDIX_DOCUMENT_TYPES[0]);
                  setShowPhotoSourceModal(true);
                }}
                className="ml-2"
              >
                <Icon name="plus" className="mr-1.5" />
                Add Files
              </Button>
            </div>
          </div>
        </div>

        {/* Appendix Sections */}
        <div className="divide-y divide-gray-100">
          {appendixSections.map(section => {
            const isDragOver = dragOverSection === section.documentType;
            return (
              <div
                key={section.documentType}
                onDragOver={e => handleDragOver(e, section.documentType)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, section.documentType)}
                className={clsx('transition-colors', isDragOver && 'bg-primary/5')}
              >
                {/* Section Header */}
                <div
                  className={clsx(
                    'px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors',
                    section.isExpanded && 'bg-gray-50/50'
                  )}
                  onClick={() => handleToggleSection(section.documentType)}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      name={section.isExpanded ? 'chevron-down' : 'chevron-right'}
                      className="text-gray-400 text-sm transition-transform"
                    />
                    <span className="text-sm font-medium text-gray-900">{section.label}</span>
                    {section.documents.length > 0 && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                        {section.documents.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    {/* Layout Selector */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                      <span className="text-xs text-gray-500">Layout:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleLayoutChange(section.documentType, num as 1 | 2 | 3)}
                            className={clsx(
                              'w-6 h-6 rounded text-xs font-medium transition-colors',
                              section.layout === num
                                ? 'bg-primary text-white'
                                : 'text-gray-500 hover:bg-gray-100'
                            )}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewLayout(section.documentType)}
                      className="text-xs"
                    >
                      <Icon name="eye" className="mr-1" />
                      Preview
                    </Button>

                    {/* Add Button */}
                    <button
                      type="button"
                      onClick={() => handleAddFiles(section.documentType)}
                      className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Icon name="circle-plus" style="solid" />
                    </button>
                  </div>
                </div>

                {/* Section Content */}
                {section.isExpanded && (
                  <div className="border-t border-gray-100">
                    {section.documents.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                        {section.documents.map(doc => {
                          const fileIcon = getFileIcon(doc.mimeType, doc.fileName);
                          return (
                            <div
                              key={doc.id}
                              className="px-6 py-3 hover:bg-gray-50/50 transition-colors grid grid-cols-[1fr_120px_80px_60px_1fr_48px] gap-4 items-center ml-6"
                            >
                              {/* File Info */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={clsx(
                                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                                    doc.mimeType?.includes('image')
                                      ? 'bg-blue-50'
                                      : doc.mimeType?.includes('pdf')
                                        ? 'bg-red-50'
                                        : 'bg-gray-50'
                                  )}
                                >
                                  {doc.mimeType?.includes('image') && doc.filePath ? (
                                    <img
                                      src={doc.filePath}
                                      alt={doc.fileName}
                                      className="w-10 h-10 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <Icon name={fileIcon.name} className={clsx('text-lg', fileIcon.color)} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-900 truncate">{doc.fileName}</p>
                                  <p className="text-xs text-gray-400">{formatFileSize(doc.fileSize)}</p>
                                </div>
                              </div>

                              {/* Upload Date */}
                              <div className="text-sm text-gray-500">{formatDate(doc.uploadedAt)}</div>

                              {/* Prefix */}
                              <div className="text-sm text-gray-500 text-center">{doc.prefix || '-'}</div>

                              {/* Set */}
                              <div className="text-sm text-gray-500 text-center">{doc.set}</div>

                              {/* Comment */}
                              <div className="text-sm text-gray-500 truncate">{doc.comment || '-'}</div>

                              {/* Actions */}
                              <div className="flex justify-end">
                                <ActionDropdown
                                  onView={() => handleViewDocument(doc)}
                                  onEdit={() => console.log('Edit:', doc.id)}
                                  onDelete={() => handleDeleteDocument(section.documentType, doc.id)}
                                  isEditable
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyUploadState
                        onUpload={() => handleAddFiles(section.documentType)}
                        isDragging={isDragOver}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
        multiple
        onChange={e => e.target.files && handleUploadFromDevice(e.target.files)}
        className="hidden"
      />

      {/* Photo Source Modal */}
      <PhotoSourceModal
        isOpen={showPhotoSourceModal}
        onClose={() => {
          setShowPhotoSourceModal(false);
          setActiveDocumentType(null);
        }}
        onUploadFromDevice={handleUploadFromDevice}
        onChooseFromGallery={handleChooseFromGallery}
        title={activeDocumentType ? `Add ${APPENDIX_DOCUMENT_TYPE_LABELS[activeDocumentType]}` : 'Add Files'}
      />

      {/* Gallery Selection Modal */}
      <GallerySelectionModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        onSelect={handleGallerySelect}
        images={galleryImages}
        multiSelect
      />
    </div>
  );
};

export default DocumentChecklistTab;
