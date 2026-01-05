import { useCallback, useEffect, useState } from 'react';
import Icon from '@/shared/components/Icon';
import type { Photo } from './PhotoGallery';

interface PhotoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: Photo | null;
  photos: Photo[];
  onNavigate: (photo: Photo) => void;
  onSetThumbnail: (photoId: string) => void;
  onDelete: (photoId: string) => void;
  thumbnailId?: string | null;
}

const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  isOpen,
  onClose,
  photo,
  photos,
  onNavigate,
  onSetThumbnail,
  onDelete,
  thumbnailId,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');

  const currentIndex = photo ? photos.findIndex(p => p.id === photo.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  // Generate image URL
  useEffect(() => {
    if (photo?.file) {
      const url = URL.createObjectURL(photo.file);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (photo?.url) {
      setImageUrl(photo.url);
    }
    return undefined;
  }, [photo]);

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(photos[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, photos, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(photos[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, photos, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          handleNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !photo) return null;

  const isThumbnail = thumbnailId === photo.id;

  const formatFileSize = (file?: File) => {
    if (!file) return '';
    const mb = file.size / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(1)} MB`;
    }
    const kb = file.size / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
        <div className="flex items-center gap-4">
          <span className="text-white text-sm font-medium">{photo.fileName}</span>
          {photo.file && (
            <span className="text-white/60 text-sm">{formatFileSize(photo.file)}</span>
          )}
          {isThumbnail && (
            <span className="bg-amber-400 text-white text-xs px-2 py-0.5 rounded font-medium">
              Thumbnail
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSetThumbnail(photo.id)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title={isThumbnail ? 'Remove as thumbnail' : 'Set as thumbnail'}
          >
            <Icon name="image" style={isThumbnail ? 'solid' : 'regular'} className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete(photo.id);
              onClose();
            }}
            className="p-2 text-white/80 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
            title="Delete"
          >
            <Icon name="trash" style="regular" className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <Icon name="xmark" style="solid" className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="relative max-w-[90vw] max-h-[80vh] z-10">
        <img
          src={imageUrl}
          alt={photo.fileName}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
      </div>

      {/* Navigation Arrows */}
      {hasPrev && (
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
          title="Previous (←)"
        >
          <Icon name="chevron-left" style="solid" className="w-6 h-6" />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
          title="Next (→)"
        >
          <Icon name="chevron-right" style="solid" className="w-6 h-6" />
        </button>
      )}

      {/* Footer with counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <span className="text-white/80 text-sm bg-black/50 px-4 py-2 rounded-full">
          {currentIndex + 1} / {photos.length}
        </span>
      </div>
    </div>
  );
};

export default PhotoPreviewModal;
