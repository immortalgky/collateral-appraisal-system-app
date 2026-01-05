import { useRef } from 'react';
import Icon from '@shared/components/Icon';

interface PhotoSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFromDevice: (files: FileList) => void;
  onChooseFromGallery: () => void;
  title?: string;
}

export const PhotoSourceModal = ({
  isOpen,
  onClose,
  onUploadFromDevice,
  onChooseFromGallery,
  title = 'Add Photos',
}: PhotoSourceModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    onChooseFromGallery();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
            className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-primary/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Icon name="upload" className="text-xl text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">
                Upload from Device
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Select photos from your computer or device
              </p>
            </div>
            <Icon
              name="chevron-right"
              className="ml-auto text-gray-400 group-hover:text-primary transition-colors"
            />
          </button>

          {/* Choose from Gallery */}
          <button
            type="button"
            onClick={handleGalleryClick}
            className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-primary/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <Icon name="images" className="text-xl text-purple-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">
                Choose from Gallery
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Select from previously uploaded photos
              </p>
            </div>
            <Icon
              name="chevron-right"
              className="ml-auto text-gray-400 group-hover:text-primary transition-colors"
            />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Footer Note */}
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400 text-center">
            Supports: JPG, PNG, GIF (Max 10MB per file)
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhotoSourceModal;
