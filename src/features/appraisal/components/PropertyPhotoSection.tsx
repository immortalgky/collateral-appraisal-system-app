import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import PhotoGallery, { type Photo } from './PhotoGallery';
import PhotoPreviewModal, { type PreviewablePhoto } from './PhotoPreviewModal';
import {
  useAddGalleryPhoto,
  useGetGalleryPhotos,
  useLinkPhotoToProperty,
  useRemoveGalleryPhoto,
  useSetPropertyThumbnail,
  useUnsetPropertyThumbnail,
} from '../api/gallery';
import { useEnrichedPropertyGroups } from '../hooks/useEnrichedPropertyGroups';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import { toGalleryImage } from '../types/gallery';
import type { GalleryPhotoDtoType } from '@shared/schemas/v1';

export interface PropertyPhotoSectionRef {
  linkPhotosToProperty: (propertyId: string) => Promise<void>;
}

interface PropertyPhotoSectionProps {
  appraisalId: string;
  propertyId?: string;
}

const PropertyPhotoSection = forwardRef<PropertyPhotoSectionRef, PropertyPhotoSectionProps>(
  ({ appraisalId, propertyId }, ref) => {
    const isCreateMode = !propertyId;

    // Pending photo IDs for create mode (linked after property creation)
    const [pendingPhotoIds, setPendingPhotoIds] = useState<string[]>([]);
    const [localThumbnailId, setLocalThumbnailId] = useState<string | null>(null);

    // Uploading placeholders (shown with spinner overlay while upload is in progress)
    const [uploadingPhotos, setUploadingPhotos] = useState<Photo[]>([]);

    // Upload session ref (created once per component lifetime)
    const uploadSessionIdRef = useRef<string | null>(null);

    // API hooks
    const { data: galleryPhotos } = useGetGalleryPhotos(appraisalId);
    const addGalleryPhotoMutation = useAddGalleryPhoto();
    const removeGalleryPhotoMutation = useRemoveGalleryPhoto();
    const linkPhotoMutation = useLinkPhotoToProperty();
    const uploadDocumentMutation = useUploadDocument();
    const setThumbnailMutation = useSetPropertyThumbnail();
    const unsetThumbnailMutation = useUnsetPropertyThumbnail();

    // In edit mode, get the property's linked photos from groups.
    // Pass undefined in create mode to skip all queries (matchedPropertyItem is always null anyway).
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

    // Build photo list for PhotoGallery
    const photos: Photo[] = useMemo(() => {
      if (!galleryPhotos?.photos) return [...uploadingPhotos];

      const allPhotos = galleryPhotos.photos as GalleryPhotoDtoType[];

      let resolved: Photo[];
      if (isCreateMode) {
        // Show only photos uploaded in this session (pending)
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
        // Edit mode: show photos whose documentId is linked to this property
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
            };
          });
      }

      // Append any in-progress uploads as placeholder items
      return [...resolved, ...uploadingPhotos];
    }, [galleryPhotos, isCreateMode, pendingPhotoIds, linkedDocumentIds, uploadingPhotos]);

    // Thumbnail ID — in edit mode, find the photo marked as thumbnail from the property's photos
    const thumbnailId = useMemo(() => {
      if (isCreateMode) return localThumbnailId;
      if (!matchedPropertyItem?.photos || photos.length === 0) return null;
      const thumbDoc = matchedPropertyItem.photos.find(p => p.isThumbnail);
      if (thumbDoc) {
        // Find the gallery photo whose documentId matches
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

    // Get or create upload session
    const getUploadSessionId = useCallback(async () => {
      if (!uploadSessionIdRef.current) {
        const session = await createUploadSession();
        uploadSessionIdRef.current = session.sessionId;
      }
      return uploadSessionIdRef.current;
    }, []);

    // Upload handler
    const handleUpload = useCallback(
      async (file: File) => {
        // Add a placeholder with local preview while uploading
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

          // Step 1: Upload file to get documentId
          const uploadResult = await uploadDocumentMutation.mutateAsync({
            uploadSessionId: sessionId,
            file,
            documentType: 'PHOTO',
            documentCategory: 'prop_photo',
          });

          const documentId = uploadResult.documentId;

          // Step 2: Add to gallery
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
          });

          const galleryPhotoId = galleryResult.id;

          if (isCreateMode) {
            // Store for later linking
            setPendingPhotoIds(prev => [...prev, galleryPhotoId]);
          } else if (propertyId) {
            // Link immediately in edit mode
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
          // Remove the placeholder
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

    // Delete handler
    const handleDelete = useCallback(
      async (photoId: string) => {
        try {
          await removeGalleryPhotoMutation.mutateAsync({
            appraisalId,
            photoId,
          });
          if (isCreateMode) {
            setPendingPhotoIds(prev => prev.filter(id => id !== photoId));
            if (localThumbnailId === photoId) setLocalThumbnailId(null);
          }
          toast.success('Photo deleted successfully');
        } catch {
          toast.error('Failed to delete photo');
        }
      },
      [appraisalId, isCreateMode, localThumbnailId, removeGalleryPhotoMutation],
    );

    // Set thumbnail handler
    const handleSetThumbnail = useCallback(
      (photoId: string) => {
        if (isCreateMode) {
          setLocalThumbnailId(prev => (prev === photoId ? null : photoId));
          return;
        }
        // Edit mode: call set/unset thumbnail API
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
      [isCreateMode, appraisalId, thumbnailId, setThumbnailMutation, unsetThumbnailMutation],
    );

    // Preview modal state
    const [previewPhoto, setPreviewPhoto] = useState<PreviewablePhoto | null>(null);

    const handlePreview = useCallback((photo: Photo) => {
      if (!photo.isUploading && photo.url) {
        setPreviewPhoto({
          id: photo.id,
          src: photo.fullSrc || photo.url,
          fileName: photo.fileName,
        });
      }
    }, []);

    const previewablePhotos: PreviewablePhoto[] = useMemo(
      () =>
        sortedPhotos
          .filter(p => !p.isUploading && p.url)
          .map(p => ({ id: p.id, src: p.fullSrc || p.url!, fileName: p.fileName })),
      [sortedPhotos],
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
        // Clear pending state
        setPendingPhotoIds([]);
        setLocalThumbnailId(null);
      },
    }));

    return (
      <>
        <PhotoGallery
          photos={sortedPhotos}
          onUpload={handleUpload}
          onDelete={handleDelete}
          onSetThumbnail={handleSetThumbnail}
          onPreview={handlePreview}
          thumbnailId={thumbnailId}
        />

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
              handleDelete(previewPhoto.id);
              setPreviewPhoto(null);
            }}
          />
        )}
      </>
    );
  },
);

PropertyPhotoSection.displayName = 'PropertyPhotoSection';

export default PropertyPhotoSection;
