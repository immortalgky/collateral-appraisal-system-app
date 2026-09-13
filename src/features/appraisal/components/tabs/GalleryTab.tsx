import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { SegmentedControl } from '@shared/components/SegmentedControl';
import { useUIStore } from '@shared/store';
import type { GallerySort } from '@shared/types';
import { PhotoGridView, PhotoListView } from '../gallery';
import PhotoPreviewModal from '../PhotoPreviewModal';
import type { GalleryImage } from '../../types/gallery';
import { toGalleryImage } from '../../types/gallery';
import {
  useGetGalleryPhotos,
  useAddGalleryPhoto,
  useRemoveGalleryPhoto,
  useLinkPhotoToProperty,
  useUpdateGalleryPhoto,
} from '../../api/gallery';
import { useAssignPhotoToTopic, useGetPhotoTopics } from '../../api/photo';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import { useEnrichedPropertyGroups } from '../../hooks/useEnrichedPropertyGroups';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import PhotoEditModal from '../gallery/PhotoEditModal';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAuthStore } from '@features/auth/store';
import type { PhotoTopicDtoType } from '@shared/schemas/v1';

type FilterStatus = 'all' | 'used' | 'unused';

/** The photo types the gallery groups by, in the order the report reads them. */
const TYPE_ORDER = ['property', 'general', 'law_regulation'] as const;
type TypeKey = (typeof TYPE_ORDER)[number] | 'other';
const typeKeyOf = (photoType: string): TypeKey =>
  (TYPE_ORDER as readonly string[]).includes(photoType) ? (photoType as TypeKey) : 'other';

const LOCALES: Record<string, string> = { th: 'th-TH', zh: 'zh-CN', en: 'en-GB' };

// Bulk Action Toolbar Component
const BulkActionToolbar = ({
  selectedCount,
  topics,
  onAddToTopic,
  onDelete,
  onLinkToProperty,
  onDeselect,
}: {
  selectedCount: number;
  topics: PhotoTopicDtoType[];
  onAddToTopic: (topic: PhotoTopicDtoType) => void;
  onDelete: () => void;
  onLinkToProperty: () => void;
  onDeselect: () => void;
}) => {
  const { t } = useTranslation('appraisal');
  const action =
    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/10';
  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-xl bg-gray-900 py-1.5 pl-4 pr-1.5 text-white shadow-xl">
        <span className="mr-2 text-sm font-medium tabular-nums">
          {t('gallery.bulk.selected', { n: selectedCount })}
        </span>
        {/* Arranging the report's photos starts here as often as on the Photos tab — picking
            them out of the whole gallery is easier than picking them out of a modal. */}
        <Menu as="div" className="relative">
          <MenuButton className={action}>
            <Icon name="layer-group" style="solid" className="text-xs" />
            {t('gallery.bulk.addToTopic')}
            <Icon name="chevron-up" style="solid" className="text-[9px] opacity-70" />
          </MenuButton>
          <MenuItems
            anchor={{ to: 'top start', gap: 8 }}
            className="z-50 w-60 rounded-md bg-white py-1 text-gray-700 shadow-lg ring-1 ring-black/5 focus:outline-none"
          >
            {topics.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400">{t('gallery.bulk.noTopics')}</div>
            ) : (
              topics.map(topic => (
                <MenuItem key={topic.id}>
                  {({ focus }) => (
                    <button
                      type="button"
                      onClick={() => onAddToTopic(topic)}
                      className={clsx(
                        'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm',
                        focus && 'bg-gray-50',
                      )}
                    >
                      <span className="truncate">{topic.topicName}</span>
                      <span className="shrink-0 text-xs tabular-nums text-gray-400">
                        {topic.photoCount}
                      </span>
                    </button>
                  )}
                </MenuItem>
              ))
            )}
          </MenuItems>
        </Menu>
        <button type="button" onClick={onLinkToProperty} className={action}>
          <Icon name="link" className="text-xs" />
          {t('gallery.bulk.linkToProperty')}
        </button>
        <button type="button" onClick={onDelete} className={clsx(action, 'text-red-300')}>
          <Icon name="trash" className="text-xs" />
          {t('gallery.bulk.delete')}
        </button>
        <button
          type="button"
          onClick={onDeselect}
          aria-label={t('gallery.bulk.clear')}
          className="rounded-lg p-2 transition-colors hover:bg-white/10"
        >
          <Icon name="xmark" className="text-sm" />
        </button>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyGalleryState = ({ onUpload }: { onUpload: () => void }) => {
  const { t } = useTranslation('appraisal');
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-14">
      <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-gray-100">
        <Icon name="image" className="text-2xl text-gray-400" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-gray-700">{t('gallery.empty.title')}</h3>
      <p className="mb-5 max-w-sm text-center text-xs text-gray-500">{t('gallery.empty.hint')}</p>
      <Button variant="primary" size="sm" onClick={onUpload}>
        <Icon name="cloud-arrow-up" className="mr-2" />
        {t('gallery.upload')}
      </Button>
    </div>
  );
};

// Link to Property Modal
const LinkToPropertyModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  properties,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (propertyId: string) => void;
  isLoading: boolean;
  properties: {
    id: string;
    detailId?: string;
    type: string;
    address: string;
    area: string;
    image?: string;
  }[];
}) => {
  const { t } = useTranslation('appraisal');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const selected = properties.find(p => p.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label={t('gallery.cancel')}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{t('gallery.link.title')}</h3>
          <p className="text-sm text-gray-500 mt-1">{t('gallery.link.hint')}</p>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          {properties.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="building" className="text-2xl text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">{t('gallery.link.none')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {properties.map(property => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => setSelectedId(property.id)}
                  className={clsx(
                    'w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3',
                    selectedId === property.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
                  )}
                >
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {property.image ? (
                      <img
                        src={property.image}
                        alt={property.address}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="image" className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {property.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{property.address}</p>
                    <p className="text-xs text-gray-500">{property.area}</p>
                  </div>
                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      selectedId === property.id ? 'bg-primary border-primary' : 'border-gray-300',
                    )}
                  >
                    {selectedId === property.id && (
                      <Icon name="check" style="solid" className="text-[8px] text-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('gallery.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (selected) {
                onConfirm(selected.id);
              }
            }}
            disabled={!selectedId || isLoading}
            isLoading={isLoading}
          >
            <Icon name="link" className="mr-2" />
            {t('gallery.link.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Every photo on the appraisal.
 *
 * One toolbar where there used to be three rows — statistics cards, a search row and a filter
 * row — before the first photo. The filter carries the counts the cards used to show. Photos group
 * by their type (property / general / law) or lie in one grid as before, in the same three sort
 * orders as before; the choice is remembered with the rest of the UI preferences.
 */
export const GalleryTab = () => {
  const readOnly = usePageReadOnly();
  const { t, i18n } = useTranslation('appraisal');
  const appraisalId = useAppraisalId();
  const currentUser = useAuthStore(state => state.user);
  const { data: galleryData, isLoading } = useGetGalleryPhotos(appraisalId);
  const galleryPrefs = useUIStore(s => s.galleryPrefs);
  const setGalleryPrefs = useUIStore(s => s.setGalleryPrefs);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [uploadingPhotos, setUploadingPhotos] = useState<
    Map<string, { file: File; progress: number }>
  >(new Map());
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; photoId: string | null }>({
    isOpen: false,
    photoId: null,
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [linkToPropertyOpen, setLinkToPropertyOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  // API hooks
  const { mutateAsync: uploadDocument } = useUploadDocument();
  const { mutateAsync: addGalleryPhoto } = useAddGalleryPhoto();
  const {
    mutate: removeGalleryPhoto,
    mutateAsync: removeGalleryPhotoAsync,
    isPending: isDeleting,
  } = useRemoveGalleryPhoto();
  const { mutateAsync: linkPhotoToProperty, isPending: isLinking } = useLinkPhotoToProperty();
  const { mutateAsync: updateGalleryPhoto, isPending: isUpdating } = useUpdateGalleryPhoto();
  const { mutateAsync: assignPhotoToTopic } = useAssignPhotoToTopic();
  const { groups } = useEnrichedPropertyGroups(appraisalId);
  const { data: topicsData } = useGetPhotoTopics(appraisalId);
  const topics = useMemo(
    () => [...(topicsData?.topics ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [topicsData],
  );

  /**
   * Get or create an upload session for photo uploads.
   * Ensures only one session is created per page load.
   */
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

  // Map API photos to UI model
  const allImages: GalleryImage[] = useMemo(
    () => (galleryData?.photos ?? []).map(toGalleryImage),
    [galleryData],
  );

  /** Topics each photo already belongs to — adding to one more must not drop the others. */
  const topicIdsByPhoto = useMemo(
    () => new Map((galleryData?.photos ?? []).map(p => [p.id, p.photoTopicIds ?? []])),
    [galleryData],
  );

  // Filter and sort images
  const filteredImages = useMemo(() => {
    let result = [...allImages];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        img =>
          img.fileName?.toLowerCase().includes(query) ||
          img.description?.toLowerCase().includes(query) ||
          img.caption?.toLowerCase().includes(query),
      );
    }

    // Filter by status
    if (filterStatus === 'used') {
      result = result.filter(img => img.isInUse);
    } else if (filterStatus === 'unused') {
      result = result.filter(img => !img.isInUse);
    }

    // Sort
    switch (galleryPrefs.sort) {
      case 'newest':
        result.sort((a, b) => (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0));
        break;
      case 'oldest':
        result.sort((a, b) => (a.uploadedAt?.getTime() || 0) - (b.uploadedAt?.getTime() || 0));
        break;
      case 'name':
        result.sort((a, b) => (a.fileName || '').localeCompare(b.fileName || ''));
        break;
    }

    return result;
  }, [allImages, searchQuery, filterStatus, galleryPrefs.sort]);

  /** One section per photo type, or a single untitled one when laid out together. */
  const sections = useMemo(() => {
    if (galleryPrefs.group === 'flat') {
      return [{ key: 'all' as const, images: filteredImages }];
    }
    const byType = new Map<TypeKey, GalleryImage[]>();
    for (const img of filteredImages) {
      const key = typeKeyOf(img.photoType);
      byType.set(key, [...(byType.get(key) ?? []), img]);
    }
    return [...TYPE_ORDER, 'other' as const]
      .filter(key => byType.has(key))
      .map(key => ({ key, images: byType.get(key) ?? [] }));
  }, [filteredImages, galleryPrefs.group]);

  // Statistics
  const stats = useMemo(
    () => ({
      total: allImages.length,
      used: allImages.filter(img => img.isInUse).length,
      unused: allImages.filter(img => !img.isInUse).length,
    }),
    [allImages],
  );

  /** The line under each caption: whatever the list is sorted by, so the order explains itself. */
  const locale = LOCALES[i18n.resolvedLanguage ?? 'th'] ?? 'th-TH';
  const metaText = useCallback(
    (image: GalleryImage): string | null => {
      if (galleryPrefs.sort === 'name') return image.fileName ?? null;
      if (!image.uploadedAt) return null;
      return `${image.uploadedAt.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} ${image.uploadedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
    },
    [galleryPrefs.sort, locale],
  );

  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleNavigate = (image: GalleryImage) => {
    setSelectedImage(image);
  };

  const handleImageDelete = (image: GalleryImage) => {
    setDeleteConfirm({ isOpen: true, photoId: image.id });
  };

  const confirmSingleDelete = () => {
    if (!deleteConfirm.photoId || !appraisalId) return;

    removeGalleryPhoto(
      { appraisalId, photoId: deleteConfirm.photoId },
      {
        onSuccess: () => {
          toast.success(t('gallery.toasts.deleted'));
          setDeleteConfirm({ isOpen: false, photoId: null });
        },
        onError: () => {
          toast.error(t('gallery.toasts.deleteFailed'));
        },
      },
    );
  };

  const handleImageEdit = (image: GalleryImage) => {
    setEditingImage(image);
  };

  const handleEditSave = async (data: { caption: string }) => {
    if (!editingImage || !appraisalId) return;
    try {
      await updateGalleryPhoto({
        appraisalId,
        photoId: editingImage.id,
        caption: data.caption || null,
        photoCategory: editingImage.photoCategory,
        latitude: editingImage.latitude,
        longitude: editingImage.longitude,
        capturedAt: editingImage.capturedAt,
      });
      toast.success(t('gallery.toasts.updated'));
      setEditingImage(null);
    } catch {
      toast.error(t('gallery.toasts.updateFailed'));
    }
  };

  const handleBulkDelete = () => {
    if (selectedImageIds.size === 0) return;
    setBulkDeleteConfirm(true);
  };

  /**
   * Deletes every selected photo, then reports once and closes the dialog.
   *
   * mutateAsync, not mutate: when several mutate() calls are in flight, TanStack Query runs the
   * per-call callbacks of the last one only. The old version counted completions in those
   * callbacks, so with three photos it counted one, never reached three, and left the dialog open
   * after the photos were already gone.
   */
  const confirmBulkDelete = async () => {
    if (!appraisalId) return;
    const ids = Array.from(selectedImageIds);
    const results = await Promise.allSettled(
      ids.map(photoId => removeGalleryPhotoAsync({ appraisalId, photoId })),
    );
    const deleted = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - deleted;
    if (failed === 0) {
      toast.success(t('toasts.galleryPhotoDeletedCount', { count: deleted }));
    } else {
      toast.error(t('toasts.galleryPhotoDeletedPartial', { deleted, failed }));
    }
    setSelectedImageIds(new Set());
    setBulkDeleteConfirm(false);
  };

  /**
   * Adds the selected photos to a topic, keeping whatever topics they were already in — adding
   * is not moving. Photos already in the topic are counted and left alone.
   */
  const handleAddToTopic = async (topic: PhotoTopicDtoType) => {
    if (!appraisalId) return;
    let added = 0;
    for (const photoId of selectedImageIds) {
      const current = topicIdsByPhoto.get(photoId) ?? [];
      if (current.includes(topic.id)) {
        added++;
        continue;
      }
      try {
        await assignPhotoToTopic({ appraisalId, photoId, photoTopicIds: [...current, topic.id] });
        added++;
      } catch {
        toast.error(t('toasts.photoAssignFailed'));
      }
    }
    if (added > 0) {
      toast.success(t('gallery.toasts.addedToTopic', { n: added, topic: topic.topicName }));
    }
    setSelectedImageIds(new Set());
  };

  // Flatten properties from groups for the link-to-property modal
  const allProperties = useMemo(
    () =>
      groups.flatMap(group =>
        group.items.map(item => ({
          id: item.id,
          detailId: item.detailId,
          type: item.type,
          address: item.address,
          area: item.area,
          image: item.image,
        })),
      ),
    [groups],
  );

  const handleBulkLinkToProperty = () => {
    if (selectedImageIds.size === 0) {
      toast.error(t('toasts.galleryPhotoSelectFirst'));
      return;
    }
    setLinkToPropertyOpen(true);
  };

  /** Links every selected photo to the property — same all-settled shape as the bulk delete. */
  const confirmLinkToProperty = async (propertyId: string) => {
    if (!appraisalId) return;
    const ids = Array.from(selectedImageIds);
    const results = await Promise.allSettled(
      ids.map(photoId =>
        linkPhotoToProperty({
          appraisalId,
          photoId,
          appraisalPropertyId: propertyId,
          photoPurpose: 'thumbnail',
          sectionReference: null,
          linkedBy: currentUser?.username ?? '',
        }),
      ),
    );
    const linked = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - linked;
    if (failed === 0) {
      toast.success(t('toasts.photosLinkedToProperty', { count: linked }));
    } else {
      toast.error(t('toasts.photosLinkedPartial', { success: linked, failed }));
    }
    setSelectedImageIds(new Set());
    setLinkToPropertyOpen(false);
  };

  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);
  const onDropFilesRef = useRef<(files: File[]) => void>(() => {});

  // Native drag events on the drop zone — avoids React re-render flickering
  useEffect(() => {
    const el = dropZoneRef.current;
    if (!el) return;

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (readOnly) return;
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        setIsDragging(true);
      }
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (readOnly) return;
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      if (readOnly) return;
      dragCounterRef.current = 0;
      setIsDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) {
        onDropFilesRef.current(files);
      }
    };

    el.addEventListener('dragenter', onDragEnter);
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);

    return () => {
      el.removeEventListener('dragenter', onDragEnter);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, []);

  /**
   * Upload a single file using the three-step pipeline:
   * 1. Get/create upload session
   * 2. Upload document via useUploadDocument
   * 3. Register in gallery via useAddGalleryPhoto
   */
  const uploadSingleFile = useCallback(
    async (file: File) => {
      if (!/\.(jpg|jpeg|png)$/i.test(file.name)) {
        toast.error(t('toasts.photoUnsupportedFormatGallery', { name: file.name }));
        return;
      }

      if (!appraisalId) return;

      const tempId = `uploading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setUploadingPhotos(prev => new Map(prev).set(tempId, { file, progress: 0 }));

      try {
        // Step 1: Get or create upload session
        const sessionId = await getOrCreateSession();

        // Step 2: Upload the document
        const uploadResult = await uploadDocument({
          uploadSessionId: sessionId,
          file,
          documentType: 'GAL_PHOTO',
          documentCategory: 'gallery',
        });

        // Step 3: Register in gallery
        await addGalleryPhoto({
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
          fileName: uploadResult.fileName,
          filePath: uploadResult.storageUrl,
          fileExtension: file.name.includes('.') ? (file.name.split('.').pop() ?? null) : null,
          mimeType: file.type || null,
          fileSizeBytes: uploadResult.fileSize,
          uploadedByName: currentUser?.name ?? null,
        });

        setUploadingPhotos(prev => {
          const next = new Map(prev);
          next.delete(tempId);
          return next;
        });
        toast.success(t('toasts.uploadedFile', { name: file.name }));
      } catch {
        setUploadingPhotos(prev => {
          const next = new Map(prev);
          next.delete(tempId);
          return next;
        });
        toast.error(t('toasts.uploadFileFailed', { name: file.name }));
      }
    },
    [appraisalId, getOrCreateSession, uploadDocument, addGalleryPhoto, currentUser],
  );

  // Keep the ref in sync so the native drop handler can call uploadSingleFile
  onDropFilesRef.current = async (files: File[]) => {
    toast.success(t('toasts.uploading', { count: files.length }));
    for (const file of files) {
      await uploadSingleFile(file);
    }
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      toast.success(t('toasts.uploading', { count: fileArray.length }));
      for (const file of fileArray) {
        await uploadSingleFile(file);
      }

      // Reset input
      e.target.value = '';
    },
    [uploadSingleFile],
  );

  const handleSelectAll = () => {
    if (selectedImageIds.size === filteredImages.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(filteredImages.map(img => img.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Icon name="spinner" style="solid" className="text-2xl text-primary animate-spin" />
      </div>
    );
  }

  const allSelected = selectedImageIds.size === filteredImages.length && filteredImages.length > 0;
  const uploadTile = readOnly ? undefined : (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      className="flex aspect-[4/3] flex-col items-center justify-center gap-0.5 rounded-lg border-[1.5px] border-dashed border-gray-300 px-2 text-center text-[11px] text-gray-400 transition-colors hover:border-primary/50 hover:bg-primary-50/40"
    >
      <span className="text-xs font-semibold text-primary-700">
        + {t('gallery.uploadTile.title')}
      </span>
      {t('gallery.uploadTile.hint')}
    </button>
  );

  return (
    <div ref={dropZoneRef} className="relative flex flex-col gap-3">
      {/* Both toolbar rows stay pinned while the photos scroll under them — filtering and
          uploading are reached for from anywhere down a long gallery. Sticky rather than a
          nested scroll box, so the page keeps its one scrollbar. */}
      <div className="sticky top-0 z-20 flex flex-col gap-3 bg-white pb-2">
        {/* Toolbar: title, filter-with-counts, search, upload */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{t('gallery.sectionTitle')}</h3>
            <p className="text-xs text-gray-500">
              {t('gallery.summary', { total: stats.total, used: stats.used })}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <SegmentedControl
              options={[
                {
                  value: 'all',
                  label: `${t('gallery.filters.all')} ${stats.total}`,
                  icon: 'images',
                },
                {
                  value: 'used',
                  label: `${t('gallery.filters.used')} ${stats.used}`,
                  icon: 'check',
                },
                {
                  value: 'unused',
                  label: `${t('gallery.filters.unused')} ${stats.unused}`,
                  icon: 'clock',
                },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
            />
            <div className="relative">
              <Icon
                name="magnifying-glass"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('gallery.searchPlaceholder')}
                className="w-56 rounded-lg border border-gray-200 bg-white py-1.5 pl-7 pr-7 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('gallery.noResults.clear')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Icon name="xmark" className="text-[11px]" />
                </button>
              )}
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
              >
                <Icon name="cloud-arrow-up" className="text-[11px]" />
                {t('gallery.upload')}
              </button>
            )}
            {!readOnly && (
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            )}
          </div>
        </div>

        {/* Arrangement: group or not, sort order, select all, grid or list */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>{t('gallery.layout.label')}</span>
          <SegmentedControl
            options={[
              { value: 'type', label: t('gallery.layout.type'), icon: 'layer-group' },
              { value: 'flat', label: t('gallery.layout.flat'), icon: 'table-cells' },
            ]}
            value={galleryPrefs.group}
            onChange={group => setGalleryPrefs({ group })}
          />
          <span className="ml-2">{t('gallery.sort.label')}</span>
          <select
            value={galleryPrefs.sort}
            onChange={e => setGalleryPrefs({ sort: e.target.value as GallerySort })}
            aria-label={t('gallery.sort.label')}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="newest">{t('gallery.sort.newest')}</option>
            <option value="oldest">{t('gallery.sort.oldest')}</option>
            <option value="name">{t('gallery.sort.name')}</option>
          </select>
          {filteredImages.length > 0 && !readOnly && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="ml-2 flex items-center gap-1.5 text-gray-600 transition-colors hover:text-gray-900"
            >
              <span
                className={clsx(
                  'flex size-4 items-center justify-center rounded border-2 transition-colors',
                  allSelected ? 'border-primary bg-primary' : 'border-gray-300',
                )}
              >
                {allSelected && <Icon name="check" className="text-[9px] text-white" />}
              </span>
              {t('gallery.selectAll')}
            </button>
          )}
          <SegmentedControl
            className="ml-auto"
            options={[
              { value: 'grid', label: t('gallery.view.grid'), icon: 'grid-2' },
              { value: 'list', label: t('gallery.view.list'), icon: 'list' },
            ]}
            value={galleryPrefs.view}
            onChange={view => setGalleryPrefs({ view })}
          />
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingPhotos.size > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Icon name="spinner" style="solid" className="animate-spin text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {t('gallery.uploading', { n: uploadingPhotos.size })}
            </span>
          </div>
          <div className="space-y-1">
            {Array.from(uploadingPhotos.entries()).map(([id, { file }]) => (
              <div key={id} className="flex items-center gap-3 text-xs text-blue-700">
                <Icon name="file-image" className="text-blue-500" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-blue-500">{t('gallery.processing')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop Zone Overlay (always rendered, visibility toggled) */}
      <div
        className={clsx(
          'pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed transition-opacity',
          isDragging
            ? 'border-primary bg-primary-50/60 opacity-100'
            : 'border-transparent opacity-0',
        )}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-16 animate-bounce items-center justify-center rounded-2xl bg-primary-100">
            <Icon name="cloud-arrow-down" className="text-2xl text-primary" />
          </div>
          <p className="text-lg font-semibold text-primary-700">{t('gallery.drop.title')}</p>
          <p className="mt-1 text-sm text-primary/80">{t('gallery.drop.hint')}</p>
        </div>
      </div>

      {/* Gallery Content */}
      <div className="min-h-[400px]">
        {filteredImages.length === 0 ? (
          searchQuery || filterStatus !== 'all' ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-gray-100">
                <Icon name="magnifying-glass" className="text-xl text-gray-400" />
              </div>
              <p className="mb-1 text-sm font-medium text-gray-800">
                {t('gallery.noResults.title')}
              </p>
              <p className="mb-4 text-xs text-gray-500">{t('gallery.noResults.hint')}</p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
              >
                {t('gallery.noResults.clear')}
              </Button>
            </div>
          ) : readOnly ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-gray-100">
                <Icon name="image" className="text-2xl text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">{t('gallery.empty.title')}</p>
            </div>
          ) : (
            <EmptyGalleryState onUpload={() => fileInputRef.current?.click()} />
          )
        ) : (
          <div className="flex flex-col gap-5">
            {sections.map((section, index) => (
              <section key={section.key}>
                {section.key !== 'all' && (
                  <h4 className="mb-2 flex items-baseline gap-2 text-xs font-semibold text-gray-600">
                    {t(`gallery.types.${section.key}`)}
                    <span className="font-normal text-gray-400">
                      {t('gallery.typeCount', { n: section.images.length })}
                    </span>
                  </h4>
                )}
                {galleryPrefs.view === 'grid' ? (
                  <PhotoGridView
                    layout="dense"
                    images={section.images}
                    metaText={metaText}
                    prepend={index === 0 ? uploadTile : undefined}
                    onImageClick={handleImageClick}
                    onImageDelete={readOnly ? undefined : handleImageDelete}
                    onImageEdit={readOnly ? undefined : handleImageEdit}
                    selectedImageIds={selectedImageIds}
                    onSelectionChange={readOnly ? undefined : setSelectedImageIds}
                    showUsedBadge
                  />
                ) : (
                  <PhotoListView
                    images={section.images}
                    onImageClick={handleImageClick}
                    onImageDelete={readOnly ? undefined : handleImageDelete}
                    onImageEdit={readOnly ? undefined : handleImageEdit}
                    selectedImageIds={selectedImageIds}
                    onSelectionChange={readOnly ? undefined : setSelectedImageIds}
                    showUsedBadge
                  />
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Results Count — only when something is filtering the set */}
      {filteredImages.length > 0 && (searchQuery || filterStatus !== 'all') && (
        <p className="text-xs text-gray-400">
          {t('gallery.showing', { shown: filteredImages.length, total: allImages.length })}
        </p>
      )}

      {/* Bulk Action Toolbar */}
      {selectedImageIds.size > 0 && !readOnly && (
        <BulkActionToolbar
          selectedCount={selectedImageIds.size}
          topics={topics}
          onAddToTopic={handleAddToTopic}
          onDelete={handleBulkDelete}
          onLinkToProperty={handleBulkLinkToProperty}
          onDeselect={() => setSelectedImageIds(new Set())}
        />
      )}

      {/* Preview Modal */}
      {selectedImage && (
        <PhotoPreviewModal
          photo={selectedImage}
          photos={filteredImages}
          onClose={handleCloseModal}
          onNavigate={handleNavigate}
          onSaveDescription={
            readOnly
              ? undefined
              : async (caption: string) => {
                  if (!appraisalId) return;
                  try {
                    await updateGalleryPhoto({
                      appraisalId,
                      photoId: selectedImage.id,
                      caption: caption || null,
                      photoCategory: selectedImage.photoCategory,
                      latitude: selectedImage.latitude,
                      longitude: selectedImage.longitude,
                      capturedAt: selectedImage.capturedAt,
                    });
                    setSelectedImage(prev =>
                      prev
                        ? { ...prev, caption: caption || null, description: caption || undefined }
                        : null,
                    );
                    toast.success(t('toasts.descriptionUpdated'));
                  } catch {
                    toast.error(t('toasts.descriptionUpdateFailed'));
                  }
                }
          }
          isSavingDescription={isUpdating}
          onDelete={
            readOnly
              ? undefined
              : () => {
                  handleImageDelete(selectedImage);
                  setSelectedImage(null);
                }
          }
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, photoId: null })}
        onConfirm={confirmSingleDelete}
        title={t('gallery.deleteOne.title')}
        message={t('gallery.deleteOne.message')}
        confirmText={t('gallery.confirmDelete')}
        cancelText={t('gallery.cancel')}
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title={t('gallery.deleteMany.title')}
        message={t('gallery.deleteMany.message', { n: selectedImageIds.size })}
        confirmText={t('gallery.confirmDelete')}
        cancelText={t('gallery.cancel')}
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Link to Property Modal */}
      <LinkToPropertyModal
        isOpen={linkToPropertyOpen}
        onClose={() => setLinkToPropertyOpen(false)}
        onConfirm={confirmLinkToProperty}
        isLoading={isLinking}
        properties={allProperties}
      />

      {/* Photo Edit Modal */}
      <PhotoEditModal
        isOpen={editingImage !== null}
        image={editingImage}
        onClose={() => setEditingImage(null)}
        onSave={handleEditSave}
        isLoading={isUpdating}
      />
    </div>
  );
};

export default GalleryTab;
