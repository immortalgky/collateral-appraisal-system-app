import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { lazyWithRetry } from '@shared/utils/lazyWithRetry';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import PhotoSourceModal from '../PhotoSourceModal';
import GallerySelectionModal from '../GallerySelectionModal';
import AppendixChooserModal from '../AppendixChooserModal';
import DocumentListView, {
  type ListSection,
} from '@/features/request/components/documentCard/DocumentListView';
import type { TypeRow } from '@/features/request/utils/documentList';
import type { UploadedDocument } from '@/features/request/types/document';
import { isImageDocument, openDocumentViewer } from '../documentShared';
import { appendixSection } from '../../utils/checklistDocuments';
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
import {
  isAllowedValuationDocumentFile,
  VALUATION_DOCUMENT_ACCEPT,
} from '../../utils/valuationDocuments';

const ImageAnnotationEditor = lazyWithRetry(
  () => import('@shared/components/ImageAnnotationEditor/ImageAnnotationEditor'),
);

const isImageFile = (file: File) => /\.(jpg|jpeg|png)$/i.test(file.name);
// Same page as the valuation document checklist, same accepted types.
const isAcceptedAppendixFile = isAllowedValuationDocumentFile;

// Mirrors the server cap (FileStorageConfiguration.MaxFileSizeBytes / appsettings 52428800).
// The appendix path had no client-side size check at all — the server rejected oversize uploads
// only after the full transfer, which is slow and opaque for the larger PDFs now allowed.
const MAX_APPENDIX_FILE_SIZE = 50 * 1024 * 1024;
const isWithinSizeLimit = (file: File) => file.size <= MAX_APPENDIX_FILE_SIZE;

export const AppendixTab = () => {
  const readOnly = usePageReadOnly();
  const { t } = useTranslation('appraisal');
  const { t: tCommon } = useTranslation('common');
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
  const [activeAppendixId, _setActiveAppendixId] = useState<string | null>(null);
  const activeAppendixIdRef = useRef<string | null>(null);
  const setActiveAppendixId = (id: string | null) => {
    activeAppendixIdRef.current = id;
    _setActiveAppendixId(id);
  };
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showAppendixChooser, setShowAppendixChooser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload session ref (created once per component lifetime)
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  // Derived data
  const appendices = useMemo(() => appendicesData?.items ?? [], [appendicesData]);

  const galleryImages: GalleryImage[] = useMemo(
    () => (galleryData?.photos ?? []).map(toGalleryImage),
    [galleryData],
  );

  const activeAppendix = appendices.find(a => a.id === activeAppendixId);

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

  // Moves the annotation queue on to the next pending file, or closes it after the last one
  const advanceAnnotationQueue = useCallback(() => {
    const curPendingFiles = pendingEditFilesRef.current;
    const curFileIndex = editingFileIndexRef.current;
    const nextIndex = curFileIndex + 1;
    if (nextIndex < curPendingFiles.length) {
      setEditingFileIndex(nextIndex);
    } else {
      setShowAnnotationEditor(false);
      setPendingEditFiles([]);
      setEditingFileIndex(0);
      setEditingAppendixId(null);
    }
  }, []);

  const handleAnnotationSkip = useCallback(() => {
    // Read from refs to avoid stale closures
    const currentFile = pendingEditFilesRef.current[editingFileIndexRef.current];
    const curAppendixId = editingAppendixIdRef.current;

    // Upload the current file without annotation
    if (currentFile && curAppendixId) {
      void uploadSingleFile(currentFile, curAppendixId).catch(() => {
        toast.error(t('toasts.fileUploadFailed'));
      });
    }

    advanceAnnotationQueue();
  }, [uploadSingleFile, advanceAnnotationQueue]);

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

  // Files dropped on an appendix row
  const handleDropFiles = (fileArray: File[], appendixId: string) => {
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

  // The appendix type's name in the UI language, else the one the API sent
  const typeName = useCallback(
    (appendix: AppraisalAppendixDto) =>
      t(`valuationDocuments.appendixTypes.${appendix.appendixTypeCode}`, {
        defaultValue: appendix.appendixTypeName,
      }),
    [t],
  );
  const appendixOf = (doc: UploadedDocument) =>
    appendices.find(appendix => appendix.documents.some(d => d.id === doc.id));
  const appendixOfRow = (row: TypeRow) =>
    appendices.find(appendix => appendix.appendixTypeCode === row.documentType);
  const sections = useMemo<ListSection[]>(
    () =>
      appendices.length
        ? [appendixSection(appendices, typeName, t('valuationDocuments.appendix.title'))]
        : [],
    [appendices, typeName, t],
  );

  if (isLoadingAppendices) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-(--palette-gray-500)">
            {t('valuationDocuments.appendix.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isGalleryError && (
        <DataErrorState
          variant="inline"
          title={t('valuationDocuments.appendix.galleryFailed')}
          message={(galleryError as Error)?.message}
          onRetry={refetchGallery}
        />
      )}

      {isAppendicesError ? (
        <DataErrorState
          variant="inline"
          title={t('valuationDocuments.appendix.loadFailed')}
          message={(appendicesError as Error)?.message}
          onRetry={refetchAppendices}
        />
      ) : (
        <DocumentListView
          title={t('valuationDocuments.appendix.title')}
          icon="folder-plus"
          sections={sections}
          typeName={(code, displayName) => displayName || code}
          editable={!readOnly}
          flat
          showSource={false}
          showNotes={false}
          allTypesToggleKey="appraisal.documentChecklist.appendixAllTypes"
          onView={doc => {
            const original = appendixOf(doc)?.documents.find(d => d.id === doc.id);
            if (original) openDocumentViewer(original);
          }}
          onUpload={
            readOnly
              ? undefined
              : row => {
                  const appendix = appendixOfRow(row);
                  if (appendix) handleAddFiles(appendix.id);
                }
          }
          onRemove={
            readOnly
              ? undefined
              : doc => {
                  const appendix = appendixOf(doc);
                  if (appendix && doc.id) handleDeleteDocument(appendix.id, doc.id);
                }
          }
          // PDFs have no annotation-editor path: Edit downloads the blob into the image canvas
          onEdit={
            readOnly
              ? undefined
              : doc => {
                  const appendix = appendixOf(doc);
                  const original = appendix?.documents.find(d => d.id === doc.id);
                  if (appendix && original) void handleEditDocument(appendix.id, original);
                }
          }
          canEdit={doc => {
            const original = appendixOf(doc)?.documents.find(d => d.id === doc.id);
            return !!original && isImageDocument(original.fileName, original.mimeType);
          }}
          editLabel={t('valuationDocuments.appendix.editImage')}
          layoutOf={row => appendixOfRow(row)?.layoutColumns}
          onLayoutChange={
            readOnly
              ? undefined
              : (row, columns) => {
                  const appendix = appendixOfRow(row);
                  if (appendix) handleLayoutChange(appendix, columns);
                }
          }
          onDropFiles={
            readOnly
              ? undefined
              : (row, files) => {
                  const appendix = appendixOfRow(row);
                  if (appendix) handleDropFiles(files, appendix.id);
                }
          }
          headerExtra={
            !readOnly && appendices.length > 0 ? (
              <Button variant="primary" size="sm" onClick={() => setShowAppendixChooser(true)}>
                <Icon name="plus" className="mr-1.5" />
                {t('valuationDocuments.appendix.addFiles')}
              </Button>
            ) : undefined
          }
          emptyLabel={t('valuationDocuments.appendix.empty')}
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={VALUATION_DOCUMENT_ACCEPT}
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
          appendixTypeName: typeName(a),
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
        title={
          activeAppendix
            ? t('valuationDocuments.appendix.addTo', { name: typeName(activeAppendix) })
            : t('valuationDocuments.appendix.addFiles')
        }
        accept={VALUATION_DOCUMENT_ACCEPT}
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
        title={t('valuationDocuments.appendix.deleteDialog.title')}
        message={t('valuationDocuments.appendix.deleteDialog.message')}
        confirmText={t('valuationDocuments.appendix.deleteDialog.confirm')}
        cancelText={tCommon('actions.cancel')}
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
            onDiscard={editingDocument ? undefined : advanceAnnotationQueue}
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
