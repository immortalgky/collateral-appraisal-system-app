import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

export interface Photo {
  id: string;
  documentId: string | null;
  fileName: string;
  file?: File;
  url?: string;
  fullSrc?: string;
  isUploading?: boolean;
  mappingId?: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onAddClick: () => void;
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

// The strip's tile sizes in rem (DESIGN.md 17.9), so the visible count follows the root font size.
const CARD_REM = 9; // w-36
const UPLOAD_BTN_REM = 10.5714; // w-[10.5714rem]
const GAP_REM = 0.5; // gap-2
const rootFontPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onAddClick,
  onDelete,
  onSetThumbnail,
  onPreview,
  thumbnailId,
  selectedId,
  onSelect,
  disabled = false,
}) => {
  const { t } = useTranslation('appraisal');
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
    const rem = rootFontPx();
    const gap = GAP_REM * rem;
    const availableForPhotos = containerWidth - UPLOAD_BTN_REM * rem - gap;
    if (availableForPhotos <= 0) return 0;
    const count = Math.floor((availableForPhotos + gap) / (CARD_REM * rem + gap));
    return Math.max(1, count);
  }, [containerWidth, photos.length]);

  const hasOverflow = photos.length > maxVisible;
  const visiblePhotos = hasOverflow ? photos.slice(0, maxVisible) : photos;
  const remainingCount = photos.length - maxVisible + 1;

  const handleContextMenu = useCallback((e: React.MouseEvent, photoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Always open the context menu; destructive items are hidden inside when disabled
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
        {/* Add Button; a read page has none, and says so when there are no photos */}
        {disabled ? (
          photos.length === 0 && (
            <div className="flex h-28 w-[10.5714rem] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-(--palette-line-strong) bg-(--palette-surface-2) text-xs text-(--palette-ink-2)">
              <Icon name="image" style="solid" className="text-[1.25rem] text-(--palette-ink-3)" />
              {t('photoGallery.noPhotos')}
            </div>
          )
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={onAddClick}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') onAddClick();
            }}
            className={clsx(
              'flex flex-col items-center justify-center',
              'w-[10.5714rem] h-28 shrink-0',
              'bg-(--palette-surface-2) border border-dashed border-(--palette-line-strong) rounded-lg',
              'cursor-pointer hover:bg-(--palette-surface-3) transition-colors',
            )}
          >
            <Icon
              name="plus"
              style="solid"
              className="text-[1.25rem] text-(--palette-gray-400) mb-1"
            />
            <span className="text-xs text-(--palette-gray-500) text-center px-2">
              {t('photoGallery.addPicture')}
            </span>
          </div>
        )}

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
                <div className="absolute inset-0 flex items-center justify-center bg-(--palette-surface-3)">
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
                <div className="absolute top-[0.2857rem] left-[0.2857rem] rounded bg-amber-400 px-1.5 text-xs font-semibold leading-normal text-warning-content">
                  {t('photoGallery.cover')}
                </div>
              )}

              {/* Uploading Overlay */}
              {photo.isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <span className="text-xs text-white font-medium">
                    {t('photoGallery.uploading')}
                  </span>
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
            className="fixed z-50 bg-(--palette-surface) rounded-lg shadow-lg border border-(--palette-line) py-1 min-w-[160px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-(--palette-ink) hover:bg-(--palette-surface-3) flex items-center gap-2"
              onClick={() => handleContextMenuAction('view')}
            >
              <Icon name="eye" style="regular" className="w-4 h-4" />
              {t('photoGallery.view')}
            </button>
            {!disabled && (
              <>
                <button
                  type="button"
                  className={clsx(
                    'w-full px-4 py-2 text-left text-sm hover:bg-(--palette-surface-3) flex items-center gap-2',
                    thumbnailId === contextMenu.photoId
                      ? 'text-(--palette-warn)'
                      : 'text-(--palette-ink)',
                  )}
                  onClick={() => handleContextMenuAction('thumbnail')}
                >
                  <Icon name="image" style="regular" className="w-4 h-4" />
                  {thumbnailId === contextMenu.photoId
                    ? t('photoGallery.removeCover')
                    : t('photoGallery.setCover')}
                </button>
                <div className="border-t border-(--palette-line-soft) my-1" />
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-(--palette-danger) hover:bg-(--palette-req-wash) flex items-center gap-2"
                  onClick={() => handleContextMenuAction('delete')}
                >
                  <Icon name="trash" style="regular" className="w-4 h-4" />
                  {t('photoGallery.delete')}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PhotoGallery;
