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
  useLinkPhotoToProperty,
  useRemoveGalleryPhoto,
  useSetPropertyThumbnail,
  useUnlinkPhotoFromProperty,
  useUnsetPropertyThumbnail,
  useUpdateGalleryPhoto,
} from '../api/gallery';
import { useEnrichedPropertyGroups } from '../hooks/useEnrichedPropertyGroups';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import { toGalleryImage } from '../types/gallery';
import type { GalleryImage } from '../types/gallery';
import type { GalleryPhotoDtoType } from '@shared/schemas/v1';

export interface PropertyPhotoSectionRef {
  linkPhotosToProperty: (propertyId: string) => Promise<void>;
}

interface PropertyPhotoSectionProps {
  appraisalId: string;
  propertyId?: string;
  readOnly?: boolean;
}

interface DeleteTarget {
  photoId: string;
  mappingId?: string;
}

const PropertyPhotoSection = forwardRef<PropertyPhotoSectionRef, PropertyPhotoSectionProps>(
  ({ appraisalId, propertyId, readOnly }, ref) => {
    const isCreateMode = !propertyId;

    // Pending photo IDs for create mode (linked after property creation)
    const [pendingPhotoIds, setPendingPhotoIds] = useState<string[]>([]);
    const [localThumbnailId, setLocalThumbnailId] = useState<string | null>(null);

    // Uploading placeholders (shown with spinner overlay while upload is in progress)
    const [uploadingPhotos, setUploadingPhotos] = useState<Photo[]>([]);

    // Modal state
    const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
    const [showGalleryModal, setShowGalleryModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    // Upload session ref (created once per component lifetime)
    const uploadSessionIdRef = useRef<string | null>(null);

    // API hooks
    const { data: galleryPhotos } = useGetGalleryPhotos(appraisalId);
    const addGalleryPhotoMutation = useAddGalleryPhoto();
    const removeGalleryPhotoMutation = useRemoveGalleryPhoto();
    const linkPhotoMutation = useLinkPhotoToProperty();
    const unlinkPhotoMutation = useUnlinkPhotoFromProperty();
    const uploadDocumentMutation = useUploadDocument();
    const setThumbnailMutation = useSetPropertyThumbnail();
    const unsetThumbnailMutation = useUnsetPropertyThumbnail();
    const { mutateAsync: updateGalleryPhoto, isPending: isUpdatingDescription } = useUpdateGalleryPhoto();

    // In edit mode, get the property's linked photos from groups.
    const { groups } = useEnrichedPropertyGroups(isCreateMode ? undefined : appraisalId);

    // Find the matching property item to get photos & thumbnail info
    const matchedPropertyItem = useMemo(() => {
      if (isCreateMode || !propertyId) return null;
      for (const group of groups) {
        for (const item of group.items) {
          if (item.id === propertyId) return item;
        }
      }
      return null;
    }, [isCreateMode, propertyId, groups]);

    const linkedDocumentIds = useMemo(() => {
      if (!matchedPropertyItem?.photos) return new Set<string>();
      return new Set(matchedPropertyItem.photos.map(p => p.documentId));
    }, [matchedPropertyItem]);

    // Map documentId → mappingId for quick lookup (edit mode only)
    const documentToMappingId = useMemo(() => {
      const map = new Map<string, string>();
      if (matchedPropertyItem?.photos) {
        for (const p of matchedPropertyItem.photos) {
          if (p.mappingId) map.set(p.documentId, p.mappingId);
        }
      }
      return map;
    }, [matchedPropertyItem]);

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
          .filter(p => linkedDocumentIds.has(p.documentId))
          .map(p => {
            const img = toGalleryImage(p);
            return {
              id: p.id,
              documentId: img.documentId,
              fileName: img.alt,
              url: img.thumbnailSrc,
              fullSrc: img.src,
              mappingId: documentToMappingId.get(p.documentId),
            };
          });
      }

      return [...resolved, ...uploadingPhotos];
    }, [galleryPhotos, isCreateMode, pendingPhotoIds, linkedDocumentIds, documentToMappingId, uploadingPhotos]);

    // Thumbnail ID
    const thumbnailId = useMemo(() => {
      if (isCreateMode) return localThumbnailId;
      if (!matchedPropertyItem?.photos || photos.length === 0) return null;
      const thumbDoc = matchedPropertyItem.photos.find(p => p.isThumbnail);
      if (thumbDoc) {
        const match = photos.find(p => p.documentId === thumbDoc.documentId);
        if (match) return match.id;
      }
      return photos[0]?.id ?? null;
    }, [isCreateMode, localThumbnailId, matchedPropertyItem, photos]);

    // Sort photos: cover photo first
    const sortedPhotos = useMemo(() => {
      if (!thumbnailId) return photos;
      return [...photos].sort((a, b) => {
        if (a.id === thumbnailId) return -1;
        if (b.id === thumbnailId) return 1;
        return 0;
      });
    }, [photos, thumbnailId]);

    // Gallery images for selection modal (exclude already-linked photos)
    const availableGalleryImages: GalleryImage[] = useMemo(() => {
      if (!galleryPhotos?.photos) return [];
      const allPhotos = galleryPhotos.photos as GalleryPhotoDtoType[];

      // IDs of photos already shown on this property
      const currentPhotoDocIds = new Set(photos.map(p => p.documentId).filter(Boolean));

      return allPhotos
        .filter(p => !currentPhotoDocIds.has(p.documentId))
        .map(toGalleryImage);
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
          } else if (propertyId) {
            await linkPhotoMutation.mutateAsync({
              appraisalId,
              photoId: galleryPhotoId,
              appraisalPropertyId: propertyId,
              photoPurpose: 'property',
              sectionReference: null,
              linkedBy: 'current-user',
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
        propertyId,
        isCreateMode,
        getUploadSessionId,
        uploadDocumentMutation,
        addGalleryPhotoMutation,
        linkPhotoMutation,
      ],
    );

    // PhotoSourceModal: "Upload from Device" handler
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
          } else if (propertyId) {
            try {
              await linkPhotoMutation.mutateAsync({
                appraisalId,
                photoId: image.id,
                appraisalPropertyId: propertyId,
                photoPurpose: 'property',
                sectionReference: null,
                linkedBy: 'current-user',
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
      [appraisalId, propertyId, isCreateMode, linkPhotoMutation],
    );

    // Delete: open confirmation modal
    const handleDeleteRequest = useCallback(
      (photoId: string) => {
        const photo = photos.find(p => p.id === photoId);
        if (isCreateMode) {
          // In create mode, just remove from pending (no unlink needed)
          setPendingPhotoIds(prev => prev.filter(id => id !== photoId));
          if (localThumbnailId === photoId) setLocalThumbnailId(null);
          toast.success('Photo removed');
          return;
        }
        setDeleteTarget({
          photoId,
          mappingId: photo?.mappingId,
        });
      },
      [isCreateMode, localThumbnailId, photos],
    );

    // Unlink handler (edit mode)
    const handleUnlink = useCallback(async () => {
      if (!deleteTarget?.mappingId) {
        toast.error('Cannot unlink: missing mapping ID');
        setDeleteTarget(null);
        return;
      }
      setIsDeleteLoading(true);
      try {
        await unlinkPhotoMutation.mutateAsync({
          appraisalId,
          mappingId: deleteTarget.mappingId,
        });
        toast.success('Photo unlinked from property');
      } catch {
        toast.error('Failed to unlink photo');
      } finally {
        setIsDeleteLoading(false);
        setDeleteTarget(null);
      }
    }, [appraisalId, deleteTarget, unlinkPhotoMutation]);

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

    // Set thumbnail handler
    const handleSetThumbnail = useCallback(
      (photoId: string) => {
        if (isCreateMode) {
          setLocalThumbnailId(prev => (prev === photoId ? null : photoId));
          return;
        }
        if (!propertyId) return;
        const isCurrentThumbnail = thumbnailId === photoId;
        if (isCurrentThumbnail) {
          unsetThumbnailMutation.mutate(
            { appraisalId, propertyId, photoId },
            { onError: () => toast.error('Failed to unset thumbnail') },
          );
        } else {
          setThumbnailMutation.mutate(
            { appraisalId, propertyId, photoId },
            { onError: () => toast.error('Failed to set thumbnail') },
          );
        }
      },
      [isCreateMode, appraisalId, propertyId, thumbnailId, setThumbnailMutation, unsetThumbnailMutation],
    );

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
      () => sortedPhotos.map(buildPreviewable).filter((p): p is PreviewablePhoto => p !== null),
      [sortedPhotos, buildPreviewable],
    );

    // Expose linkPhotosToProperty for parent to call after property creation
    useImperativeHandle(ref, () => ({
      linkPhotosToProperty: async (newPropertyId: string) => {
        for (let i = 0; i < pendingPhotoIds.length; i++) {
          const photoId = pendingPhotoIds[i];
          const isThumbnail = localThumbnailId === photoId;
          try {
            await linkPhotoMutation.mutateAsync({
              appraisalId,
              photoId,
              appraisalPropertyId: newPropertyId,
              photoPurpose: isThumbnail ? 'thumbnail' : 'property',
              sectionReference: null,
              linkedBy: 'current-user',
            });
          } catch {
            toast.error(`Failed to link photo ${i + 1}`);
          }
        }
        setPendingPhotoIds([]);
        setLocalThumbnailId(null);
      },
    }));

    return (
      <>
        <PhotoGallery
          photos={sortedPhotos}
          onAddClick={() => setShowPhotoSourceModal(true)}
          onDelete={handleDeleteRequest}
          onSetThumbnail={handleSetThumbnail}
          onPreview={handlePreview}
          thumbnailId={thumbnailId}
          disabled={readOnly}
        />

        {/* Photo Source Modal (Upload or Gallery) */}
        <PhotoSourceModal
          isOpen={showPhotoSourceModal}
          onClose={() => setShowPhotoSourceModal(false)}
          onUploadFromDevice={handleUploadFromDevice}
          onChooseFromGallery={() => setShowGalleryModal(true)}
        />

        {/* Gallery Selection Modal */}
        <GallerySelectionModal
          isOpen={showGalleryModal}
          onClose={() => setShowGalleryModal(false)}
          onSelect={handleGallerySelect}
          images={availableGalleryImages}
        />

        {/* Delete Confirmation Modal (edit mode only) */}
        <PhotoDeleteConfirmModal
          isOpen={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onUnlink={handleUnlink}
          onDeletePermanently={handleDeletePermanently}
          isLoading={isDeleteLoading}
        />

        {/* Photo Preview Modal */}
        {previewPhoto && (
          <PhotoPreviewModal
            photo={previewPhoto}
            photos={previewablePhotos}
            isThumbnail={thumbnailId === previewPhoto.id}
            onClose={() => setPreviewPhoto(null)}
            onNavigate={setPreviewPhoto}
            onSetThumbnail={() => {
              handleSetThumbnail(previewPhoto.id);
            }}
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
  },
);

PropertyPhotoSection.displayName = 'PropertyPhotoSection';

export default PropertyPhotoSection;
