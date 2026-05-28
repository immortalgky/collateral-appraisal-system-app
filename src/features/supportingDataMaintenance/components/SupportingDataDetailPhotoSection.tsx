import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import PhotoGallery, { type Photo } from '@features/appraisal/components/PhotoGallery';
import PhotoSourceModal from '@features/appraisal/components/PhotoSourceModal';
import PhotoDeleteConfirmModal from '@features/appraisal/components/PhotoDeleteConfirmModal';
import PhotoPreviewModal, {
  type PreviewablePhoto,
} from '@features/appraisal/components/PhotoPreviewModal';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import { useAddSupportingDetailImage, useRemoveSupportingDetailImage } from '../api';
import type { SupportingDetailImageType } from '../schemas/form';

// Same pattern used by toGalleryImage — the raw storageUrl from the upload API
// is a blob-storage path that the browser cannot load directly.
// All photo display goes through the authenticated document download endpoint.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const photoUrl = (documentId: string) =>
  `${API_BASE_URL}/documents/${documentId}/download?download=false`;

// ─── Public ref API ──────────────────────────────────────────────────────────
export interface SupportingDataDetailPhotoSectionRef {
  /**
   * Called by the parent page after a new detail is successfully created.
   * Flushes any photos the user added in create mode to the real entity.
   */
  linkImagesToDetail: (supportingId: string, detailId: string) => Promise<void>;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SupportingDataDetailPhotoSectionProps {
  supportingId: string;
  /** Undefined in create mode (entity doesn't exist yet). */
  detailId?: string;
  /** Images loaded from GET response in edit mode. */
  images?: SupportingDetailImageType[];
}

// ─── Pending item tracked in create mode ─────────────────────────────────────
interface PendingImage {
  documentId: string;
  storageUrl: string;
  fileName: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
const SupportingDataDetailPhotoSection = forwardRef<
  SupportingDataDetailPhotoSectionRef,
  SupportingDataDetailPhotoSectionProps
>(({ supportingId, detailId, images }, ref) => {
  const isCreateMode = !detailId;

  // Photos collected in create mode, not yet persisted
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  // Temporary placeholder cards shown with a spinner while uploading
  const [uploadingPhotos, setUploadingPhotos] = useState<Photo[]>([]);

  // Modal state
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PreviewablePhoto | null>(null);

  // Upload session — created once per component lifetime
  const uploadSessionIdRef = useRef<string | null>(null);

  const uploadDocumentMutation = useUploadDocument();
  const addImageMutation = useAddSupportingDetailImage();
  const removeImageMutation = useRemoveSupportingDetailImage();

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getUploadSessionId = useCallback(async () => {
    if (!uploadSessionIdRef.current) {
      const session = await createUploadSession();
      uploadSessionIdRef.current = session.sessionId;
    }
    return uploadSessionIdRef.current;
  }, []);

  // ── Photo list for PhotoGallery ────────────────────────────────────────────
  //
  // - Edit mode: build from the `images` prop (already loaded by the page)
  // - Create mode: build from `pendingImages` (in-memory only, not yet saved)
  // In both cases we append uploading placeholders at the end.

  const resolvedPhotos: Photo[] = useMemo(() => {
    if (isCreateMode) {
      return pendingImages.map(img => ({
        id: img.documentId, // use documentId as key until entity exists
        documentId: img.documentId,
        fileName: img.fileName ?? 'photo',
        url: photoUrl(img.documentId),
        fullSrc: photoUrl(img.documentId),
      }));
    }

    return (images ?? [])
      .slice()
      .sort((a, b) => a.displaySequence - b.displaySequence)
      .map(img => ({
        id: img.id, // SupportingDataDetailImage.Id — used for delete
        documentId: img.documentId,
        fileName: img.fileName ?? 'photo',
        url: photoUrl(img.documentId),
        fullSrc: photoUrl(img.documentId),
        mappingId: img.id, // same as id — kept for consistent shape
      }));
  }, [isCreateMode, pendingImages, images]);

  const photos: Photo[] = useMemo(
    () => [...resolvedPhotos, ...uploadingPhotos],
    [resolvedPhotos, uploadingPhotos],
  );

  // ── Upload handler (single file) ───────────────────────────────────────────

  const handleUpload = useCallback(
    async (file: File) => {
      const tempId = `uploading-${Date.now()}`;
      const previewUrl = URL.createObjectURL(file);

      setUploadingPhotos(prev => [
        ...prev,
        {
          id: tempId,
          documentId: null,
          fileName: file.name,
          url: previewUrl,
          isUploading: true,
        },
      ]);

      try {
        const sessionId = await getUploadSessionId();

        const uploadResult = await uploadDocumentMutation.mutateAsync({
          uploadSessionId: sessionId,
          file,
          documentType: 'PHOTO',
          documentCategory: 'prop_photo',
        });

        if (isCreateMode) {
          // Stash for later — flushed via linkImagesToDetail after entity created
          setPendingImages(prev => [
            ...prev,
            {
              documentId: uploadResult.documentId,
              storageUrl: uploadResult.storageUrl,
              fileName: uploadResult.fileName,
            },
          ]);
        } else if (detailId) {
          await addImageMutation.mutateAsync({
            supportingId,
            detailId,
            documentId: uploadResult.documentId,
            storageUrl: uploadResult.storageUrl,
            fileName: uploadResult.fileName,
          });
        }

        toast.success('Photo uploaded successfully');
      } catch {
        toast.error('Failed to upload photo');
      } finally {
        setUploadingPhotos(prev => prev.filter(p => p.id !== tempId));
        URL.revokeObjectURL(previewUrl);
      }
    },
    [
      supportingId,
      detailId,
      isCreateMode,
      getUploadSessionId,
      uploadDocumentMutation,
      addImageMutation,
    ],
  );

  const handleUploadFromDevice = useCallback(
    async (files: FileList) => {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      for (const file of imageFiles) {
        await handleUpload(file);
      }
    },
    [handleUpload],
  );

  // ── Delete handlers ────────────────────────────────────────────────────────

  const handleDeleteRequest = useCallback(
    (photoId: string) => {
      if (isCreateMode) {
        // In create mode photoId === documentId
        setPendingImages(prev => prev.filter(img => img.documentId !== photoId));
        toast.success('Photo removed');
        return;
      }
      setDeleteTargetId(photoId);
    },
    [isCreateMode],
  );

  // "Unlink" = remove from this detail (our only remove action)
  const handleUnlink = useCallback(async () => {
    if (!deleteTargetId || !detailId) {
      toast.error('Cannot remove: missing image ID');
      setDeleteTargetId(null);
      return;
    }
    setIsDeleteLoading(true);
    try {
      await removeImageMutation.mutateAsync({
        supportingId,
        detailId,
        imageId: deleteTargetId,
      });
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to remove photo');
    } finally {
      setIsDeleteLoading(false);
      setDeleteTargetId(null);
    }
  }, [supportingId, detailId, deleteTargetId, removeImageMutation]);

  // No "delete permanently" concept for standalone photos — the document storage
  // handles cleanup separately. We just show the unlink action.
  const handleDeletePermanently = handleUnlink;

  const buildPreviewable = useCallback((photo: Photo): PreviewablePhoto | null => {
    if (photo.isUploading || !photo.url) return null;
    return {
      id: photo.id,
      src: photo.fullSrc ?? photo.url,
      fileName: photo.fileName,
      caption: null,
      isInUse: undefined,
      fileExtension: photo.fileName?.includes('.') ? photo.fileName.split('.').pop() : undefined,
      mimeType: undefined,
      fileSizeBytes: undefined,
    };
  }, []);

  const handlePreview = useCallback(
    (photo: Photo) => {
      const p = buildPreviewable(photo);
      if (p) setPreviewPhoto(p);
    },
    [buildPreviewable],
  );

  const previewablePhotos: PreviewablePhoto[] = useMemo(
    () => photos.map(buildPreviewable).filter((p): p is PreviewablePhoto => p !== null),
    [photos, buildPreviewable],
  );

  useImperativeHandle(ref, () => ({
    linkImagesToDetail: async (newSupportingId: string, newDetailId: string) => {
      for (let i = 0; i < pendingImages.length; i++) {
        const img = pendingImages[i];
        try {
          await addImageMutation.mutateAsync({
            supportingId: newSupportingId,
            detailId: newDetailId,
            documentId: img.documentId,
            storageUrl: img.storageUrl,
            fileName: img.fileName,
          });
        } catch {
          toast.error(`Failed to link photo ${i + 1}`);
        }
      }
      setPendingImages([]);
    },
  }));

  return (
    <>
      <PhotoGallery
        photos={photos}
        onAddClick={() => setShowPhotoSourceModal(true)}
        onDelete={handleDeleteRequest}
        onSetThumbnail={() => {}} // no thumbnail concept for supporting data
        onPreview={handlePreview}
        thumbnailId={null} // no cover photo
      />

      <PhotoSourceModal
        isOpen={showPhotoSourceModal}
        onClose={() => setShowPhotoSourceModal(false)}
        onUploadFromDevice={handleUploadFromDevice}
        // No "Choose from Gallery" — standalone has no shared gallery
        onChooseFromGallery={undefined}
      />

      <PhotoDeleteConfirmModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onUnlink={handleUnlink}
        onDeletePermanently={handleDeletePermanently}
        isLoading={isDeleteLoading}
      />

      {previewPhoto && (
        <PhotoPreviewModal
          photo={previewPhoto}
          photos={previewablePhotos}
          isThumbnail={false}
          onClose={() => setPreviewPhoto(null)}
          onNavigate={setPreviewPhoto}
          onSetThumbnail={undefined}
          onDelete={() => {
            handleDeleteRequest(previewPhoto.id);
            setPreviewPhoto(null);
          }}
          onSaveDescription={undefined}
          isSavingDescription={false}
        />
      )}
    </>
  );
});

SupportingDataDetailPhotoSection.displayName = 'SupportingDataDetailPhotoSection';

export default SupportingDataDetailPhotoSection;
