import { useState, useCallback, useLayoutEffect, useEffect, useRef } from 'react';
import Icon from '@/shared/components/Icon';

export interface PreviewablePhoto {
  id: string;
  src: string;
  fileName?: string;
  caption?: string | null;
  isInUse?: boolean;
  fileExtension?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
}

interface PhotoPreviewModalProps<T extends PreviewablePhoto> {
  photo: T;
  photos: T[];
  isThumbnail?: boolean;
  onClose: () => void;
  onNavigate: (photo: T) => void;
  onSetThumbnail?: () => void;
  onSaveDescription?: (caption: string) => void;
  isSavingDescription?: boolean;
  onDelete?: () => void;
  showInUseStatus?: boolean;
}

function PhotoPreviewModal<T extends PreviewablePhoto>({
  photo,
  photos,
  isThumbnail = false,
  onClose,
  onNavigate,
  onSetThumbnail,
  onSaveDescription,
  isSavingDescription = false,
  onDelete,
  showInUseStatus = true,
}: PhotoPreviewModalProps<T>) {
  const currentIndex = photos.findIndex(p => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset editing state when photo changes
  useEffect(() => {
    setIsEditing(false);
    setDraft(photo.caption ?? '');
  }, [photo.id]);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    setDraft(photo.caption ?? '');
    setIsEditing(true);
  }, [photo.caption]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setDraft(photo.caption ?? '');
  }, [photo.caption]);

  const saveDescription = useCallback(() => {
    if (!onSaveDescription) return;
    onSaveDescription(draft);
    setIsEditing(false);
  }, [onSaveDescription, draft]);

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
      // Don't handle nav keys while editing
      if (isEditing) {
        if (e.key === 'Escape') {
          cancelEditing();
        } else if (e.key === 'Enter') {
          saveDescription();
        }
        return;
      }

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
  }, [onClose, goToPrev, goToNext, isEditing, cancelEditing, saveDescription]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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
          {onSetThumbnail && !isThumbnail && (
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
          {onDelete && (
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
          )}
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
          title="Previous"
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
          title="Next"
        >
          <Icon name="chevron-right" className="text-2xl group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Image */}
      <img
        src={photo.src}
        alt={photo.fileName || 'Photo'}
        className="max-w-[85vw] max-h-[80vh] object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />

      {/* Bottom Info Bar */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-xl max-w-2xl w-full">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon name="image" className="text-white/70" />
              </div>
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      placeholder="Enter description..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                      disabled={isSavingDescription}
                    />
                    <button
                      type="button"
                      onClick={saveDescription}
                      disabled={isSavingDescription}
                      className="p-1.5 bg-green-500/80 hover:bg-green-500 rounded-lg text-white transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      {isSavingDescription ? (
                        <Icon name="spinner" style="solid" className="text-sm animate-spin" />
                      ) : (
                        <Icon name="check" style="solid" className="text-sm" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={isSavingDescription}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <Icon name="xmark" className="text-sm" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate flex-1">
                      {photo.caption || photo.fileName || 'Photo'}
                    </p>
                    {onSaveDescription && (
                      <button
                        type="button"
                        onClick={startEditing}
                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/60 hover:text-white transition-colors flex-shrink-0"
                        title="Edit description"
                      >
                        <Icon name="pen-to-square" className="text-sm" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Metadata pills */}
            <div className="flex items-center gap-2 mt-2.5 ml-14">
              {showInUseStatus && photo.isInUse != null && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${photo.isInUse ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/50'}`}>
                  <Icon name={photo.isInUse ? 'check-circle' : 'clock'} className="text-[10px]" />
                  {photo.isInUse ? 'In Use' : 'Not Used'}
                </span>
              )}
              {(photo.fileExtension || photo.mimeType) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/10 text-white/60 uppercase">
                  {photo.fileExtension || photo.mimeType?.split('/')[1] || ''}
                </span>
              )}
              {photo.fileSizeBytes != null && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/10 text-white/60">
                  {photo.fileSizeBytes < 1024 * 1024
                    ? `${(photo.fileSizeBytes / 1024).toFixed(1)} KB`
                    : `${(photo.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`}
                </span>
              )}
              {photo.fileName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/10 text-white/40 truncate max-w-[200px]">
                  {photo.fileName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center justify-center gap-4 mt-3 text-white/40 text-xs">
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 bg-white/10 rounded">&#8592;</kbd>
            <kbd className="px-2 py-0.5 bg-white/10 rounded">&#8594;</kbd>
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
}

export default PhotoPreviewModal;
