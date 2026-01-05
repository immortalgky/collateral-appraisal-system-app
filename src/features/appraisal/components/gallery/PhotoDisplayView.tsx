import { useEffect, useCallback } from 'react';
import Icon from '@shared/components/Icon';
import type { GalleryImage } from '../../types/gallery';

interface PhotoDisplayViewProps {
  image: GalleryImage;
  images: GalleryImage[];
  onClose: () => void;
  onNavigate: (image: GalleryImage) => void;
  onDelete?: (image: GalleryImage) => void;
}

export const PhotoDisplayView = ({
  image,
  images,
  onClose,
  onNavigate,
  onDelete,
}: PhotoDisplayViewProps) => {
  const currentIndex = images.findIndex(img => img.id === image.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      onNavigate(images[currentIndex - 1]);
    }
  }, [hasPrevious, currentIndex, images, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(images[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, images, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div
        className="bg-white rounded-lg w-[1120px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <p className="text-base font-medium text-black">
            {image.fileName || image.alt}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <Icon name="xmark" className="text-lg" />
          </button>
        </div>

        {/* Image Container */}
        <div className="relative flex-1 bg-[#f1f5f7] flex items-center justify-center min-h-[372px]">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={image.src}
              alt={image.alt}
              className="max-w-full max-h-[60vh] object-contain rounded-lg border-2 border-white shadow"
            />
          </div>

          {/* Previous Button */}
          {hasPrevious && (
            <button
              type="button"
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Icon name="circle-chevron-left" style="solid" className="text-2xl" />
            </button>
          )}

          {/* Next Button */}
          {hasNext && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Icon name="circle-chevron-right" style="solid" className="text-2xl" />
            </button>
          )}
        </div>

        {/* Description Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-black">Description</p>
              <p className="text-xs text-gray-400">
                {currentIndex + 1} / {images.length}
              </p>
            </div>
            <p className="text-xs text-gray-700">
              {image.description || 'No description available'}
            </p>
            {image.propertyType && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/80 bg-primary/80 px-2 py-0.5 rounded">
                  {image.propertyType}
                </span>
                {image.groupName && (
                  <span className="text-xs text-gray-500">{image.groupName}</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {onDelete && (
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => onDelete(image)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Icon name="trash" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoDisplayView;
