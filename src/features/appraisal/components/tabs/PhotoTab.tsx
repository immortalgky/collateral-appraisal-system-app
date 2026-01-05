import { useState, useRef, useCallback } from 'react';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';
import PhotoSourceModal from '../PhotoSourceModal';
import GallerySelectionModal from '../GallerySelectionModal';
import type { GalleryImage } from '../../types/gallery';

interface PhotoTopic {
  id: string;
  name: string;
  layout: 1 | 2 | 3;
  order: number;
}

interface Photo {
  id: string;
  src: string;
  name: string;
  description?: string;
  topicId: string;
  uploadedAt: Date;
  size: number;
}

const DEFAULT_TOPICS: PhotoTopic[] = [
  { id: 'topic-1', name: 'Area in front of the project', layout: 2, order: 1 },
  { id: 'topic-2', name: 'Area in front of the collateral', layout: 2, order: 2 },
  { id: 'topic-3', name: 'Collateral', layout: 2, order: 3 },
];

const LAYOUT_OPTIONS = [
  { value: 1 as const, label: '1 Column', icon: 'square' },
  { value: 2 as const, label: '2 Columns', icon: 'grip' },
  { value: 3 as const, label: '3 Columns', icon: 'table-cells' },
];

// TopicItem Component
const TopicItem = ({
  topic,
  isSelected,
  photoCount,
  onSelect,
  onDelete,
  onEdit,
  isDragging,
}: {
  topic: PhotoTopic;
  isSelected: boolean;
  photoCount: number;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: (name: string) => void;
  isDragging?: boolean;
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
          ? 'bg-primary shadow-lg shadow-primary/20'
          : 'bg-white border border-gray-100 hover:border-primary/30 hover:shadow-md',
        isDragging && 'opacity-50 scale-95'
      )}
    >
      {isEditing ? (
        <div className="p-4">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            onBlur={handleSave}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          className="w-full text-left p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p
                className={clsx(
                  'text-sm font-medium truncate',
                  isSelected ? 'text-white' : 'text-gray-900'
                )}
              >
                {topic.name}
              </p>
              <p
                className={clsx(
                  'text-xs mt-1',
                  isSelected ? 'text-white/70' : 'text-gray-500'
                )}
              >
                {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
              </p>
            </div>

            {/* Actions */}
            <div className={clsx(
              'flex items-center gap-1 transition-opacity',
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}>
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
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
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
                    ? 'text-red-300 hover:text-red-200 hover:bg-red-500/20'
                    : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                )}
              >
                <Icon name="trash" className="text-xs" />
              </button>
            </div>
          </div>
        </button>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
      )}
    </div>
  );
};

// PhotoCard Component
const PhotoCard = ({
  photo,
  onDelete,
  onView,
  onEditDescription,
}: {
  photo: Photo;
  onDelete: () => void;
  onView: () => void;
  onEditDescription: (description: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(photo.description || '');

  return (
    <div className="group relative">
      {/* Image Container */}
      <div
        className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
        onClick={onView}
      >
        <img
          src={photo.src}
          alt={photo.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Quick Actions */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onView();
              }}
              className="p-2 bg-white/90 rounded-lg text-gray-700 hover:bg-white shadow-lg transition-colors"
            >
              <Icon name="expand" className="text-sm" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 bg-white/90 rounded-lg text-red-500 hover:bg-white shadow-lg transition-colors"
            >
              <Icon name="trash" className="text-sm" />
            </button>
          </div>

          {/* File Info */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white text-sm font-medium truncate">{photo.name}</p>
            <p className="text-white/70 text-xs">
              {(photo.size / 1024).toFixed(0)} KB
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-2">
        {isEditing ? (
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => {
              onEditDescription(description);
              setIsEditing(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onEditDescription(description);
                setIsEditing(false);
              }
              if (e.key === 'Escape') {
                setDescription(photo.description || '');
                setIsEditing(false);
              }
            }}
            placeholder="Add description..."
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="w-full text-left px-1 py-0.5 text-xs text-gray-500 hover:text-gray-700 rounded transition-colors"
          >
            {photo.description || (
              <span className="text-gray-400 italic">Add description...</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// Upload Placeholder Component
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
      'aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200',
      isDragging
        ? 'border-primary bg-primary/5 scale-[1.02]'
        : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
    )}
  >
    <div
      className={clsx(
        'w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors',
        isDragging ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
      )}
    >
      <Icon name={isDragging ? 'cloud-arrow-down' : 'image'} className="text-xl" />
    </div>
    <p className="text-sm text-gray-600 font-medium">
      {isDragging ? 'Drop photos here' : 'Add photos'}
    </p>
    <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
  </div>
);

export const PhotoTab = () => {
  const [topics, setTopics] = useState<PhotoTopic[]>(DEFAULT_TOPICS);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topics[0]?.id || '');
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTopic = topics.find(t => t.id === selectedTopicId);
  const topicPhotos = photos.filter(p => p.topicId === selectedTopicId);

  // Mock gallery images for selection
  const galleryImages: GalleryImage[] = photos.map(p => ({
    id: p.id,
    src: p.src,
    alt: p.name,
    fileName: p.name,
    description: p.description,
  }));

  const getPhotoCountForTopic = (topicId: string) => {
    return photos.filter(p => p.topicId === topicId).length;
  };

  const totalPhotos = photos.length;

  const handleAddTopic = () => {
    if (newTopicName.trim()) {
      const newTopic: PhotoTopic = {
        id: `topic-${Date.now()}`,
        name: newTopicName.trim(),
        layout: 2,
        order: topics.length + 1,
      };
      setTopics(prev => [...prev, newTopic]);
      setNewTopicName('');
      setIsAddingTopic(false);
      setSelectedTopicId(newTopic.id);
    }
  };

  const handleEditTopic = (topicId: string, name: string) => {
    setTopics(prev => prev.map(t => (t.id === topicId ? { ...t, name } : t)));
  };

  const handleDeleteTopic = (topicId: string) => {
    setTopics(prev => prev.filter(t => t.id !== topicId));
    setPhotos(prev => prev.filter(p => p.topicId !== topicId));
    if (selectedTopicId === topicId) {
      const remaining = topics.filter(t => t.id !== topicId);
      setSelectedTopicId(remaining[0]?.id || '');
    }
  };

  const handleLayoutChange = (layout: 1 | 2 | 3) => {
    setTopics(prev =>
      prev.map(t => (t.id === selectedTopicId ? { ...t, layout } : t))
    );
  };

  const handleFileSelect = useCallback(
    (files: FileList) => {
      if (!selectedTopicId) return;

      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            const newPhoto: Photo = {
              id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              src: reader.result as string,
              name: file.name,
              topicId: selectedTopicId,
              uploadedAt: new Date(),
              size: file.size,
            };
            setPhotos(prev => [...prev, newPhoto]);
          };
          reader.readAsDataURL(file);
        }
      });
    },
    [selectedTopicId]
  );

  const handleUploadFromDevice = (files: FileList) => {
    handleFileSelect(files);
  };

  const handleChooseFromGallery = () => {
    setShowGalleryModal(true);
  };

  const handleGallerySelect = (selectedImages: GalleryImage[]) => {
    console.log('Selected from gallery:', selectedImages);
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleEditPhotoDescription = (photoId: string, description: string) => {
    setPhotos(prev =>
      prev.map(p => (p.id === photoId ? { ...p, description } : p))
    );
  };

  const handlePreview = () => {
    console.log('Preview layout');
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

  return (
    <div className="flex gap-6 h-full min-h-[600px]">
      {/* Left Panel - Topics List */}
      <div className="w-[320px] flex-shrink-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Photo Topics</h3>
            <p className="text-xs text-gray-500 mt-0.5">{totalPhotos} total photos</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingTopic(true)}
            className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          >
            <Icon name="circle-plus" style="solid" />
          </button>
        </div>

        {/* Add Topic Input */}
        {isAddingTopic && (
          <div className="mb-4 p-4 bg-gray-50 rounded-xl">
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
              placeholder="Enter topic name..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={handleAddTopic} className="flex-1">
                Add Topic
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
        <div className="flex-1 overflow-y-auto space-y-3">
          {topics.map(topic => (
            <TopicItem
              key={topic.id}
              topic={topic}
              isSelected={topic.id === selectedTopicId}
              photoCount={getPhotoCountForTopic(topic.id)}
              onSelect={() => setSelectedTopicId(topic.id)}
              onDelete={() => handleDeleteTopic(topic.id)}
              onEdit={name => handleEditTopic(topic.id, name)}
            />
          ))}

          {topics.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Icon name="folder-open" className="text-2xl text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No topics yet</p>
              <p className="text-xs text-gray-400 mt-1">Create a topic to start adding photos</p>
            </div>
          )}
        </div>
      </div>

      {/* Vertical Divider */}
      <div className="w-px bg-gray-100" />

      {/* Right Panel - Photo Grid */}
      <div
        className="flex-1 flex flex-col"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {/* Topic Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Topic:</span>
              <select
                value={selectedTopicId}
                onChange={e => setSelectedTopicId(e.target.value)}
                className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[200px]"
              >
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Layout Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Layout:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {LAYOUT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleLayoutChange(option.value)}
                    className={clsx(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      selectedTopic?.layout === option.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {option.value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Icon name="eye" className="mr-1.5" />
              Preview
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowPhotoSourceModal(true)}
            >
              <Icon name="plus" className="mr-1.5" />
              Add Photos
            </Button>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto">
          {isDragging ? (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-primary rounded-xl bg-primary/5">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Icon name="cloud-arrow-down" className="text-2xl text-primary" />
                </div>
                <p className="text-lg font-medium text-primary">Drop photos here</p>
                <p className="text-sm text-primary/70">Release to upload</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  onDelete={() => handleDeletePhoto(photo.id)}
                  onView={() => setPreviewPhoto(photo)}
                  onEditDescription={desc => handleEditPhotoDescription(photo.id, desc)}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isDragging && topicPhotos.length === 0 && (
            <div className="text-center py-12 mt-4">
              <p className="text-sm text-gray-500">
                No photos in this topic yet. Click "Add Photos" to get started.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {topicPhotos.length} {topicPhotos.length === 1 ? 'photo' : 'photos'} in this topic
          </p>
          <div className="flex gap-2">
            <Button variant="ghost">Cancel</Button>
            <Button variant="primary">Save Changes</Button>
          </div>
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

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
          >
            <Icon name="xmark" className="text-2xl" />
          </button>
          <img
            src={previewPhoto.src}
            alt={previewPhoto.name}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
            <p className="text-sm font-medium">{previewPhoto.name}</p>
            {previewPhoto.description && (
              <p className="text-xs text-white/70 mt-1">{previewPhoto.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoTab;
