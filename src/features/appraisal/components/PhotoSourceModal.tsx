import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';

interface PhotoSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFromDevice: (files: FileList) => void;
  /** Optional — when omitted the "Choose from Gallery" button is hidden. */
  onChooseFromGallery?: () => void;
  title?: string;
  /**
   * Comma-separated extension list for the file picker. Defaults to images only —
   * callers that also accept PDFs (e.g. AppendixTab) must opt in explicitly, otherwise
   * every photo-only surface would start offering documents it cannot handle.
   */
  accept?: string;
}

/** Renders the footer hint from `accept` so the two can never drift apart. */
const describeAccept = (accept: string) =>
  accept
    .split(',')
    .map(ext => ext.trim().replace(/^\./, '').toUpperCase())
    .filter(Boolean)
    .join(', ');

export const PhotoSourceModal = ({
  isOpen,
  onClose,
  onUploadFromDevice,
  onChooseFromGallery,
  title,
  accept = '.jpg,.jpeg,.png',
}: PhotoSourceModalProps) => {
  const { t } = useTranslation('appraisal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escape closes it, like the other dialogs
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadFromDevice(files);
      onClose();
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    onChooseFromGallery?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-(--palette-surface) rounded-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-(--palette-line)">
          <h2 className="text-lg font-semibold text-(--palette-ink)">
            {title ?? t('photoSourceModal.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('photoSourceModal.close')}
            className="p-2 text-(--palette-gray-400) hover:text-(--palette-gray-600) hover:bg-(--palette-surface-3) rounded-lg transition-colors"
          >
            <Icon name="xmark" className="text-lg" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-3">
          {/* Upload from Device */}
          <button
            type="button"
            onClick={handleUploadClick}
            className="w-full flex items-center gap-4 p-4 border border-(--palette-line) rounded-xl hover:bg-(--palette-surface-2) hover:border-primary/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Icon name="upload" className="text-xl text-(--palette-primary-text)" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-(--palette-ink)">
                {t('photoSourceModal.uploadTitle')}
              </p>
              <p className="text-xs text-(--palette-gray-500) mt-0.5">
                {t('photoSourceModal.uploadHint')}
              </p>
            </div>
            <Icon
              name="chevron-right"
              className="ml-auto text-(--palette-gray-400) group-hover:text-(--palette-primary-text) transition-colors"
            />
          </button>

          {/* Choose from Gallery — only rendered when a gallery handler is provided */}
          {onChooseFromGallery && (
            <button
              type="button"
              onClick={handleGalleryClick}
              className="w-full flex items-center gap-4 p-4 border border-(--palette-line) rounded-xl hover:bg-(--palette-surface-2) hover:border-primary/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-500/30 transition-colors">
                <Icon name="images" className="text-xl text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-(--palette-ink)">
                  {t('photoSourceModal.galleryTitle')}
                </p>
                <p className="text-xs text-(--palette-gray-500) mt-0.5">
                  {t('photoSourceModal.galleryHint')}
                </p>
              </div>
              <Icon
                name="chevron-right"
                className="ml-auto text-(--palette-gray-400) group-hover:text-(--palette-primary-text) transition-colors"
              />
            </button>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Footer Note */}
        <div className="px-4 pb-4">
          <p className="text-xs text-(--palette-gray-400) text-center">
            {t('photoSourceModal.supports', { types: describeAccept(accept) })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhotoSourceModal;
