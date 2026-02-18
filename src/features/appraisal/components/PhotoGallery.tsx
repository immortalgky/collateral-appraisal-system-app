import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import FileInput from '@/shared/components/inputs/FileInput';

export interface Photo {
  id: string;
  documentId: string | null;
  fileName: string;
  file?: File;
  url?: string;
  fullSrc?: string;
  isUploading?: boolean;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onUpload: (file: File) => void;
  onDelete: (photoId: string) => void;
  onSetThumbnail: (photoId: string) => void;
  onPreview: (photo: Photo) => void;
  thumbnailId?: string | null;
  selectedId?: string | null;
  onSelect?: (photoId: string | null) => void;
  disabled?: boolean;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  photoId: string | null;
}

const CARD_WIDTH = 144; // w-36
const UPLOAD_BTN_WIDTH = 148; // w-[148px]
const GAP = 8; // gap-2

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onUpload,
  onDelete,
  onSetThumbnail,
  onPreview,
  thumbnailId,
  selectedId,
  onSelect,
  disabled = false,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    photoId: null,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Calculate how many photo cards fit
  const maxVisible = useMemo(() => {
    if (containerWidth === 0 || photos.length === 0) return photos.length;
    const availableForPhotos = containerWidth - UPLOAD_BTN_WIDTH - GAP;
    if (availableForPhotos <= 0) return 0;
    const count = Math.floor((availableForPhotos + GAP) / (CARD_WIDTH + GAP));
    return Math.max(1, count);
  }, [containerWidth, photos.length]);

  const hasOverflow = photos.length > maxVisible;
  const visiblePhotos = hasOverflow ? photos.slice(0, maxVisible) : photos;
  const remainingCount = photos.length - maxVisible + 1;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          onUpload(file);
        }
      });
    }
    // Reset input
    e.target.value = '';
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, photoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      photoId,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false, photoId: null }));
  }, []);

  const handleClick = useCallback(
    (photo: Photo) => {
      if (onSelect) {
        onSelect(selectedId === photo.id ? null : photo.id);
      } else if (!photo.isUploading) {
        onPreview(photo);
      }
    },
    [onSelect, selectedId, onPreview],
  );

  const handleContextMenuAction = useCallback(
    (action: 'view' | 'thumbnail' | 'delete') => {
      if (!contextMenu.photoId) return;

      const photo = photos.find(p => p.id === contextMenu.photoId);

      switch (action) {
        case 'view':
          if (photo) onPreview(photo);
          break;
        case 'thumbnail':
          onSetThumbnail(contextMenu.photoId);
          break;
        case 'delete':
          onDelete(contextMenu.photoId);
          break;
      }
      closeContextMenu();
    },
    [contextMenu.photoId, photos, onPreview, onSetThumbnail, onDelete, closeContextMenu],
  );

  // Close context menu when clicking outside
  const handleContainerClick = useCallback(() => {
    if (contextMenu.isOpen) {
      closeContextMenu();
    }
  }, [contextMenu.isOpen, closeContextMenu]);

  const getPhotoUrl = useCallback((photo: Photo) => {
    if (photo.file) {
      return URL.createObjectURL(photo.file);
    }
    return photo.url || '';
  }, []);

  return (
    <div className="relative min-w-0" onClick={handleContainerClick}>
      <div ref={containerRef} className="flex items-center gap-2 overflow-hidden pb-2">
      {/* Upload Button */}
      <FileInput
        onChange={handleFileChange}
        accept="image/*"
        multiple
        disabled={disabled}
        fullWidth={false}
      >
        <div
          className={clsx(
            'flex flex-col items-center justify-center',
            'w-[148px] h-28 shrink-0',
            'bg-gray-50 border border-dashed border-gray-300 rounded-lg',
            'cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition-colors',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Icon name="plus" style="solid" className="w-5 h-5 text-gray-400 mb-1" />
          <span className="text-xs text-gray-500 text-center px-2">Click to add picture</span>
        </div>
      </FileInput>

      {/* Photo Thumbnails */}
      {visiblePhotos.map((photo, index) => {
        const isSelected = selectedId === photo.id;
        const isThumbnail = thumbnailId === photo.id;
        const isLastAndOverflow = hasOverflow && index === visiblePhotos.length - 1;

        return (
          <div
            key={photo.id}
            className={clsx(
              'relative w-36 h-28 shrink-0 rounded-lg overflow-hidden cursor-pointer',
              'transition-all duration-200',
              isSelected && 'ring-4 ring-primary',
              isThumbnail && !isSelected && !isLastAndOverflow && 'ring-2 ring-amber-400',
              photo.isUploading && 'opacity-60',
            )}
            onClick={() => (isLastAndOverflow ? onPreview(photo) : handleClick(photo))}
            onContextMenu={e => !isLastAndOverflow && handleContextMenu(e, photo.id)}
          >
            {photo.isUploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <img
                src={getPhotoUrl(photo)}
                alt={photo.fileName}
                className="w-full h-full object-cover"
                onLoad={e => {
                  if (photo.file) {
                    URL.revokeObjectURL((e.target as HTMLImageElement).src);
                  }
                }}
              />
            )}

            {/* "+N" overlay on last visible card when overflow */}
            {isLastAndOverflow && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="text-white text-lg font-semibold">+{remainingCount}</span>
              </div>
            )}

            {/* Cover Badge */}
            {isThumbnail && !photo.isUploading && !isLastAndOverflow && (
              <div className="absolute top-1 left-1 bg-amber-400 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                Cover
              </div>
            )}

            {/* Uploading Overlay */}
            {photo.isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="text-xs text-white font-medium">Uploading...</span>
              </div>
            )}
          </div>
        );
      })}

      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && contextMenu.photoId && (
        <>
          {/* Backdrop to close menu */}
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} />

          {/* Menu */}
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => handleContextMenuAction('view')}
            >
              <Icon name="eye" style="regular" className="w-4 h-4" />
              View
            </button>
            <button
              type="button"
              className={clsx(
                'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2',
                thumbnailId === contextMenu.photoId ? 'text-amber-600' : 'text-gray-700',
              )}
              onClick={() => handleContextMenuAction('thumbnail')}
            >
              <Icon name="image" style="regular" className="w-4 h-4" />
              {thumbnailId === contextMenu.photoId ? 'Remove as cover' : 'Set as cover'}
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              onClick={() => handleContextMenuAction('delete')}
            >
              <Icon name="trash" style="regular" className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PhotoGallery;
