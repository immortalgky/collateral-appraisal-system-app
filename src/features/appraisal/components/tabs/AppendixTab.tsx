import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { lazyWithRetry } from '@shared/utils/lazyWithRetry';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import PhotoSourceModal from '../PhotoSourceModal';
import GallerySelectionModal from '../GallerySelectionModal';
import AppendixChooserModal from '../AppendixChooserModal';
import {
  ActionDropdown,
  DocumentFileRow,
  EmptyUploadState,
  isImageDocument,
  openDocumentViewer,
} from '../documentShared';
import type { GalleryImage } from '../../types/gallery';
import { toGalleryImage } from '../../types/gallery';
import { useAppraisalContext } from '../../context/AppraisalContext';
import { useAuthStore } from '@features/auth/store';
import {
  useAddAppendixDocument,
  useAddGalleryPhoto,
  useGetAppendices,
  useRemoveAppendixDocument,
  useUpdateAppendixLayout,
} from '@features/appraisal/api';
import {
  createUploadSession,
  useDownloadDocument,
  useUploadDocument,
} from '@features/request/api/documents';
import { useGetGalleryPhotos } from '../../api/gallery';
import type { AppendixDocumentDto, AppraisalAppendixDto } from '../../types/documentChecklist';
import type { AnnotationResult } from '@shared/components/ImageAnnotationEditor';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import DataErrorState from '@/shared/components/DataErrorState';

const ImageAnnotationEditor = lazyWithRetry(
  () => import('@shared/components/ImageAnnotationEditor/ImageAnnotationEditor'),
);

const isImageFile = (file: File) => /\.(jpg|jpeg|png)$/i.test(file.name);
// Mirrors ValuationDocumentChecklist.tsx's isAllowedChecklistFile — same page, same accepted types.
const isAcceptedAppendixFile = (file: File) => /\.(jpe?g|png|pdf)$/i.test(file.name);

// Mirrors the server cap (FileStorageConfiguration.MaxFileSizeBytes / appsettings 52428800).
// The appendix path had no client-side size check at all — the server rejected oversize uploads
// only after the full transfer, which is slow and opaque for the larger PDFs now allowed.
const MAX_APPENDIX_FILE_SIZE = 50 * 1024 * 1024;
const isWithinSizeLimit = (file: File) => file.size <= MAX_APPENDIX_FILE_SIZE;

export const AppendixTab = () => {
  const readOnly = usePageReadOnly();
  const { t } = useTranslation('appraisal');
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId;
  const currentUser = useAuthStore(state => state.user);

  // Queries
  const {
    data: appendicesData,
    isLoading: isLoadingAppendices,
    isError: isAppendicesError,
    error: appendicesError,
    refetch: refetchAppendices,
  } = useGetAppendices(appraisalId);
  const {
    data: galleryData,
    isError: isGalleryError,
    error: galleryError,
    refetch: refetchGallery,
  } = useGetGalleryPhotos(appraisalId);

  // Mutations
  const addAppendixDocument = useAddAppendixDocument();
  const removeAppendixDocument = useRemoveAppendixDocument();
  const updateAppendixLayout = useUpdateAppendixLayout();
  const { mutateAsync: uploadDocument } = useUploadDocument();
  const { mutateAsync: addGalleryPhoto } = useAddGalleryPhoto();
  const { mutateAsync: downloadDocument } = useDownloadDocument();

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    appendixId: string;
    documentId: string;
  } | null>(null);

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
  const [showAppendixChooser, setShowAppendixChooser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload session ref (created once per component lifetime)
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  // Derived data
  const appendices = useMemo(() => appendicesData?.items ?? [], [appendicesData]);
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
        onError: () => toast.error(t('toasts.layoutUpdateFailed')),
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
        uploadedBy: currentUser?.username ?? '',
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
        uploadedByName: currentUser?.name ?? null,
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
      currentUser,
    ],
  );

  // Upload a PDF straight through — no annotation editor, no gallery. Mirrors the shape of
  // uploadSingleFile's 3-step flow but stops after the document upload and links via `documentId`
  // instead of `galleryPhotoId`.
  const uploadPdfFile = useCallback(
    async (file: File, appendixId: string, displaySequence: number) => {
      if (!appraisalId) return;

      const sessionId = await getOrCreateSession();

      const uploadResult = await uploadDocument({
        uploadSessionId: sessionId,
        file,
        documentType: 'APPENDIX',
        documentCategory: 'appendix',
      });

      await addAppendixDocument.mutateAsync({
        appraisalId,
        appendixId,
        body: {
          documentId: uploadResult.documentId,
          displaySequence,
        },
      });
    },
    [appraisalId, getOrCreateSession, uploadDocument, addAppendixDocument],
  );

  const handlePdfFiles = useCallback(
    // `sequenceOffset` reserves room for images uploaded in the SAME batch: they run
    // concurrently through the annotation editor and derive their own sequence from the same
    // (unrefreshed) `appendices` closure, so without the offset the first PDF and the first
    // image both claim documents.length + 1.
    async (pdfFiles: File[], appendixId: string, sequenceOffset = 0) => {
      // Compute the base sequence ONCE and increment per file. `appendices` is a react-query
      // result that cannot refresh mid-loop, so reading it inside the loop would hand every
      // file the same DisplaySequence — and the report orders by it (ORDER BY SortOrder,
      // DisplaySequence), making tied pages render in arbitrary order.
      const appendix = appendices.find(a => a.id === appendixId);
      const baseSequence = (appendix?.documents.length ?? 0) + sequenceOffset;

      try {
        for (const [index, file] of pdfFiles.entries()) {
          await uploadPdfFile(file, appendixId, baseSequence + index + 1);
        }
        toast.success(t('toasts.filesUploaded'));
      } catch (error) {
        console.error('PDF upload failed:', error);
        toast.error(t('toasts.fileUploadFailed'));
      }
    },
    [appendices, uploadPdfFile, t],
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
          toast.success(t('toasts.documentUpdated'));
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
          toast.success(t('toasts.filesUploaded'));
        }
      } catch (error) {
        console.error('Annotation save failed:', error);
        toast.error(t('toasts.annotationSaveFailed'));
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
        toast.error(t('toasts.fileUploadFailed'));
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
        toast.error(t('toasts.documentLoadFailed'));
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
    // Buckets stay mutually exclusive and exhaustive: wrong type → rejected; right type but
    // over the cap → oversize; the remainder splits into images and PDFs.
    const rejectedFiles = fileArray.filter(f => !isAcceptedAppendixFile(f));
    const oversizeFiles = fileArray.filter(f => isAcceptedAppendixFile(f) && !isWithinSizeLimit(f));
    const sizedFiles = fileArray.filter(f => isAcceptedAppendixFile(f) && isWithinSizeLimit(f));
    const imageFiles = sizedFiles.filter(isImageFile);
    const pdfFiles = sizedFiles.filter(f => !isImageFile(f));

    if (rejectedFiles.length > 0) {
      toast.error(t('toasts.invalidDocumentFileType'));
    }

    if (oversizeFiles.length > 0) {
      toast.error(t('toasts.fileTooLarge'));
    }

    if (pdfFiles.length > 0) {
      void handlePdfFiles(pdfFiles, appendixId, imageFiles.length);
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

      toast.success(t('toasts.galleryFilesAdded'));
    } catch (error) {
      console.error('Gallery select failed:', error);
      toast.error(t('toasts.galleryFilesAddFailed'));
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
          toast.success(t('toasts.documentRemoved'));
          setDeleteConfirm(null);
        },
        onError: () => toast.error(t('toasts.documentRemoveFailed')),
      },
    );
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
    // Buckets stay mutually exclusive and exhaustive: wrong type → rejected; right type but
    // over the cap → oversize; the remainder splits into images and PDFs.
    const rejectedFiles = fileArray.filter(f => !isAcceptedAppendixFile(f));
    const oversizeFiles = fileArray.filter(f => isAcceptedAppendixFile(f) && !isWithinSizeLimit(f));
    const sizedFiles = fileArray.filter(f => isAcceptedAppendixFile(f) && isWithinSizeLimit(f));
    const imageFiles = sizedFiles.filter(isImageFile);
    const pdfFiles = sizedFiles.filter(f => !isImageFile(f));

    if (rejectedFiles.length > 0) {
      toast.error(t('toasts.invalidDocumentFileType'));
    }

    if (oversizeFiles.length > 0) {
      toast.error(t('toasts.fileTooLarge'));
    }

    if (pdfFiles.length > 0) {
      void handlePdfFiles(pdfFiles, appendixId, imageFiles.length);
    }

    if (imageFiles.length > 0) {
      setEditingAppendixId(appendixId);
      setPendingEditFiles(imageFiles);
      setEditingFileIndex(0);
      setShowAnnotationEditor(true);
    }
  };

  if (isLoadingAppendices) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading appendix...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isGalleryError && (
        <DataErrorState
          variant="inline"
          title="Failed to load gallery"
          message={(galleryError as Error)?.message}
          onRetry={refetchGallery}
        />
      )}

      {/* Appendix Documents Section */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="folder-plus" className="text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900">Appendix Documents</h3>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
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
                  onClick={() => setShowAppendixChooser(true)}
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
          {isAppendicesError ? (
            <DataErrorState
              variant="inline"
              title="Failed to load appendices"
              message={(appendicesError as Error)?.message}
              onRetry={refetchAppendices}
            />
          ) : (
            appendices.map(appendix => {
              const isExpanded = expandedSections.has(appendix.id);
              const isDragOver = dragOverSection === appendix.id;
              // Explicit `AppendixDocumentDto[]` (not inferred from `appendix.documents`) so the
              // hand-extended uploadedAt/uploadedBy/uploadedByName fields type-check — see the
              // note on that type in types/documentChecklist.ts.
              const sortedDocs: AppendixDocumentDto[] = [...appendix.documents].sort(
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
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
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
                    </div>
                  </div>

                  {/* Section Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {sortedDocs.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                          {sortedDocs.map(doc => (
                            <div key={doc.id} className="px-6 py-3 hover:bg-gray-50/50 transition-colors ml-6">
                              <DocumentFileRow
                                fileName={doc.fileName}
                                documentId={doc.documentId}
                                mimeType={doc.mimeType}
                                fileExtension={doc.fileExtension}
                                fileSizeBytes={doc.fileSizeBytes}
                                uploadedAt={doc.uploadedAt}
                                uploadedByName={doc.uploadedByName}
                                uploadedBy={doc.uploadedBy}
                                onView={() => openDocumentViewer(doc)}
                                t={t}
                                actions={
                                  <ActionDropdown
                                    onView={() => openDocumentViewer(doc)}
                                    // PDFs have no annotation-editor path — Edit downloads the blob
                                    // into the image canvas, which is meaningless for a PDF.
                                    onEdit={
                                      isImageDocument(doc.fileName, doc.mimeType)
                                        ? () => void handleEditDocument(appendix.id, doc)
                                        : undefined
                                    }
                                    onDelete={() => handleDeleteDocument(appendix.id, doc.id)}
                                    isEditable={!readOnly}
                                  />
                                }
                              />
                            </div>
                          ))}
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
            })
          )}

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
        accept=".jpg,.jpeg,.png,.pdf"
        multiple
        onClick={e => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={e => e.target.files && handleUploadFromDevice(e.target.files)}
        className="hidden"
      />

      {/* Appendix Chooser Modal — "choose appendix first" entry point for the global Add Files button */}
      <AppendixChooserModal
        isOpen={showAppendixChooser}
        onClose={() => setShowAppendixChooser(false)}
        appendices={appendices.map(a => ({
          id: a.id,
          appendixTypeName: a.appendixTypeName,
          documentCount: a.documents.length,
        }))}
        onSelect={appendixId => {
          setShowAppendixChooser(false);
          handleAddFiles(appendixId);
        }}
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
        accept=".jpg,.jpeg,.png,.pdf"
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
    </>
  );
};

export default AppendixTab;
