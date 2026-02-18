import { useState, useEffect, useMemo } from 'react';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';
import type { GalleryImage } from '../types/gallery';

interface GallerySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedImages: GalleryImage[]) => void;
  images: GalleryImage[];
  multiSelect?: boolean;
  initialSelectedIds?: string[];
  title?: string;
}

// Stable empty array to avoid re-renders
const EMPTY_ARRAY: string[] = [];

export const GallerySelectionModal = ({
  isOpen,
  onClose,
  onSelect,
  images,
  multiSelect = true,
  initialSelectedIds,
  title = 'Choose From Gallery',
}: GallerySelectionModalProps) => {
  // Use stable reference for empty array
  const stableInitialIds = initialSelectedIds ?? EMPTY_ARRAY;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(stableInitialIds)
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Memoize the initial IDs to prevent unnecessary re-renders
  const initialIdsKey = useMemo(() => stableInitialIds.join(','), [stableInitialIds]);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(stableInitialIds));
      setSearchQuery('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialIdsKey]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Filter images by search query (consistent with GalleryTab)
  const filteredImages = useMemo(() => {
    if (!searchQuery) return images;
    const query = searchQuery.toLowerCase();
    return images.filter(
      image =>
        image.fileName?.toLowerCase().includes(query) ||
        image.description?.toLowerCase().includes(query) ||
        image.photoCategory?.toLowerCase().includes(query)
    );
  }, [images, searchQuery]);

  const handleImageClick = (image: GalleryImage) => {
    if (multiSelect) {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(image.id)) {
        newSelected.delete(image.id);
      } else {
        newSelected.add(image.id);
      }
      setSelectedIds(newSelected);
    } else {
      setSelectedIds(new Set([image.id]));
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredImages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredImages.map(img => img.id)));
    }
  };

  const handleConfirm = () => {
    const selectedImages = images.filter(img => selectedIds.has(img.id));
    onSelect(selectedImages);
    onClose();
  };

  if (!isOpen) return null;

  const isAllSelected = filteredImages.length > 0 && selectedIds.size === filteredImages.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Icon name="images" style="solid" className="text-xl text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {images.length} photos available
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Icon name="xmark" className="text-xl" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Icon
                name="magnifying-glass"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Icon name="xmark" className="text-sm" />
                </button>
              )}
            </div>

            {/* Stats & Select All */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-700">{filteredImages.length}</span> of{' '}
                <span className="font-medium text-gray-700">{images.length}</span>
              </div>

              {multiSelect && filteredImages.length > 0 && (
                <>
                  <div className="w-px h-6 bg-gray-200" />
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <div
                      className={clsx(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        isAllSelected
                          ? 'bg-primary border-primary'
                          : 'border-gray-300 hover:border-primary'
                      )}
                    >
                      {isAllSelected && (
                        <Icon name="check" className="text-xs text-white" />
                      )}
                    </div>
                    Select All
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Selection indicator */}
          {selectedIds.size > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''} selected
              </div>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Icon name="images" className="text-3xl text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-500">No photos found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Upload photos to the gallery first'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredImages.map(image => {
                const isSelected = selectedIds.has(image.id);
                return (
                  <div
                    key={image.id}
                    onClick={() => handleImageClick(image)}
                    className={clsx(
                      'group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200',
                      isSelected
                        ? 'ring-3 ring-primary ring-offset-2 scale-[0.98]'
                        : 'hover:ring-2 hover:ring-gray-300 hover:shadow-lg'
                    )}
                  >
                    <img
                      src={image.thumbnailSrc || image.src}
                      alt={image.alt}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Hover overlay */}
                    <div
                      className={clsx(
                        'absolute inset-0 transition-opacity duration-200',
                        isSelected
                          ? 'bg-primary/20'
                          : 'bg-black/0 group-hover:bg-black/20'
                      )}
                    />

                    {/* Selection indicator */}
                    <div
                      className={clsx(
                        'absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-lg',
                        isSelected
                          ? 'bg-primary text-white scale-100'
                          : 'bg-white/90 text-gray-400 border border-gray-200 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100'
                      )}
                    >
                      {isSelected ? (
                        <Icon name="check" style="solid" className="text-sm" />
                      ) : (
                        <span className="text-xs font-medium">+</span>
                      )}
                    </div>

                    {/* Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8">
                      <p className="text-white text-sm font-medium truncate">
                        {image.fileName || image.alt}
                      </p>
                      {image.photoCategory && (
                        <p className="text-white/70 text-xs truncate mt-0.5">
                          {image.photoCategory}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
          <div className="text-sm text-gray-500">
            {selectedIds.size > 0 ? (
              <span>
                <span className="font-medium text-primary">{selectedIds.size}</span> photo
                {selectedIds.size !== 1 ? 's' : ''} ready to add
              </span>
            ) : (
              'Click photos to select them'
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} size="lg">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              size="lg"
            >
              <Icon name="plus" className="mr-2" />
              {multiSelect
                ? `Add ${selectedIds.size} Photo${selectedIds.size !== 1 ? 's' : ''}`
                : 'Select Photo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GallerySelectionModal;
