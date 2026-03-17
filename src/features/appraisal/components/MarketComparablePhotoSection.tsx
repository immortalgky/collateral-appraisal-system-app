import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import PhotoGallery, { type Photo } from './PhotoGallery';
import PhotoPreviewModal, { type PreviewablePhoto } from './PhotoPreviewModal';
import PhotoSourceModal from './PhotoSourceModal';
import GallerySelectionModal from './GallerySelectionModal';
import PhotoDeleteConfirmModal from './PhotoDeleteConfirmModal';
import {
  useAddGalleryPhoto,
  useGetGalleryPhotos,
  useRemoveGalleryPhoto,
  useUpdateGalleryPhoto,
} from '../api/gallery';
import {
  useAddMarketComparableImage,
  useRemoveMarketComparableImage,
} from '../api/marketComparable';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import { toGalleryImage } from '../types/gallery';
import type { GalleryImage } from '../types/gallery';
import type { GalleryPhotoDtoType } from '@shared/schemas/v1';

export interface MarketComparablePhotoSectionRef {
  linkImagesToComparable: (marketComparableId: string) => Promise<void>;
}

interface MarketComparablePhotoSectionProps {
  appraisalId: string;
  marketComparableId?: string;
  images?: Array<{
    id?: string;
    galleryPhotoId?: string;
    title?: string | null;
    description?: string | null;
  }>;
}

interface DeleteTarget {
  photoId: string; // gallery photo ID
  imageId?: string; // market comparable image ID (for unlinking)
}

const MarketComparablePhotoSection = forwardRef<
  MarketComparablePhotoSectionRef,
  MarketComparablePhotoSectionProps
>(({ appraisalId, marketComparableId, images }, ref) => {
  const isCreateMode = !marketComparableId;

  // Pending gallery photo IDs for create mode (linked after comparable creation)
  const [pendingPhotoIds, setPendingPhotoIds] = useState<string[]>([]);

  // Uploading placeholders
  const [uploadingPhotos, setUploadingPhotos] = useState<Photo[]>([]);

  // Modal state
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  // Upload session ref
  const uploadSessionIdRef = useRef<string | null>(null);

  // API hooks
  const { data: galleryPhotos } = useGetGalleryPhotos(appraisalId);
  const addGalleryPhotoMutation = useAddGalleryPhoto();
  const removeGalleryPhotoMutation = useRemoveGalleryPhoto();
  const addImageMutation = useAddMarketComparableImage();
  const removeImageMutation = useRemoveMarketComparableImage();
  const uploadDocumentMutation = useUploadDocument();
  const { mutateAsync: updateGalleryPhoto, isPending: isUpdatingDescription } = useUpdateGalleryPhoto();

  // Map galleryPhotoId → imageId from the comparable's images (edit mode)
  const galleryPhotoToImageId = useMemo(() => {
    const map = new Map<string, string>();
    if (images) {
      for (const img of images) {
        if (img.galleryPhotoId && img.id) {
          map.set(img.galleryPhotoId, img.id);
        }
      }
    }
    return map;
  }, [images]);

  // Set of gallery photo IDs linked to this comparable
  const linkedGalleryPhotoIds = useMemo(() => {
    if (!images) return new Set<string>();
    return new Set(images.map(img => img.galleryPhotoId).filter(Boolean) as string[]);
  }, [images]);

  // Build photo list for PhotoGallery
  const photos: Photo[] = useMemo(() => {
    if (!galleryPhotos?.photos) return [...uploadingPhotos];

    const allPhotos = galleryPhotos.photos as GalleryPhotoDtoType[];

    let resolved: Photo[];
    if (isCreateMode) {
      resolved = allPhotos
        .filter(p => pendingPhotoIds.includes(p.id))
        .map(p => {
          const img = toGalleryImage(p);
          return {
            id: p.id,
            documentId: img.documentId,
            fileName: img.alt,
            url: img.thumbnailSrc,
            fullSrc: img.src,
          };
        });
    } else {
      resolved = allPhotos
        .filter(p => linkedGalleryPhotoIds.has(p.id))
        .map(p => {
          const img = toGalleryImage(p);
          return {
            id: p.id,
            documentId: img.documentId,
            fileName: img.alt,
            url: img.thumbnailSrc,
            fullSrc: img.src,
            mappingId: galleryPhotoToImageId.get(p.id),
          };
        });
    }

    return [...resolved, ...uploadingPhotos];
  }, [galleryPhotos, isCreateMode, pendingPhotoIds, linkedGalleryPhotoIds, galleryPhotoToImageId, uploadingPhotos]);

  // Gallery images for selection modal (exclude already-linked photos)
  const availableGalleryImages: GalleryImage[] = useMemo(() => {
    if (!galleryPhotos?.photos) return [];
    const allPhotos = galleryPhotos.photos as GalleryPhotoDtoType[];
    const currentPhotoIds = new Set(photos.map(p => p.id));
    return allPhotos.filter(p => !currentPhotoIds.has(p.id)).map(toGalleryImage);
  }, [galleryPhotos, photos]);

  // Get or create upload session
  const getUploadSessionId = useCallback(async () => {
    if (!uploadSessionIdRef.current) {
      const session = await createUploadSession();
      uploadSessionIdRef.current = session.sessionId;
    }
    return uploadSessionIdRef.current;
  }, []);

  // Upload handler (single file)
  const handleUpload = useCallback(
    async (file: File) => {
      const tempId = `uploading-${Date.now()}`;
      const previewUrl = URL.createObjectURL(file);
      const placeholder: Photo = {
        id: tempId,
        documentId: null,
        fileName: file.name,
        url: previewUrl,
        isUploading: true,
      };
      setUploadingPhotos(prev => [...prev, placeholder]);

      try {
        const sessionId = await getUploadSessionId();

        const uploadResult = await uploadDocumentMutation.mutateAsync({
          uploadSessionId: sessionId,
          file,
          documentType: 'PHOTO',
          documentCategory: 'prop_photo',
        });

        const documentId = uploadResult.documentId;

        const galleryResult = await addGalleryPhotoMutation.mutateAsync({
          appraisalId,
          documentId,
          photoType: 'property',
          caption: file.name,
          uploadedBy: 'current-user',
          latitude: null,
          longitude: null,
          capturedAt: null,
          photoCategory: null,
          photoTopicIds: null,
          fileName: uploadResult.fileName,
          filePath: uploadResult.storageUrl,
          fileExtension: file.name.includes('.') ? file.name.split('.').pop() ?? null : null,
          mimeType: file.type || null,
          fileSizeBytes: uploadResult.fileSize,
          uploadedByName: null,
        });

        const galleryPhotoId = galleryResult.id;

        if (isCreateMode) {
          setPendingPhotoIds(prev => [...prev, galleryPhotoId]);
        } else if (marketComparableId) {
          await addImageMutation.mutateAsync({
            marketComparableId,
            appraisalId,
            galleryPhotoId,
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
      appraisalId,
      marketComparableId,
      isCreateMode,
      getUploadSessionId,
      uploadDocumentMutation,
      addGalleryPhotoMutation,
      addImageMutation,
    ],
  );

  // PhotoSourceModal: "Upload from Device"
  const handleUploadFromDevice = useCallback(
    async (files: FileList) => {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      for (const file of imageFiles) {
        await handleUpload(file);
      }
    },
    [handleUpload],
  );

  // GallerySelectionModal: select & link gallery photos
  const handleGallerySelect = useCallback(
    async (selectedImages: GalleryImage[]) => {
      for (const image of selectedImages) {
        if (isCreateMode) {
          setPendingPhotoIds(prev => [...prev, image.id]);
        } else if (marketComparableId) {
          try {
            await addImageMutation.mutateAsync({
              marketComparableId,
              appraisalId,
              galleryPhotoId: image.id,
            });
          } catch {
            toast.error('Failed to link photo');
          }
        }
      }
      if (selectedImages.length > 0) {
        toast.success(
          selectedImages.length === 1
            ? 'Photo linked successfully'
            : `${selectedImages.length} photos linked successfully`,
        );
      }
    },
    [marketComparableId, isCreateMode, addImageMutation],
  );

  // Delete: open confirmation modal
  const handleDeleteRequest = useCallback(
    (photoId: string) => {
      if (isCreateMode) {
        setPendingPhotoIds(prev => prev.filter(id => id !== photoId));
        toast.success('Photo removed');
        return;
      }
      setDeleteTarget({
        photoId,
        imageId: galleryPhotoToImageId.get(photoId),
      });
    },
    [isCreateMode, galleryPhotoToImageId],
  );

  // Unlink handler (edit mode) — remove image link from comparable
  const handleUnlink = useCallback(async () => {
    if (!deleteTarget?.imageId || !marketComparableId) {
      toast.error('Cannot unlink: missing image ID');
      setDeleteTarget(null);
      return;
    }
    setIsDeleteLoading(true);
    try {
      await removeImageMutation.mutateAsync({
        marketComparableId,
        imageId: deleteTarget.imageId,
        appraisalId,
      });
      toast.success('Photo removed from comparable');
    } catch {
      toast.error('Failed to remove photo');
    } finally {
      setIsDeleteLoading(false);
      setDeleteTarget(null);
    }
  }, [marketComparableId, deleteTarget, removeImageMutation]);

  // Delete permanently handler
  const handleDeletePermanently = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleteLoading(true);
    try {
      await removeGalleryPhotoMutation.mutateAsync({
        appraisalId,
        photoId: deleteTarget.photoId,
      });
      toast.success('Photo deleted permanently');
    } catch {
      toast.error('Failed to delete photo');
    } finally {
      setIsDeleteLoading(false);
      setDeleteTarget(null);
    }
  }, [appraisalId, deleteTarget, removeGalleryPhotoMutation]);

  // Build a lookup from gallery photo ID → GalleryPhotoDtoType
  const galleryPhotoMap = useMemo(() => {
    const map = new Map<string, GalleryPhotoDtoType>();
    if (galleryPhotos?.photos) {
      for (const p of galleryPhotos.photos as GalleryPhotoDtoType[]) {
        map.set(p.id, p);
      }
    }
    return map;
  }, [galleryPhotos]);

  // Preview modal state
  const [previewPhoto, setPreviewPhoto] = useState<PreviewablePhoto | null>(null);

  const buildPreviewable = useCallback(
    (photo: Photo): PreviewablePhoto | null => {
      if (photo.isUploading || !photo.url) return null;
      const dto = galleryPhotoMap.get(photo.id);
      return {
        id: photo.id,
        src: photo.fullSrc || photo.url,
        fileName: photo.fileName,
        caption: dto?.caption,
        isInUse: dto?.isInUse,
        fileExtension: dto?.fileExtension,
        mimeType: dto?.mimeType,
        fileSizeBytes: dto?.fileSizeBytes,
      };
    },
    [galleryPhotoMap],
  );

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

  // Expose linkImagesToComparable for parent to call after creation
  useImperativeHandle(ref, () => ({
    linkImagesToComparable: async (newMarketComparableId: string) => {
      for (let i = 0; i < pendingPhotoIds.length; i++) {
        const galleryPhotoId = pendingPhotoIds[i];
        try {
          await addImageMutation.mutateAsync({
            marketComparableId: newMarketComparableId,
            appraisalId,
            galleryPhotoId,
          });
        } catch {
          toast.error(`Failed to link photo ${i + 1}`);
        }
      }
      setPendingPhotoIds([]);
    },
  }));

  // No-op for thumbnail (not supported for market comparables)
  const handleSetThumbnail = useCallback(() => {}, []);

  return (
    <>
      <PhotoGallery
        photos={photos}
        onAddClick={() => setShowPhotoSourceModal(true)}
        onDelete={handleDeleteRequest}
        onSetThumbnail={handleSetThumbnail}
        onPreview={handlePreview}
        thumbnailId={undefined}
      />

      <PhotoSourceModal
        isOpen={showPhotoSourceModal}
        onClose={() => setShowPhotoSourceModal(false)}
        onUploadFromDevice={handleUploadFromDevice}
        onChooseFromGallery={() => setShowGalleryModal(true)}
      />

      <GallerySelectionModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        onSelect={handleGallerySelect}
        images={availableGalleryImages}
      />

      <PhotoDeleteConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onUnlink={handleUnlink}
        onDeletePermanently={handleDeletePermanently}
        isLoading={isDeleteLoading}
      />

      {previewPhoto && (
        <PhotoPreviewModal
          photo={previewPhoto}
          photos={previewablePhotos}
          onClose={() => setPreviewPhoto(null)}
          onNavigate={setPreviewPhoto}
          onDelete={() => {
            handleDeleteRequest(previewPhoto.id);
            setPreviewPhoto(null);
          }}
          onSaveDescription={async (caption: string) => {
            try {
              const dto = galleryPhotoMap.get(previewPhoto.id);
              await updateGalleryPhoto({
                appraisalId,
                photoId: previewPhoto.id,
                caption: caption || null,
                photoCategory: dto?.photoCategory ?? null,
                latitude: dto?.latitude ?? null,
                longitude: dto?.longitude ?? null,
                capturedAt: dto?.capturedAt ?? null,
              });
              setPreviewPhoto(prev =>
                prev ? { ...prev, caption: caption || null } : null,
              );
              toast.success('Description updated');
            } catch {
              toast.error('Failed to update description');
            }
          }}
          isSavingDescription={isUpdatingDescription}
        />
      )}
    </>
  );
});

MarketComparablePhotoSection.displayName = 'MarketComparablePhotoSection';

export default MarketComparablePhotoSection;
