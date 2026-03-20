import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import PhotoSourceModal from '../PhotoSourceModal';
import GallerySelectionModal from '../GallerySelectionModal';
import type { GalleryImage } from '../../types/gallery';
import { toGalleryImage } from '../../types/gallery';
import { useAppraisalContext } from '../../context/AppraisalContext';
import {
  useAddAppendixDocument,
  useAddGalleryPhoto,
  useGetAppendices,
  useGetRequestDocuments,
  useRemoveAppendixDocument,
  useUpdateAppendixLayout,
} from '@features/appraisal/api';
import {
  createUploadSession,
  useDownloadDocument,
  useUploadDocument,
} from '@features/request/api/documents';
import { useGetGalleryPhotos } from '../../api/gallery';
import type {
  AppendixDocumentDto,
  AppraisalAppendixDto,
  DocumentItemDto,
} from '../../types/documentChecklist';
import type { AnnotationResult } from '@shared/components/ImageAnnotationEditor';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

const ImageAnnotationEditor = lazy(
  () => import('@shared/components/ImageAnnotationEditor/ImageAnnotationEditor'),
);

const isImageFile = (file: File) => /\.(jpg|jpeg|png)$/i.test(file.name);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper functions
const getFileIcon = (fileName: string | null): { name: string; color: string } => {
  if (!fileName) return { name: 'file', color: 'text-gray-400' };

  const name = fileName.toLowerCase();

  if (name.endsWith('.pdf')) {
    return { name: 'file-pdf', color: 'text-red-500' };
  }
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return { name: 'file-image', color: 'text-blue-500' };
  }
  if (name.match(/\.(doc|docx)$/)) {
    return { name: 'file-word', color: 'text-blue-600' };
  }
  if (name.match(/\.(xls|xlsx)$/)) {
    return { name: 'file-excel', color: 'text-green-600' };
  }
  return { name: 'file', color: 'text-gray-500' };
};

const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes == null || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Status Badge Component
const StatusBadge = ({ hasFile }: { hasFile: boolean }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      hasFile ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700',
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
            percentage === 100 ? 'bg-green-500' : 'bg-primary',
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
const EmptyUploadState = ({
  onUpload,
  isDragging,
}: {
  onUpload: () => void;
  isDragging?: boolean;
}) => (
  <div
    onClick={onUpload}
    className={clsx(
      'flex flex-col items-center justify-center py-8 cursor-pointer transition-all duration-200 rounded-xl',
      isDragging ? 'bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10' : 'hover:bg-gray-50',
    )}
  >
    <div
      className={clsx(
        'w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-200',
        isDragging ? 'bg-primary/10 text-primary animate-bounce' : 'bg-gray-100 text-gray-400',
      )}
    >
      <Icon name="cloud-arrow-up" className="text-2xl" />
    </div>
    <p
      className={clsx(
        'text-sm font-medium mb-1 transition-colors',
        isDragging ? 'text-primary' : 'text-gray-600',
      )}
    >
      {isDragging ? 'Drop files here' : 'Click to upload'}
    </p>
    <p className="text-xs text-gray-400">or drag and drop files</p>
  </div>
);

export const DocumentChecklistTab = () => {
  const readOnly = usePageReadOnly();
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId;
  const requestId = appraisal?.requestId;

  // Queries
  const { data: requestDocsData, isLoading: isLoadingRequestDocs } =
    useGetRequestDocuments(requestId);
  const { data: appendicesData, isLoading: isLoadingAppendices } = useGetAppendices(appraisalId);
  const { data: galleryData } = useGetGalleryPhotos(appraisalId);

  // Mutations
  const addAppendixDocument = useAddAppendixDocument();
  const removeAppendixDocument = useRemoveAppendixDocument();
  const updateAppendixLayout = useUpdateAppendixLayout();
  const { mutateAsync: uploadDocument } = useUploadDocument();
  const { mutateAsync: addGalleryPhoto } = useAddGalleryPhoto();
  const { mutateAsync: downloadDocument } = useDownloadDocument();

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ appendixId: string; documentId: string } | null>(null);

  // Annotation editor state — use refs alongside state to avoid stale closures in async callbacks
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
  const [pendingEditFiles, _setPendingEditFiles] = useState<File[]>([]);
  const pendingEditFilesRef = useRef<File[]>([]);
  const setPendingEditFiles = (files: File[]) => {
    pendingEditFilesRef.current = files;
    _setPendingEditFiles(files);
  };
  const [editingFileIndex, _setEditingFileIndex] = useState(0);
  const editingFileIndexRef = useRef(0);
  const setEditingFileIndex = (idx: number) => {
    editingFileIndexRef.current = idx;
    _setEditingFileIndex(idx);
  };
  const [editingDocument, _setEditingDocument] = useState<AppendixDocumentDto | null>(null);
  const editingDocumentRef = useRef<AppendixDocumentDto | null>(null);
  const setEditingDocument = (doc: AppendixDocumentDto | null) => {
    editingDocumentRef.current = doc;
    _setEditingDocument(doc);
  };
  const [_editingAppendixId, _setEditingAppendixId] = useState<string | null>(null);
  const editingAppendixIdRef = useRef<string | null>(null);
  const setEditingAppendixId = (id: string | null) => {
    editingAppendixIdRef.current = id;
    _setEditingAppendixId(id);
  };
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState<string | null>(null);

  // Local UI state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeAppendixId, _setActiveAppendixId] = useState<string | null>(null);
  const activeAppendixIdRef = useRef<string | null>(null);
  const setActiveAppendixId = (id: string | null) => {
    activeAppendixIdRef.current = id;
    _setActiveAppendixId(id);
  };
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload session ref (created once per component lifetime)
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  // Derived data
  const appendices = useMemo(() => appendicesData?.items ?? [], [appendicesData]);
  const totalRequestDocs = requestDocsData?.totalDocuments ?? 0;
  const uploadedRequestDocs = requestDocsData?.totalUploaded ?? 0;
  const totalAppendixDocs = appendices.reduce((sum, a) => sum + a.documents.length, 0);

  const galleryImages: GalleryImage[] = useMemo(
    () => (galleryData?.photos ?? []).map(toGalleryImage),
    [galleryData],
  );

  const activeAppendix = appendices.find(a => a.id === activeAppendixId);

  // Section expand/collapse
  const handleToggleSection = (appendixId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(appendixId)) {
        next.delete(appendixId);
      } else {
        next.add(appendixId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedSections(new Set(appendices.map(a => a.id)));
  };

  const handleCollapseAll = () => {
    setExpandedSections(new Set());
  };

  // Layout change
  const handleLayoutChange = (appendix: AppraisalAppendixDto, layoutColumns: number) => {
    if (!appraisalId) return;
    updateAppendixLayout.mutate(
      { appraisalId, appendixId: appendix.id, layoutColumns },
      {
        onError: () => toast.error('Failed to update layout'),
      },
    );
  };

  // Get or create upload session (cached per component lifetime)
  const getOrCreateSession = useCallback(async (): Promise<string> => {
    if (uploadSessionIdRef.current) {
      return uploadSessionIdRef.current;
    }

    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    sessionPromiseRef.current = createUploadSession()
      .then(response => {
        uploadSessionIdRef.current = response.sessionId;
        return response.sessionId;
      })
      .catch(error => {
        sessionPromiseRef.current = null;
        throw error;
      });

    return sessionPromiseRef.current;
  }, []);

  // Upload a single file through the 3-step flow
  const uploadSingleFile = useCallback(
    async (file: File, appendixId: string, displaySequence?: number) => {
      if (!appraisalId) return;

      const sessionId = await getOrCreateSession();

      const uploadResult = await uploadDocument({
        uploadSessionId: sessionId,
        file,
        documentType: 'APPENDIX',
        documentCategory: 'appendix',
      });

      const galleryPhoto = await addGalleryPhoto({
        appraisalId,
        documentId: uploadResult.documentId,
        photoType: 'general',
        uploadedBy: 'current-user',
        photoCategory: null,
        caption: null,
        latitude: null,
        longitude: null,
        capturedAt: null,
        photoTopicIds: null,
        fileName: file.name,
        filePath: null,
        fileExtension: file.name.split('.').pop() ?? null,
        mimeType: file.type || null,
        fileSizeBytes: file.size,
        uploadedByName: null,
      });

      const appendix = appendices.find(a => a.id === appendixId);
      const nextSequence = displaySequence ?? (appendix?.documents.length ?? 0) + 1;

      await addAppendixDocument.mutateAsync({
        appraisalId,
        appendixId,
        body: {
          galleryPhotoId: galleryPhoto.id,
          displaySequence: nextSequence,
        },
      });
    },
    [
      appraisalId,
      appendices,
      getOrCreateSession,
      uploadDocument,
      addGalleryPhoto,
      addAppendixDocument,
    ],
  );

  // Upload File[] (non-FileList variant)
  // Annotation editor handlers
  const handleAnnotationSave = useCallback(
    async (result: AnnotationResult) => {
      // Read from refs to avoid stale closures
      const curEditingDoc = editingDocumentRef.current;

      // Preserve original filename/extension when editing an existing document
      const fileName = curEditingDoc?.fileName ?? result.fileName;
      const mimeType = curEditingDoc?.mimeType ?? 'image/png';
      const file = new File([result.imageBlob], fileName, { type: mimeType });
      const curAppendixId = editingAppendixIdRef.current;
      const curFileIndex = editingFileIndexRef.current;
      const curPendingFiles = pendingEditFilesRef.current;

      try {
        if (curEditingDoc && curAppendixId) {
          // Edit-after-upload: upload new annotated image, then remove old one
          await uploadSingleFile(file, curAppendixId, curEditingDoc.displaySequence);
          if (appraisalId) {
            await removeAppendixDocument.mutateAsync({
              appraisalId,
              appendixId: curAppendixId,
              documentId: curEditingDoc.id,
            });
          }
          setEditingDocument(null);
          setEditingAppendixId(null);
          toast.success('Document updated');
        } else {
          // Edit-before-upload: upload annotated image
          if (curAppendixId) {
            await uploadSingleFile(file, curAppendixId);
          }

          // Advance to next pending file
          const nextIndex = curFileIndex + 1;
          if (nextIndex < curPendingFiles.length) {
            setEditingFileIndex(nextIndex);
            return; // Keep editor open
          }

          // All done
          setPendingEditFiles([]);
          setEditingFileIndex(0);
          setActiveAppendixId(null);
          toast.success('Files uploaded successfully');
        }
      } catch (error) {
        console.error('Annotation save failed:', error);
        toast.error('Failed to save annotated image');
      }
    },
    [appraisalId, uploadSingleFile, removeAppendixDocument],
  );

  const handleAnnotationSkip = useCallback(() => {
    // Read from refs to avoid stale closures
    const curPendingFiles = pendingEditFilesRef.current;
    const curFileIndex = editingFileIndexRef.current;
    const curAppendixId = editingAppendixIdRef.current;

    // Upload the current file without annotation
    const currentFile = curPendingFiles[curFileIndex];

    if (currentFile && curAppendixId) {
      void uploadSingleFile(currentFile, curAppendixId).catch(() => {
        toast.error('Failed to upload file');
      });
    }

    // Advance to next file
    const nextIndex = curFileIndex + 1;
    if (nextIndex < curPendingFiles.length) {
      setEditingFileIndex(nextIndex);
    } else {
      setShowAnnotationEditor(false);
      setPendingEditFiles([]);
      setEditingFileIndex(0);
      setEditingAppendixId(null);
    }
  }, [uploadSingleFile]);

  const handleAnnotationClose = useCallback(() => {
    setShowAnnotationEditor(false);
    setPendingEditFiles([]);
    setEditingFileIndex(0);
    setEditingDocument(null);
    setEditingAppendixId(null);
    setEditingFileName(null);
    if (editingImageUrl) {
      URL.revokeObjectURL(editingImageUrl);
      setEditingImageUrl(null);
    }
    // Don't clear activeAppendixId if there are pending non-image files
  }, [editingImageUrl]);

  // Edit an existing appendix document
  const handleEditDocument = useCallback(
    async (appendixId: string, doc: AppendixDocumentDto) => {
      try {
        const { blob, fileName } = await downloadDocument(doc.documentId);
        const url = URL.createObjectURL(blob);
        setEditingDocument(doc);
        setEditingAppendixId(appendixId);
        setEditingImageUrl(url);
        setEditingFileName(fileName);
        setShowAnnotationEditor(true);
      } catch (error) {
        console.error('Failed to download document for editing:', error);
        toast.error('Failed to load document for editing');
      }
    },
    [downloadDocument],
  );

  const handleAddFiles = (appendixId: string) => {
    setActiveAppendixId(appendixId);
    setShowPhotoSourceModal(true);
  };

  const handleUploadFromDevice = (files: FileList) => {
    const appendixId = activeAppendixIdRef.current;
    if (!appendixId) return;

    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(isImageFile);
    const nonImageFiles = fileArray.filter(f => !isImageFile(f));

    if (nonImageFiles.length > 0) {
      toast.error('Only image files are allowed');
    }

    // Open editor for image files — save appendixId into editor state
    // because activeAppendixIdRef will be cleared when PhotoSourceModal closes
    if (imageFiles.length > 0) {
      setEditingAppendixId(appendixId);
      setPendingEditFiles(imageFiles);
      setEditingFileIndex(0);
      setShowAnnotationEditor(true);
    } else {
      setActiveAppendixId(null);
    }
  };

  const transitionToGalleryRef = useRef(false);
  const handleChooseFromGallery = () => {
    transitionToGalleryRef.current = true;
    setShowGalleryModal(true);
  };

  const handleGallerySelect = async (selectedImages: GalleryImage[]) => {
    const appendixId = activeAppendixIdRef.current;
    if (!appraisalId || !appendixId) return;

    try {
      for (const image of selectedImages) {
        const appendix = appendices.find(a => a.id === appendixId);
        const nextSequence = (appendix?.documents.length ?? 0) + 1;

        await addAppendixDocument.mutateAsync({
          appraisalId,
          appendixId,
          body: {
            galleryPhotoId: image.id,
            displaySequence: nextSequence,
          },
        });
      }

      toast.success('Files added from gallery');
    } catch (error) {
      console.error('Gallery select failed:', error);
      toast.error('Failed to add files from gallery');
    }

    setActiveAppendixId(null);
  };

  // Delete appendix document
  const handleDeleteDocument = (appendixId: string, documentId: string) => {
    setDeleteConfirm({ appendixId, documentId });
  };

  const handleConfirmDelete = () => {
    if (!appraisalId || !deleteConfirm) return;
    removeAppendixDocument.mutate(
      { appraisalId, appendixId: deleteConfirm.appendixId, documentId: deleteConfirm.documentId },
      {
        onSuccess: () => {
          toast.success('Document removed');
          setDeleteConfirm(null);
        },
        onError: () => toast.error('Failed to remove document'),
      },
    );
  };

  const handleViewDocument = (doc: DocumentItemDto | AppendixDocumentDto) => {
    if ('documentId' in doc && doc.documentId) {
      window.open(`${API_BASE_URL}/documents/${doc.documentId}/download?download=false`, '_blank');
    } else if ('filePath' in doc) {
      const filePath = (doc as DocumentItemDto).filePath;
      if (filePath) window.open(filePath, '_blank');
    }
  };

  const handlePreviewLayout = (appendixId: string) => {
    console.log('Preview layout for:', appendixId);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent, appendixId: string) => {
    e.preventDefault();
    setDragOverSection(appendixId);
  };

  const handleDragLeave = () => {
    setDragOverSection(null);
  };

  const handleDrop = (e: React.DragEvent, appendixId: string) => {
    e.preventDefault();
    setDragOverSection(null);
    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(isImageFile);
    const nonImageFiles = fileArray.filter(f => !isImageFile(f));

    if (nonImageFiles.length > 0) {
      toast.error('Only image files are allowed');
    }

    if (imageFiles.length > 0) {
      setEditingAppendixId(appendixId);
      setPendingEditFiles(imageFiles);
      setEditingFileIndex(0);
      setShowAnnotationEditor(true);
    }
  };

  const isLoading = isLoadingRequestDocs || isLoadingAppendices;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading documents...</p>
        </div>
      </div>
    );
  }

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

        {/* Document Sections */}
        <div className="divide-y divide-gray-100">
          {requestDocsData?.sections.map((section, sectionIdx) => {
            const sectionLabel =
              section.titleIdentifier ?? section.collateralType ?? `Section ${sectionIdx + 1}`;
            return (
              <div key={section.titleId ?? `section-${sectionIdx}`}>
                {/* Section Header */}
                <div className="px-6 py-3 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{sectionLabel}</span>
                    <span className="text-xs text-gray-400">
                      ({section.uploadedDocuments}/{section.totalDocuments} uploaded)
                    </span>
                  </div>
                </div>

                {/* Section Documents */}
                {section.documents.map(doc => {
                  const fileIcon = getFileIcon(doc.fileName);
                  return (
                    <div
                      key={doc.id}
                      className="px-6 py-4 hover:bg-gray-50/50 transition-colors grid grid-cols-[200px_1fr_100px_80px] gap-4 items-center"
                    >
                      {/* Document Type & Status */}
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-900">
                          {doc.documentType}
                        </span>
                        <div className="flex items-center gap-2">
                          <StatusBadge hasFile={!!doc.fileName} />
                          {doc.isRequired && (
                            <span className="text-xs text-red-500 font-medium">Required</span>
                          )}
                        </div>
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
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400 italic">No file uploaded</span>
                        )}
                      </div>

                      {/* Notes */}
                      <div
                        className="text-sm text-gray-500 truncate"
                        title={doc.notes || undefined}
                      >
                        {doc.notes || '-'}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end">
                        {doc.fileName && (
                          <ActionDropdown
                            onView={() => handleViewDocument(doc)}
                            isEditable={false}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {(!requestDocsData || requestDocsData.sections.length === 0) && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              No request documents found
            </div>
          )}
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
              {!readOnly && appendices.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleAddFiles(appendices[0].id)}
                  className="ml-2"
                >
                  <Icon name="plus" className="mr-1.5" />
                  Add Files
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Appendix Sections */}
        <div className="divide-y divide-gray-100">
          {appendices.map(appendix => {
            const isExpanded = expandedSections.has(appendix.id);
            const isDragOver = dragOverSection === appendix.id;
            const sortedDocs = [...appendix.documents].sort(
              (a, b) => a.displaySequence - b.displaySequence,
            );

            return (
              <div
                key={appendix.id}
                onDragOver={readOnly ? undefined : e => handleDragOver(e, appendix.id)}
                onDragLeave={readOnly ? undefined : handleDragLeave}
                onDrop={readOnly ? undefined : e => handleDrop(e, appendix.id)}
                className={clsx('transition-colors', !readOnly && isDragOver && 'bg-primary/5')}
              >
                {/* Appendix Header */}
                <div
                  className={clsx(
                    'px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors',
                    isExpanded && 'bg-gray-50/50',
                  )}
                  onClick={() => handleToggleSection(appendix.id)}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      name={isExpanded ? 'chevron-down' : 'chevron-right'}
                      className="text-gray-400 text-sm transition-transform"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {appendix.appendixTypeName}
                    </span>
                    {appendix.documents.length > 0 && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                        {appendix.documents.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    {!readOnly && (
                      <>
                        {/* Layout Selector */}
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                          <span className="text-xs text-gray-500">Layout:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3].map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleLayoutChange(appendix, num)}
                                className={clsx(
                                  'w-6 h-6 rounded text-xs font-medium transition-colors',
                                  appendix.layoutColumns === num
                                    ? 'bg-primary text-white'
                                    : 'text-gray-500 hover:bg-gray-100',
                                )}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Preview Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewLayout(appendix.id)}
                      className="text-xs"
                    >
                      <Icon name="eye" className="mr-1" />
                      Preview
                    </Button>

                    {!readOnly && (
                      /* Add Button */
                      <button
                        type="button"
                        onClick={() => handleAddFiles(appendix.id)}
                        className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Icon name="circle-plus" style="solid" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {sortedDocs.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                        {sortedDocs.map(doc => {
                          const thumbnailUrl = `${API_BASE_URL}/documents/${doc.documentId}/download?download=false&size=large`;
                          return (
                            <div
                              key={doc.id}
                              className="px-6 py-3 hover:bg-gray-50/50 transition-colors grid grid-cols-[1fr_48px] gap-4 items-center ml-6"
                            >
                              {/* File Info */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                                  <img
                                    src={thumbnailUrl}
                                    alt={doc.fileName || 'Document'}
                                    className="w-10 h-10 rounded-lg object-cover"
                                    onError={e => {
                                      const target = e.currentTarget;
                                      target.style.display = 'none';
                                      const icon = getFileIcon(doc.fileName ?? null);
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<span class="${icon.color} text-lg"><i class="fa-solid fa-${icon.name}"></i></span>`;
                                      }
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => handleViewDocument(doc)}
                                    className="text-sm text-primary hover:text-primary-700 hover:underline truncate block max-w-full text-left"
                                    title={doc.fileName || 'Untitled document'}
                                  >
                                    {doc.fileName || 'Untitled document'}
                                  </button>
                                  <div className="flex items-center gap-2">
                                    {doc.fileExtension && (
                                      <span className="text-xs text-gray-400 uppercase">
                                        {doc.fileExtension.replace(/^\./, '')}
                                      </span>
                                    )}
                                    {doc.fileSizeBytes != null && doc.fileSizeBytes > 0 && (
                                      <span className="text-xs text-gray-400">
                                        {formatFileSize(doc.fileSizeBytes)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex justify-end">
                                <ActionDropdown
                                  onView={() => handleViewDocument(doc)}
                                  onEdit={() => void handleEditDocument(appendix.id, doc)}
                                  onDelete={() => handleDeleteDocument(appendix.id, doc.id)}
                                  isEditable={!readOnly}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : readOnly ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <p className="text-sm text-gray-400">No documents</p>
                      </div>
                    ) : (
                      <EmptyUploadState
                        onUpload={() => handleAddFiles(appendix.id)}
                        isDragging={isDragOver}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {appendices.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              No appendix sections found
            </div>
          )}
        </div>
      </section>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        multiple
        onClick={e => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={e => e.target.files && handleUploadFromDevice(e.target.files)}
        className="hidden"
      />

      {/* Photo Source Modal */}
      <PhotoSourceModal
        isOpen={showPhotoSourceModal}
        onClose={() => {
          setShowPhotoSourceModal(false);
          // Don't clear activeAppendixId when transitioning to gallery modal
          if (transitionToGalleryRef.current) {
            transitionToGalleryRef.current = false;
          } else {
            setActiveAppendixId(null);
          }
        }}
        onUploadFromDevice={handleUploadFromDevice}
        onChooseFromGallery={handleChooseFromGallery}
        title={activeAppendix ? `Add ${activeAppendix.appendixTypeName}` : 'Add Files'}
        accept=".jpg,.jpeg,.png"
      />

      {/* Gallery Selection Modal */}
      <GallerySelectionModal
        isOpen={showGalleryModal}
        onClose={() => {
          setShowGalleryModal(false);
          setActiveAppendixId(null);
        }}
        onSelect={handleGallerySelect}
        images={galleryImages}
        multiSelect
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={removeAppendixDocument.isPending}
      />

      {/* Image Annotation Editor */}
      {showAnnotationEditor && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <ImageAnnotationEditor
            isOpen={showAnnotationEditor}
            onClose={handleAnnotationClose}
            imageFile={editingDocument ? undefined : pendingEditFiles[editingFileIndex]}
            imageUrl={editingImageUrl ?? undefined}
            onSave={handleAnnotationSave}
            onSkip={editingDocument ? undefined : handleAnnotationSkip}
            fileName={
              editingDocument
                ? (editingFileName ?? `document-${editingDocument.documentId}.png`)
                : pendingEditFiles[editingFileIndex]?.name
            }
          />
        </Suspense>
      )}
    </div>
  );
};

export default DocumentChecklistTab;
