import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import PhotoSourceModal from '../PhotoSourceModal';
import GallerySelectionModal from '../GallerySelectionModal';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import PhotoPreviewModal from '../PhotoPreviewModal';
import type { PreviewablePhoto } from '../PhotoPreviewModal';
import { PhotoGridView } from '../gallery';
import type { GalleryImage, TopicPhotoDisplay } from '../../types/gallery';
import { toGalleryImage, toTopicPhotoDisplay } from '../../types/gallery';
import type { PhotoTopicDtoType, GalleryPhotoDtoType } from '@shared/schemas/v1';
import {
  useGetPhotoTopics,
  useCreatePhotoTopic,
  useUpdatePhotoTopic,
  useDeletePhotoTopic,
  useAssignPhotoToTopic,
} from '../../api/photo';
import { useGetGalleryPhotos, useAddGalleryPhoto, useUpdateGalleryPhoto } from '../../api/gallery';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

const LAYOUT_OPTIONS = [
  { value: 1 as const, label: '1', icon: 'square' },
  { value: 2 as const, label: '2', icon: 'table-columns' },
  { value: 3 as const, label: '3', icon: 'table-cells' },
];

// TopicItem Component
const TopicItem = ({
  topic,
  isSelected,
  onSelect,
  onDelete,
  onEdit,
  readOnly,
}: {
  topic: PhotoTopicDtoType;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: (name: string) => void;
  readOnly?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(topic.topicName);

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
          ? 'bg-primary shadow-lg shadow-primary/25'
          : 'bg-white border border-gray-100 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5'
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
            className="w-full px-3 py-2 text-sm border border-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
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
                  : 'bg-primary/10 text-primary group-hover:bg-primary/20'
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
                {topic.topicName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={clsx(
                    'text-xs',
                    isSelected ? 'text-white/70' : 'text-gray-400'
                  )}
                >
                  {topic.photoCount} {topic.photoCount === 1 ? 'photo' : 'photos'}
                </span>
              </div>
            </div>

            {/* Photo Count Badge */}
            {topic.photoCount > 0 && (
              <div
                className={clsx(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-primary/10 text-primary'
                )}
              >
                {topic.photoCount}
              </div>
            )}

            {/* Actions */}
            {!readOnly && (
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
                    setEditName(topic.topicName);
                    setIsEditing(true);
                  }}
                  className={clsx(
                    'p-1.5 rounded-lg transition-colors',
                    isSelected
                      ? 'text-white/70 hover:text-white hover:bg-white/10'
                      : 'text-gray-400 hover:text-primary hover:bg-primary/10'
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
            )}
          </div>
        </button>
      )}
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
        ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/20'
        : 'border-gray-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md'
    )}
  >
    <div
      className={clsx(
        'w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300',
        isDragging
          ? 'bg-primary/20 text-primary scale-110'
          : 'bg-gray-100 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary'
      )}
    >
      <Icon name={isDragging ? 'cloud-arrow-down' : 'plus'} className="text-2xl" />
    </div>
    <p className={clsx(
      'text-sm font-medium transition-colors',
      isDragging ? 'text-primary' : 'text-gray-600'
    )}>
      {isDragging ? 'Drop photos here' : 'Add photos'}
    </p>
    <p className={clsx(
      'text-xs mt-1 transition-colors',
      isDragging ? 'text-primary/70' : 'text-gray-400'
    )}>
      Click or drag & drop
    </p>
  </div>
);

export const PhotosTab = () => {
  const readOnly = usePageReadOnly();
  // Get appraisalId from URL params
  const appraisalId = useAppraisalId();

  // API hooks for topics
  const { data: topicsData, isLoading: isLoadingTopics } = useGetPhotoTopics(appraisalId);
  const { mutate: createTopic } = useCreatePhotoTopic();
  const { mutate: updateTopic } = useUpdatePhotoTopic();
  const { mutate: deleteTopic, isPending: isDeletingTopic } = useDeletePhotoTopic();
  const { mutateAsync: assignPhotoToTopic, isPending: isAssigningPhoto } = useAssignPhotoToTopic();

  // API hooks for gallery (upload flow)
  const { data: galleryData } = useGetGalleryPhotos(appraisalId);
  const { mutateAsync: addGalleryPhoto } = useAddGalleryPhoto();
  const { mutateAsync: uploadDocument } = useUploadDocument();
  const { mutateAsync: updateGalleryPhotoApi, isPending: isUpdatingDescription } = useUpdateGalleryPhoto();

  // Build a lookup from documentId → GalleryPhotoDtoType for description editing
  const galleryPhotoByDocId = useMemo(() => {
    const map = new Map<string, GalleryPhotoDtoType>();
    if (galleryData?.photos) {
      for (const p of galleryData.photos as GalleryPhotoDtoType[]) {
        map.set(p.documentId, p);
      }
    }
    return map;
  }, [galleryData]);

  const topics = topicsData?.topics || [];
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [localLayouts, setLocalLayouts] = useState<Record<string, number>>({});
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<(PreviewablePhoto & { documentId?: string }) | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'topic' | 'photo';
    id: string;
    name: string;
  } | null>(null);

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
    ? { ...selectedTopicRaw, displayColumns: localLayouts[selectedTopicRaw.id] ?? selectedTopicRaw.displayColumns }
    : undefined;

  // Photos come from the selected topic's embedded photos array
  const topicPhotos: TopicPhotoDisplay[] = useMemo(
    () => (selectedTopic?.photos ?? []).map(toTopicPhotoDisplay),
    [selectedTopic?.photos]
  );

  // Get gallery images for "Choose from Gallery" modal
  const galleryImages: GalleryImage[] = useMemo(
    () => (galleryData?.photos ?? []).map(toGalleryImage),
    [galleryData]
  );

  // Map topic photos → GalleryImage[] for PhotoGridView
  const gridImages: GalleryImage[] = useMemo(
    () =>
      topicPhotos.map((photo, idx) => {
        const dto = galleryPhotoByDocId.get(photo.documentId);
        return {
          id: photo.id,
          documentId: photo.documentId,
          photoNumber: photo.photoNumber ?? idx + 1,
          src: photo.src,
          thumbnailSrc: photo.thumbnailSrc,
          alt: photo.caption || photo.fileName,
          fileName: dto?.fileName ?? `Photo #${photo.photoNumber ?? idx + 1}`,
          caption: photo.caption ?? dto?.caption ?? null,
          description: photo.caption ?? dto?.caption ?? undefined,
          photoType: dto?.photoType ?? 'general',
          photoCategory: dto?.photoCategory ?? null,
          isInUse: dto?.isInUse ?? false,
          latitude: dto?.latitude ?? null,
          longitude: dto?.longitude ?? null,
          capturedAt: dto?.capturedAt ?? null,
          fileExtension: dto?.fileExtension,
          mimeType: dto?.mimeType,
          fileSizeBytes: dto?.fileSizeBytes,
        };
      }),
    [topicPhotos, galleryPhotoByDocId],
  );

  const totalPhotos = topics.reduce((sum, t) => sum + t.photoCount, 0);

  /**
   * Get or create an upload session for photo uploads.
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
    if (newTopicName.trim() && appraisalId) {
      createTopic({
        appraisalId,
        topicName: newTopicName.trim(),
        sortOrder: topics.length + 1,
        displayColumns: 2,
      });
      setNewTopicName('');
      setIsAddingTopic(false);
      toast.success('Topic created');
    }
  };

  const handleEditTopic = (topicId: string, name: string) => {
    if (!appraisalId) return;
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    updateTopic({
      appraisalId,
      topicId,
      topicName: name,
      sortOrder: topic.sortOrder,
      displayColumns: topic.displayColumns,
    });
  };

  const handleDeleteTopic = async () => {
    if (deleteConfirm?.type === 'topic' && appraisalId) {
      const topic = topics.find(t => t.id === deleteConfirm.id);
      // Unassign all photos from the topic first
      if (topic?.photos.length) {
        try {
          await Promise.all(
            topic.photos.map(photo =>
              assignPhotoToTopic({
                appraisalId,
                photoId: photo.id,
                photoTopicIds: [],
              })
            )
          );
        } catch {
          toast.error('Failed to unassign photos from topic');
          setDeleteConfirm(null);
          return;
        }
      }
      deleteTopic({ appraisalId, topicId: deleteConfirm.id });
      if (selectedTopicId === deleteConfirm.id) {
        const remaining = topics.filter(t => t.id !== deleteConfirm.id);
        setSelectedTopicId(remaining[0]?.id || '');
      }
      setDeleteConfirm(null);
    }
  };

  const handleLayoutChange = (layout: number) => {
    if (selectedTopicId && appraisalId && selectedTopicRaw) {
      // Update local state immediately for responsive UI
      setLocalLayouts(prev => ({ ...prev, [selectedTopicId]: layout }));
      // Also call API to persist
      updateTopic({
        appraisalId,
        topicId: selectedTopicId,
        topicName: selectedTopicRaw.topicName,
        sortOrder: selectedTopicRaw.sortOrder,
        displayColumns: layout,
      });
    }
  };

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      if (!selectedTopicId || !appraisalId) {
        toast.error('Please select a topic first');
        return;
      }

      const imageFiles = Array.from(files).filter(file => /\.(jpg|jpeg|png)$/i.test(file.name));
      if (imageFiles.length === 0) {
        toast.error('Please select supported image files only (JPG, JPEG, PNG)');
        return;
      }

      toast.success(`Uploading ${imageFiles.length} file(s)...`);

      try {
        const sessionId = await getOrCreateSession();

        for (const file of imageFiles) {
          try {
            // Step 1: Upload the document
            const uploadResult = await uploadDocument({
              uploadSessionId: sessionId,
              file,
              documentType: 'GAL_PHOTO',
              documentCategory: 'gallery',
            });

            // Step 2: Register in gallery with topic assignment
            await addGalleryPhoto({
              appraisalId,
              documentId: uploadResult.documentId,
              photoType: 'general',
              uploadedBy: 'current-user',
              photoCategory: null,
              caption: null,
              latitude: null,
              longitude: null,
              capturedAt: null,
              photoTopicIds: [selectedTopicId],
            });

            toast.success(`Uploaded ${file.name}`);
          } catch {
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      } catch {
        toast.error('Failed to create upload session');
      }
    },
    [selectedTopicId, appraisalId, getOrCreateSession, uploadDocument, addGalleryPhoto]
  );

  const handleUploadFromDevice = (files: FileList) => {
    handleFileSelect(files);
  };

  const handleChooseFromGallery = () => {
    setShowGalleryModal(true);
  };

  const handleGallerySelect = async (selectedImages: GalleryImage[]) => {
    if (!selectedTopicId || !appraisalId) return;

    let successCount = 0;
    for (const image of selectedImages) {
      try {
        await assignPhotoToTopic({
          appraisalId,
          photoId: image.id,
          photoTopicIds: [selectedTopicId],
        });
        successCount++;
      } catch {
        toast.error(`Failed to assign photo`);
      }
    }

    if (successCount > 0) {
      toast.success(`Added ${successCount} photo${successCount !== 1 ? 's' : ''}`);
    }
  };

  const handleRemovePhoto = async () => {
    if (deleteConfirm?.type === 'photo' && appraisalId) {
      try {
        await assignPhotoToTopic({
          appraisalId,
          photoId: deleteConfirm.id,
          photoTopicIds: [],
        });
      } catch {
        toast.error('Failed to remove photo from topic');
      }
      setDeleteConfirm(null);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) return;
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
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Icon name="images" className="text-xl text-primary" />
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
        <div className="bg-primary rounded-xl p-4 mb-4 shadow-lg shadow-primary/20">
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
        {!readOnly && !isAddingTopic && (
          <button
            type="button"
            onClick={() => setIsAddingTopic(true)}
            className="w-full mb-4 py-2.5 px-4 rounded-xl border-2 border-dashed border-primary/30 text-primary hover:border-primary hover:bg-primary/5 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Icon name="plus" />
            New Topic
          </button>
        )}

        {/* Add Topic Input */}
        {!readOnly && isAddingTopic && (
          <div className="mb-4 p-4 bg-white rounded-xl border border-primary/10 shadow-sm">
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
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={handleAddTopic} className="flex-1">
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
              onSelect={() => setSelectedTopicId(topic.id)}
              onDelete={() =>
                setDeleteConfirm({ type: 'topic', id: topic.id, name: topic.topicName })
              }
              onEdit={name => handleEditTopic(topic.id, name)}
              readOnly={readOnly}
            />
          ))}

          {topics.length === 0 && !isAddingTopic && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Icon name="folder-open" className="text-2xl text-primary" />
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
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="images" style="solid" className="text-primary text-sm" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">{selectedTopic.topicName}</h4>
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
                      selectedTopic?.displayColumns === option.value
                        ? 'bg-white text-primary shadow-sm'
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
            {!readOnly && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowPhotoSourceModal(true)}
                disabled={!selectedTopicId}
                className="!shadow-lg !shadow-primary/25"
              >
                <Icon name="plus" className="mr-1.5" />
                Add Photos
              </Button>
            )}
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
            <div className="h-full flex items-center justify-center border-2 border-dashed border-primary rounded-2xl bg-primary/5 m-2">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Icon name="cloud-arrow-down" className="text-3xl text-primary" />
                </div>
                <p className="text-xl font-semibold text-primary">Drop photos here</p>
                <p className="text-sm text-primary/70 mt-1">Release to upload to "{selectedTopic?.topicName}"</p>
              </div>
            </div>
          ) : (
            <div className="p-2">
              <PhotoGridView
                images={gridImages}
                onImageClick={image => setPreviewPhoto(image)}
                onImageDelete={image =>
                  setDeleteConfirm({ type: 'photo', id: image.id, name: image.fileName || image.alt })
                }
                showUsedBadge={false}
                prepend={
                  readOnly ? undefined : (
                    <UploadPlaceholder
                      onClick={() => setShowPhotoSourceModal(true)}
                      isDragging={false}
                    />
                  )
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        multiple
        onClick={e => {
          (e.target as HTMLInputElement).value = '';
        }}
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
        onConfirm={deleteConfirm?.type === 'topic' ? handleDeleteTopic : handleRemovePhoto}
        title={deleteConfirm?.type === 'topic' ? 'Delete Topic' : 'Remove Photo'}
        message={
          deleteConfirm?.type === 'topic'
            ? `Are you sure you want to delete "${deleteConfirm?.name}"? All photos in this topic will be unassigned.`
            : `Are you sure you want to remove "${deleteConfirm?.name}" from this topic?`
        }
        confirmText="Delete"
        variant="danger"
        isLoading={isDeletingTopic || isAssigningPhoto}
      />

      {/* Photo Preview Modal - Enhanced with navigation */}
      {previewPhoto && (
        <PhotoPreviewModal
          photo={previewPhoto}
          photos={gridImages}
          onClose={() => setPreviewPhoto(null)}
          onNavigate={setPreviewPhoto}
          showInUseStatus={false}
          onDelete={() => {
            setDeleteConfirm({ type: 'photo', id: previewPhoto.id, name: previewPhoto.caption || previewPhoto.fileName || 'Photo' });
            setPreviewPhoto(null);
          }}
          onSaveDescription={async (caption: string) => {
            if (!appraisalId || !previewPhoto.documentId) return;
            try {
              const dto = galleryPhotoByDocId.get(previewPhoto.documentId);
              if (!dto) {
                toast.error('Gallery photo not found');
                return;
              }
              await updateGalleryPhotoApi({
                appraisalId,
                photoId: dto.id,
                caption: caption || null,
                photoCategory: dto.photoCategory ?? null,
                latitude: dto.latitude ?? null,
                longitude: dto.longitude ?? null,
                capturedAt: dto.capturedAt ?? null,
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
    </div>
  );
};

export default PhotosTab;
