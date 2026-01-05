import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import PhotoSourceModal from './PhotoSourceModal';
import GallerySelectionModal from './GallerySelectionModal';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import type { GalleryImage } from '../types/gallery';
import type { CollateralType, CollateralPhotoTopic, CollateralPhoto } from '../types/photo';
import {
  useGetCollateralPhotoTopics,
  useCreateCollateralPhotoTopic,
  useUpdateCollateralPhotoTopic,
  useDeleteCollateralPhotoTopic,
  useGetCollateralPhotos,
  useAddPhotoToCollateral,
  useRemovePhotoFromCollateral,
} from '../api/photo';
import { usePropertyStore } from '../store';
// Use same upload API as RequestPage
import { createUploadSession, useUploadDocument } from '@/features/request/api';

interface CollateralPhotoTabProps {
  collateralId: string;
  collateralType: CollateralType;
}

const LAYOUT_OPTIONS = [
  { value: 1 as const, label: '1', icon: 'square' },
  { value: 2 as const, label: '2', icon: 'table-columns' },
  { value: 3 as const, label: '3', icon: 'table-cells' },
];

// TopicItem Component - Enhanced with emerald theme
const TopicItem = ({
  topic,
  isSelected,
  photoCount,
  onSelect,
  onDelete,
  onEdit,
}: {
  topic: CollateralPhotoTopic;
  isSelected: boolean;
  photoCount: number;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: (name: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(topic.name);

  const handleSave = () => {
    if (editName.trim()) {
      onEdit(editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={clsx(
        'group relative rounded-xl transition-all duration-200',
        isSelected
          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25'
          : 'bg-white border border-gray-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5'
      )}
    >
      {isEditing ? (
        <div className="p-3">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            onBlur={handleSave}
            className="w-full px-3 py-2 text-sm border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400"
            autoFocus
          />
        </div>
      ) : (
        <button type="button" onClick={onSelect} className="w-full text-left p-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div
              className={clsx(
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                isSelected
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100'
              )}
            >
              <Icon name="images" style="solid" className="text-sm" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={clsx(
                  'text-sm font-medium truncate',
                  isSelected ? 'text-white' : 'text-gray-800'
                )}
              >
                {topic.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={clsx(
                    'text-xs',
                    isSelected ? 'text-white/70' : 'text-gray-400'
                  )}
                >
                  {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                </span>
              </div>
            </div>

            {/* Photo Count Badge */}
            {photoCount > 0 && (
              <div
                className={clsx(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 text-emerald-600'
                )}
              >
                {photoCount}
              </div>
            )}

            {/* Actions */}
            <div
              className={clsx(
                'flex items-center gap-0.5 transition-opacity',
                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
            >
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setEditName(topic.name);
                  setIsEditing(true);
                }}
                className={clsx(
                  'p-1.5 rounded-lg transition-colors',
                  isSelected
                    ? 'text-white/70 hover:text-white hover:bg-white/10'
                    : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                )}
              >
                <Icon name="pen" className="text-xs" />
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onDelete();
                }}
                className={clsx(
                  'p-1.5 rounded-lg transition-colors',
                  isSelected
                    ? 'text-white/70 hover:text-white hover:bg-red-500/20'
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                )}
              >
                <Icon name="trash" className="text-xs" />
              </button>
            </div>
          </div>
        </button>
      )}
    </div>
  );
};

// PhotoCard Component - Enhanced with better hover effects
const PhotoCard = ({
  photo,
  isThumbnail,
  onDelete,
  onView,
  onSetThumbnail,
}: {
  photo: CollateralPhoto;
  isThumbnail: boolean;
  onDelete: () => void;
  onView: () => void;
  onSetThumbnail: () => void;
}) => {
  return (
    <div className="group relative">
      {/* Thumbnail Badge */}
      {isThumbnail && (
        <div className="absolute -top-2 -left-2 z-10 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-amber-500/30 flex items-center gap-1.5">
          <Icon name="star" style="solid" className="text-[10px]" />
          Cover
        </div>
      )}

      {/* Image Container */}
      <div
        className={clsx(
          'relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 cursor-pointer transition-all duration-300',
          isThumbnail
            ? 'ring-2 ring-amber-400 ring-offset-2 shadow-lg shadow-amber-500/20'
            : 'hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1'
        )}
        onClick={onView}
      >
        <img
          src={photo.src}
          alt={photo.fileName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Quick Actions */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          {!isThumbnail && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onSetThumbnail();
              }}
              className="p-2 bg-white/95 backdrop-blur-sm rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white shadow-lg transition-all duration-200 hover:scale-110"
              title="Set as cover photo"
            >
              <Icon name="star" className="text-sm" />
            </button>
          )}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onView();
            }}
            className="p-2 bg-white/95 backdrop-blur-sm rounded-lg text-gray-600 hover:bg-emerald-500 hover:text-white shadow-lg transition-all duration-200 hover:scale-110"
            title="View full size"
          >
            <Icon name="expand" className="text-sm" />
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 bg-white/95 backdrop-blur-sm rounded-lg text-gray-600 hover:bg-red-500 hover:text-white shadow-lg transition-all duration-200 hover:scale-110"
            title="Remove photo"
          >
            <Icon name="trash" className="text-sm" />
          </button>
        </div>

        {/* File Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p className="text-white text-sm font-medium truncate drop-shadow-lg">{photo.fileName}</p>
          {photo.description && (
            <p className="text-white/80 text-xs truncate mt-0.5">{photo.description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Photo Preview Modal Component with navigation and keyboard support
const PhotoPreviewModal = ({
  photo,
  photos,
  isThumbnail,
  onClose,
  onNavigate,
  onSetThumbnail,
  onDelete,
}: {
  photo: CollateralPhoto;
  photos: CollateralPhoto[];
  isThumbnail: boolean;
  onClose: () => void;
  onNavigate: (photo: CollateralPhoto) => void;
  onSetThumbnail: () => void;
  onDelete: () => void;
}) => {
  const currentIndex = photos.findIndex(p => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(photos[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, photos, onNavigate]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      onNavigate(photos[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, photos, onNavigate]);

  // Keyboard navigation
  useLayoutEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrev();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrev, goToNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        {/* Photo Counter */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-white/90 text-sm font-medium">
            <Icon name="image" className="mr-2" />
            {currentIndex + 1} / {photos.length}
          </div>
          {isThumbnail && (
            <div className="px-3 py-1.5 bg-amber-500/90 backdrop-blur-sm rounded-lg text-white text-xs font-semibold flex items-center gap-1.5">
              <Icon name="star" style="solid" className="text-[10px]" />
              Cover Photo
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isThumbnail && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onSetThumbnail();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/90 hover:bg-amber-500 backdrop-blur-sm rounded-xl text-white text-sm font-medium transition-all hover:scale-105"
              title="Set as cover photo"
            >
              <Icon name="star" className="text-sm" />
              Set as Cover
            </button>
          )}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm rounded-xl text-white text-sm font-medium transition-all hover:scale-105"
            title="Delete photo"
          >
            <Icon name="trash" className="text-sm" />
            Delete
          </button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white transition-colors"
            title="Close (Esc)"
          >
            <Icon name="xmark" className="text-lg" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {hasPrev && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            goToPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl text-white transition-all hover:scale-110 group"
          title="Previous (←)"
        >
          <Icon name="chevron-left" className="text-2xl group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl text-white transition-all hover:scale-110 group"
          title="Next (→)"
        >
          <Icon name="chevron-right" className="text-2xl group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Image */}
      <img
        src={photo.src}
        alt={photo.fileName}
        className="max-w-[85vw] max-h-[80vh] object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-xl flex items-center gap-4 max-w-2xl">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <Icon name="image" className="text-white/70" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{photo.fileName}</p>
              {photo.description && (
                <p className="text-sm text-white/60 mt-0.5 truncate">{photo.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center justify-center gap-4 mt-3 text-white/40 text-xs">
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 bg-white/10 rounded">←</kbd>
            <kbd className="px-2 py-0.5 bg-white/10 rounded">→</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 bg-white/10 rounded">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
};

// Upload Placeholder Component - Enhanced design
const UploadPlaceholder = ({
  onClick,
  isDragging,
}: {
  onClick: () => void;
  isDragging?: boolean;
}) => (
  <div
    onClick={onClick}
    className={clsx(
      'aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300',
      isDragging
        ? 'border-emerald-400 bg-emerald-50 scale-[1.02] shadow-lg shadow-emerald-500/20'
        : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-md'
    )}
  >
    <div
      className={clsx(
        'w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300',
        isDragging
          ? 'bg-emerald-100 text-emerald-600 scale-110'
          : 'bg-gray-100 text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-500'
      )}
    >
      <Icon name={isDragging ? 'cloud-arrow-down' : 'plus'} className="text-2xl" />
    </div>
    <p className={clsx(
      'text-sm font-medium transition-colors',
      isDragging ? 'text-emerald-700' : 'text-gray-600'
    )}>
      {isDragging ? 'Drop photos here' : 'Add photos'}
    </p>
    <p className={clsx(
      'text-xs mt-1 transition-colors',
      isDragging ? 'text-emerald-500' : 'text-gray-400'
    )}>
      Click or drag & drop
    </p>
  </div>
);

export const CollateralPhotoTab = ({
  collateralId,
  collateralType,
}: CollateralPhotoTabProps) => {
  // Get gallery images from property store (same as GalleryTab)
  const { groups } = usePropertyStore();

  // API hooks
  const { data: topicsData, isLoading: isLoadingTopics } = useGetCollateralPhotoTopics(
    collateralId,
    collateralType
  );
  const { mutate: createTopic } = useCreateCollateralPhotoTopic();
  const { mutate: updateTopic } = useUpdateCollateralPhotoTopic();
  const { mutate: deleteTopic, isPending: isDeletingTopic } = useDeleteCollateralPhotoTopic();

  // Local state for photos (will be replaced with API when available)
  const [localPhotos, setLocalPhotos] = useState<CollateralPhoto[]>([]);

  const { data: photosData } = useGetCollateralPhotos(collateralId);
  const { mutate: addPhotoToCollateral } = useAddPhotoToCollateral();
  const { mutate: removePhoto, isPending: isRemovingPhoto } = useRemovePhotoFromCollateral();

  // Use same upload API as RequestPage (real API calls)
  const { mutate: uploadDocument } = useUploadDocument();

  // Combine API photos with local photos
  const photos = [...(photosData?.photos || []), ...localPhotos];

  const topics = topicsData?.topics || [];
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [localLayouts, setLocalLayouts] = useState<Record<string, 1 | 2 | 3>>({});
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<CollateralPhoto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'topic' | 'photo';
    id: string;
    name: string;
  } | null>(null);
  const [thumbnailPhotoId, setThumbnailPhotoId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  // Select first topic when topics load
  useEffect(() => {
    if (topics.length > 0 && !selectedTopicId) {
      setSelectedTopicId(topics[0].id);
    }
  }, [topics, selectedTopicId]);

  const selectedTopicRaw = topics.find(t => t.id === selectedTopicId);
  // Merge local layout state with topic data
  const selectedTopic = selectedTopicRaw
    ? { ...selectedTopicRaw, layout: localLayouts[selectedTopicRaw.id] || selectedTopicRaw.layout }
    : undefined;
  const topicPhotos = photos.filter(p => p.topicId === selectedTopicId);

  // Get appraisal-level gallery images for "Choose from Gallery" modal
  // Uses same data source as GalleryTab (from usePropertyStore)
  const galleryImages: GalleryImage[] = useMemo(
    () =>
      groups.flatMap(group =>
        group.items
          .filter(item => item.image)
          .map(item => ({
            id: item.id,
            src: item.image!,
            alt: item.address,
            fileName: `${item.type}_${item.id}.jpg`,
            description: item.address,
            propertyType: item.type,
            groupName: group.name,
            isUsed: false,
            size: Math.floor(Math.random() * 5000000) + 100000,
            uploadedAt: new Date(),
          }))
      ),
    [groups]
  );

  const getPhotoCountForTopic = (topicId: string) => {
    return photos.filter(p => p.topicId === topicId).length;
  };

  const totalPhotos = photos.length;

  /**
   * Get or create an upload session for photo uploads.
   * Ensures only one session is created per page load (same pattern as RequestPage).
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

  const handleAddTopic = () => {
    if (newTopicName.trim()) {
      createTopic({
        collateralId,
        collateralType,
        name: newTopicName.trim(),
      });
      setNewTopicName('');
      setIsAddingTopic(false);
      toast.success('Topic created');
    }
  };

  const handleEditTopic = (topicId: string, name: string) => {
    updateTopic({ topicId, name, collateralId });
  };

  const handleDeleteTopic = () => {
    if (deleteConfirm?.type === 'topic') {
      deleteTopic({ topicId: deleteConfirm.id, collateralId });
      if (selectedTopicId === deleteConfirm.id) {
        const remaining = topics.filter(t => t.id !== deleteConfirm.id);
        setSelectedTopicId(remaining[0]?.id || '');
      }
      setDeleteConfirm(null);
    }
  };

  const handleLayoutChange = (layout: 1 | 2 | 3) => {
    if (selectedTopicId) {
      // Update local state immediately for responsive UI
      setLocalLayouts(prev => ({ ...prev, [selectedTopicId]: layout }));
      // Also call API to persist
      updateTopic({ topicId: selectedTopicId, layout, collateralId });
    }
  };

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      if (!selectedTopicId) {
        toast.error('Please select a topic first');
        return;
      }

      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length === 0) {
        toast.error('Please select image files only');
        return;
      }

      toast.success(`Uploading ${imageFiles.length} file(s)...`);

      try {
        const sessionId = await getOrCreateSession();

        imageFiles.forEach(file => {
          uploadDocument(
            {
              uploadSessionId: sessionId,
              file,
              documentType: 'PHOTO',
              documentCategory: 'coll_photo', // max 10 chars
            },
            {
              onSuccess: result => {
                // Add to local photos for immediate display
                // Use createObjectURL for preview since API returns documentId, not file path
                const newPhoto: CollateralPhoto = {
                  id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  galleryPhotoId: result.documentId,
                  collateralId,
                  topicId: selectedTopicId,
                  order: localPhotos.length + 1,
                  src: URL.createObjectURL(file),
                  fileName: result.fileName || file.name,
                  description: '',
                };
                setLocalPhotos(prev => [...prev, newPhoto]);
                toast.success(`Uploaded ${file.name}`);
              },
              onError: () => {
                toast.error(`Failed to upload ${file.name}`);
              },
            }
          );
        });
      } catch {
        toast.error('Failed to create upload session');
      }
    },
    [selectedTopicId, getOrCreateSession, uploadDocument, collateralId, localPhotos.length]
  );

  const handleUploadFromDevice = (files: FileList) => {
    handleFileSelect(files);
  };

  const handleChooseFromGallery = () => {
    setShowGalleryModal(true);
  };

  const handleGallerySelect = (selectedImages: GalleryImage[]) => {
    if (!selectedTopicId) return;

    selectedImages.forEach(image => {
      addPhotoToCollateral({
        collateralId,
        galleryPhotoId: image.id,
        topicId: selectedTopicId,
      });

      // Add to local photos for immediate display
      const newPhoto: CollateralPhoto = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        galleryPhotoId: image.id,
        collateralId,
        topicId: selectedTopicId,
        order: localPhotos.length + 1,
        src: image.src,
        fileName: image.fileName || image.alt,
        description: image.description,
      };
      setLocalPhotos(prev => [...prev, newPhoto]);
    });

    toast.success(`Added ${selectedImages.length} photo${selectedImages.length !== 1 ? 's' : ''}`);
  };

  const handleDeletePhoto = () => {
    if (deleteConfirm?.type === 'photo') {
      removePhoto({ photoId: deleteConfirm.id, collateralId });
      setLocalPhotos(prev => prev.filter(p => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    }
  };

  const handleSetThumbnail = (photoId: string) => {
    setThumbnailPhotoId(photoId);
    toast.success('Cover photo updated');
    // TODO: Call API to persist thumbnail selection for this collateral
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  if (isLoadingTopics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center animate-pulse">
            <Icon name="images" className="text-xl text-emerald-500" />
          </div>
          <p className="text-sm text-gray-500">Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Left Panel - Topics List */}
      <div className="w-[300px] flex-shrink-0 flex flex-col bg-gradient-to-b from-gray-50/50 to-white rounded-2xl p-4">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 mb-4 shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Icon name="layer-group" style="solid" className="text-white text-lg" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Photo Topics</h3>
              <p className="text-white/70 text-xs mt-0.5">
                {topics.length} topic{topics.length !== 1 ? 's' : ''} · {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Add Topic Button */}
        {!isAddingTopic && (
          <button
            type="button"
            onClick={() => setIsAddingTopic(true)}
            className="w-full mb-4 py-2.5 px-4 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Icon name="plus" />
            New Topic
          </button>
        )}

        {/* Add Topic Input */}
        {isAddingTopic && (
          <div className="mb-4 p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
            <input
              type="text"
              value={newTopicName}
              onChange={e => setNewTopicName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddTopic();
                if (e.key === 'Escape') {
                  setIsAddingTopic(false);
                  setNewTopicName('');
                }
              }}
              placeholder="Topic name..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={handleAddTopic} className="flex-1 !bg-emerald-500 hover:!bg-emerald-600">
                <Icon name="check" className="mr-1.5" />
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingTopic(false);
                  setNewTopicName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Topics List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {topics.map(topic => (
            <TopicItem
              key={topic.id}
              topic={topic}
              isSelected={topic.id === selectedTopicId}
              photoCount={getPhotoCountForTopic(topic.id)}
              onSelect={() => setSelectedTopicId(topic.id)}
              onDelete={() =>
                setDeleteConfirm({ type: 'topic', id: topic.id, name: topic.name })
              }
              onEdit={name => handleEditTopic(topic.id, name)}
            />
          ))}

          {topics.length === 0 && !isAddingTopic && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="folder-open" className="text-2xl text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-600">No topics yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[180px] mx-auto">
                Create topics to organize your photos by category
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Photo Grid */}
      <div
        className="flex-1 flex flex-col min-w-0"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {/* Selected Topic Title */}
            {selectedTopic && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Icon name="images" style="solid" className="text-emerald-600 text-sm" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">{selectedTopic.name}</h4>
                  <p className="text-xs text-gray-400">
                    {topicPhotos.length} photo{topicPhotos.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Layout Selector */}
            {selectedTopic && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                {LAYOUT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleLayoutChange(option.value)}
                    className={clsx(
                      'w-8 h-8 rounded-md flex items-center justify-center transition-all duration-200',
                      selectedTopic?.layout === option.value
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                    )}
                    title={`${option.value} column${option.value > 1 ? 's' : ''}`}
                  >
                    <Icon name={option.icon} className="text-sm" />
                  </button>
                ))}
              </div>
            )}

            {/* Add Photos Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowPhotoSourceModal(true)}
              disabled={!selectedTopicId}
              className="!bg-emerald-500 hover:!bg-emerald-600 !shadow-lg !shadow-emerald-500/25"
            >
              <Icon name="plus" className="mr-1.5" />
              Add Photos
            </Button>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto">
          {!selectedTopicId ? (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
                <Icon name="hand-pointer" className="text-3xl text-gray-300" />
              </div>
              <p className="text-base font-medium text-gray-500">Select a topic</p>
              <p className="text-sm text-gray-400 mt-1">
                Choose a topic from the left panel to view photos
              </p>
            </div>
          ) : isDragging ? (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-emerald-400 rounded-2xl bg-emerald-50/50 m-2">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Icon name="cloud-arrow-down" className="text-3xl text-emerald-600" />
                </div>
                <p className="text-xl font-semibold text-emerald-700">Drop photos here</p>
                <p className="text-sm text-emerald-500 mt-1">Release to upload to "{selectedTopic?.name}"</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-2">
              {/* Upload Placeholder */}
              <UploadPlaceholder
                onClick={() => setShowPhotoSourceModal(true)}
                isDragging={false}
              />

              {/* Photos */}
              {topicPhotos.map(photo => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  isThumbnail={photo.id === thumbnailPhotoId}
                  onDelete={() =>
                    setDeleteConfirm({ type: 'photo', id: photo.id, name: photo.fileName })
                  }
                  onView={() => setPreviewPhoto(photo)}
                  onSetThumbnail={() => handleSetThumbnail(photo.id)}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {selectedTopicId && !isDragging && topicPhotos.length === 0 && (
            <div className="text-center py-8 mt-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="camera" className="text-2xl text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-600">No photos yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Drag photos here or click "Add Photos" to get started
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={e => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Photo Source Modal */}
      <PhotoSourceModal
        isOpen={showPhotoSourceModal}
        onClose={() => setShowPhotoSourceModal(false)}
        onUploadFromDevice={handleUploadFromDevice}
        onChooseFromGallery={handleChooseFromGallery}
      />

      {/* Gallery Selection Modal */}
      <GallerySelectionModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        onSelect={handleGallerySelect}
        images={galleryImages}
        multiSelect
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={deleteConfirm?.type === 'topic' ? handleDeleteTopic : handleDeletePhoto}
        title={deleteConfirm?.type === 'topic' ? 'Delete Topic' : 'Remove Photo'}
        message={
          deleteConfirm?.type === 'topic'
            ? `Are you sure you want to delete "${deleteConfirm?.name}"? All photos in this topic will be unassigned.`
            : `Are you sure you want to remove "${deleteConfirm?.name}" from this topic?`
        }
        confirmText="Delete"
        variant="danger"
        isLoading={isDeletingTopic || isRemovingPhoto}
      />

      {/* Photo Preview Modal - Enhanced with navigation */}
      {previewPhoto && (
        <PhotoPreviewModal
          photo={previewPhoto}
          photos={topicPhotos}
          isThumbnail={previewPhoto.id === thumbnailPhotoId}
          onClose={() => setPreviewPhoto(null)}
          onNavigate={setPreviewPhoto}
          onSetThumbnail={() => {
            handleSetThumbnail(previewPhoto.id);
          }}
          onDelete={() => {
            setDeleteConfirm({ type: 'photo', id: previewPhoto.id, name: previewPhoto.fileName });
            setPreviewPhoto(null);
          }}
        />
      )}
    </div>
  );
};

export default CollateralPhotoTab;
