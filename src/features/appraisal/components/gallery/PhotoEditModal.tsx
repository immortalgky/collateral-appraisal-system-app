import { useState, useEffect } from 'react';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import type { GalleryImage } from '../../types/gallery';

interface PhotoEditModalProps {
  isOpen: boolean;
  image: GalleryImage | null;
  onClose: () => void;
  onSave: (data: { caption: string }) => void;
  isLoading?: boolean;
}

const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getFileType = (image: GalleryImage): string => {
  if (image.fileExtension) return image.fileExtension.toUpperCase();
  if (image.mimeType) {
    const sub = image.mimeType.split('/')[1];
    if (sub) return sub.toUpperCase();
  }
  return '-';
};

const PhotoEditModal = ({ isOpen, image, onClose, onSave, isLoading = false }: PhotoEditModalProps) => {
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (image) {
      setCaption(image.caption ?? '');
    }
  }, [image]);

  if (!isOpen || !image) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ caption });
  };

  return (
    <dialog className="modal modal-open z-[60]">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            {/* Thumbnail preview */}
            <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-100">
              <img
                src={image.thumbnailSrc}
                alt={image.alt}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Filename (read-only) */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Filename</label>
              <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg truncate">
                {image.fileName || image.alt}
              </p>
            </div>

            {/* Metadata row: Status, Type, Size */}
            <div className="grid grid-cols-3 gap-3">
              {/* Status */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                <span
                  className={clsx(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
                    image.isInUse
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  <Icon
                    name={image.isInUse ? 'check-circle' : 'clock'}
                    className="text-[10px]"
                  />
                  {image.isInUse ? 'In Use' : 'Not Used'}
                </span>
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg text-center">
                  {getFileType(image)}
                </p>
              </div>

              {/* Size */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Size</label>
                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg text-center">
                  {formatFileSize(image.fileSizeBytes)}
                </p>
              </div>
            </div>

            {/* Description / Caption (editable) */}
            <div>
              <label htmlFor="photo-caption" className="text-xs font-medium text-gray-500 mb-1 block">
                Description
              </label>
              <textarea
                id="photo-caption"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Enter a description for this photo..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose}>
        <button type="button">close</button>
      </div>
    </dialog>
  );
};

export default PhotoEditModal;
