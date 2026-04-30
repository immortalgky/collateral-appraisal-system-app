import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
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
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import { toGalleryImage } from '../types/gallery';
import type { GalleryImage } from '../types/gallery';
import type { GalleryPhotoDtoType } from '@shared/schemas/v1';

export interface EntityPhotoSectionRef {
  linkImagesToEntity: (entityId: string) => Promise<void>;
}

export interface EntityImageItem {
  id?: string;
  galleryPhotoId?: string;
  title?: string | null;
  description?: string | null;
  isThumbnail?: boolean;
}

type ThumbnailMutationVars = { entityId: string; imageId: string; appraisalId: string };

export interface EntityPhotoSectionProps {
  appraisalId: string;
  entityId?: string;
  images?: EntityImageItem[];
  useAddImage: () => UseMutationResult<
    { id: string },
    unknown,
    { entityId: string; appraisalId: string; galleryPhotoId: string }
  >;
  useRemoveImage: () => UseMutationResult<
    unknown,
    unknown,
    { entityId: string; imageId: string; appraisalId: string }
  >;
  useSetThumbnail?: () => UseMutationResult<unknown, unknown, ThumbnailMutationVars>;
  useUnsetThumbnail?: () => UseMutationResult<unknown, unknown, ThumbnailMutationVars>;
}

interface DeleteTarget {
  photoId: string;
  imageId?: string;
}

/**
 * Stable no-op hook used as the fallback when `useSetThumbnail` / `useUnsetThumbnail`
 * are not provided by the caller.
 *
 * IMPORTANT — hook-identity constraint:
 * The `useSetThumbnail` and `useUnsetThumbnail` props passed to `EntityPhotoSection`
 * **must be stable, module-level hook references** (e.g. `useSetProjectModelImageThumbnail`
 * imported directly from an API module). They must NOT be arrow functions defined
 * inside a render or wrapped in useCallback — doing so creates a new function reference
 * on every render, which causes React to call a different hook each render and triggers
 * the rules-of-hooks lint suppression to become load-bearing in the wrong way.
 *
 * Must be defined at module level so React's hook call count is stable across renders.
 */
function useNoOpMutation(): UseMutationResult<unknown, unknown, ThumbnailMutationVars> {
  return useMutation({
    mutationFn: async (_vars: ThumbnailMutationVars) => undefined,
  });
}

const EntityPhotoSection = forwardRef<EntityPhotoSectionRef, EntityPhotoSectionProps>(
  (
    {
      appraisalId,
      entityId,
      images,
      useAddImage,
      useRemoveImage,
      useSetThumbnail,
      useUnsetThumbnail,
    },
    ref,
  ) => {
    const isCreateMode = !entityId;
    const hasThumbnailSupport = Boolean(useSetThumbnail && useUnsetThumbnail);

    const [pendingPhotoIds, setPendingPhotoIds] = useState<string[]>([]);
    const [uploadingPhotos, setUploadingPhotos] = useState<Photo[]>([]);

    const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
    const [showGalleryModal, setShowGalleryModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const uploadSessionIdRef = useRef<string | null>(null);

    const { data: galleryPhotos } = useGetGalleryPhotos(appraisalId);
    const addGalleryPhotoMutation = useAddGalleryPhoto();
    const removeGalleryPhotoMutation = useRemoveGalleryPhoto();
    const addImageMutation = useAddImage();
    const removeImageMutation = useRemoveImage();
    // Always call both hooks unconditionally (Rules of Hooks).
    // useSetThumbnail/useUnsetThumbnail may be the no-op fallback when not provided.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const setThumbnailMutation = (useSetThumbnail ?? useNoOpMutation)();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const unsetThumbnailMutation = (useUnsetThumbnail ?? useNoOpMutation)();
    const uploadDocumentMutation = useUploadDocument();
    const { mutateAsync: updateGalleryPhoto, isPending: isUpdatingDescription } =
      useUpdateGalleryPhoto();

    // Map galleryPhotoId → entity image ID
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

    // Gallery photo ID of the current thumbnail (for ring highlight and cover badge)
    const thumbnailGalleryPhotoId = useMemo(() => {
      if (!images) return undefined;
      const thumbnailImg = images.find(i => i.isThumbnail);
      return thumbnailImg?.galleryPhotoId ?? undefined;
    }, [images]);

    const linkedGalleryPhotoIds = useMemo(() => {
      if (!images) return new Set<string>();
      return new Set(images.map(img => img.galleryPhotoId).filter(Boolean) as string[]);
    }, [images]);

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
    }, [
      galleryPhotos,
      isCreateMode,
      pendingPhotoIds,
      linkedGalleryPhotoIds,
      galleryPhotoToImageId,
      uploadingPhotos,
    ]);

    const availableGalleryImages: GalleryImage[] = useMemo(() => {
      if (!galleryPhotos?.photos) return [];
      const allPhotos = galleryPhotos.photos as GalleryPhotoDtoType[];
      const currentPhotoIds = new Set(photos.map(p => p.id));
      return allPhotos.filter(p => !currentPhotoIds.has(p.id)).map(toGalleryImage);
    }, [galleryPhotos, photos]);

    const getUploadSessionId = useCallback(async () => {
      if (!uploadSessionIdRef.current) {
        const session = await createUploadSession();
        uploadSessionIdRef.current = session.sessionId;
      }
      return uploadSessionIdRef.current;
    }, []);

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
          } else if (entityId) {
            await addImageMutation.mutateAsync({
              entityId,
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
        entityId,
        isCreateMode,
        getUploadSessionId,
        uploadDocumentMutation,
        addGalleryPhotoMutation,
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

    const handleGallerySelect = useCallback(
      async (selectedImages: GalleryImage[]) => {
        for (const image of selectedImages) {
          if (isCreateMode) {
            setPendingPhotoIds(prev => [...prev, image.id]);
          } else if (entityId) {
            try {
              await addImageMutation.mutateAsync({
                entityId,
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
      [entityId, isCreateMode, addImageMutation, appraisalId],
    );

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

    const handleUnlink = useCallback(async () => {
      if (!deleteTarget?.imageId || !entityId) {
        toast.error('Cannot unlink: missing image ID');
        setDeleteTarget(null);
        return;
      }
      setIsDeleteLoading(true);
      try {
        await removeImageMutation.mutateAsync({
          entityId,
          imageId: deleteTarget.imageId,
          appraisalId,
        });
        toast.success('Photo removed');
      } catch {
        toast.error('Failed to remove photo');
      } finally {
        setIsDeleteLoading(false);
        setDeleteTarget(null);
      }
    }, [entityId, deleteTarget, removeImageMutation, appraisalId]);

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

    const galleryPhotoMap = useMemo(() => {
      const map = new Map<string, GalleryPhotoDtoType>();
      if (galleryPhotos?.photos) {
        for (const p of galleryPhotos.photos as GalleryPhotoDtoType[]) {
          map.set(p.id, p);
        }
      }
      return map;
    }, [galleryPhotos]);

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

    // Set / unset thumbnail — only functional in edit mode with thumbnail hooks provided
    const handleSetThumbnail = useCallback(
      (galleryPhotoId: string) => {
        if (isCreateMode || !entityId || !hasThumbnailSupport) return;

        const imageId = galleryPhotoToImageId.get(galleryPhotoId);
        if (!imageId) return;

        if (thumbnailGalleryPhotoId === galleryPhotoId) {
          // Currently thumbnail — unset it
          unsetThumbnailMutation.mutate(
            { entityId, imageId, appraisalId },
            { onError: () => toast.error('Failed to remove cover photo') },
          );
        } else {
          setThumbnailMutation.mutate(
            { entityId, imageId, appraisalId },
            { onError: () => toast.error('Failed to set cover photo') },
          );
        }
      },
      [
        isCreateMode,
        entityId,
        hasThumbnailSupport,
        galleryPhotoToImageId,
        thumbnailGalleryPhotoId,
        setThumbnailMutation,
        unsetThumbnailMutation,
        appraisalId,
      ],
    );

    const handlePreviewSetThumbnail = useCallback(() => {
      if (!previewPhoto) return;
      handleSetThumbnail(previewPhoto.id);
    }, [previewPhoto, handleSetThumbnail]);

    useImperativeHandle(ref, () => ({
      linkImagesToEntity: async (newEntityId: string) => {
        for (let i = 0; i < pendingPhotoIds.length; i++) {
          const galleryPhotoId = pendingPhotoIds[i];
          try {
            await addImageMutation.mutateAsync({
              entityId: newEntityId,
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

    return (
      <>
        <PhotoGallery
          photos={photos}
          onAddClick={() => setShowPhotoSourceModal(true)}
          onDelete={handleDeleteRequest}
          onSetThumbnail={hasThumbnailSupport ? handleSetThumbnail : () => {}}
          onPreview={handlePreview}
          thumbnailId={thumbnailGalleryPhotoId}
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
            isThumbnail={thumbnailGalleryPhotoId === previewPhoto.id}
            onClose={() => setPreviewPhoto(null)}
            onNavigate={setPreviewPhoto}
            onSetThumbnail={
              hasThumbnailSupport && !isCreateMode ? handlePreviewSetThumbnail : undefined
            }
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
                setPreviewPhoto(prev => (prev ? { ...prev, caption: caption || null } : null));
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
  },
);

EntityPhotoSection.displayName = 'EntityPhotoSection';

export default EntityPhotoSection;
