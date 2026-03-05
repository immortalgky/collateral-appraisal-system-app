import Icon from '@shared/components/Icon';

interface PhotoDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlink: () => void;
  onDeletePermanently: () => void;
  isLoading?: boolean;
}

export const PhotoDeleteConfirmModal = ({
  isOpen,
  onClose,
  onUnlink,
  onDeletePermanently,
  isLoading = false,
}: PhotoDeleteConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open z-[60]">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <Icon name="circle-exclamation" style="solid" className="size-7 text-amber-500" />
          </div>
          <h3 className="font-semibold text-lg text-gray-900 mb-2">Remove Photo</h3>
          <p className="text-sm text-gray-500 mb-6">
            How would you like to remove this photo from the property?
          </p>
          <div className="flex flex-col gap-3 w-full">
            <button
              type="button"
              onClick={onUnlink}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Icon name="link-slash" className="size-4" />
              Unlink from property
            </button>
            <button
              type="button"
              onClick={onDeletePermanently}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-danger hover:bg-danger/80 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                <>
                  <Icon name="trash" className="size-4" />
                  Delete permanently
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full px-4 py-2.5 text-gray-500 hover:text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Unlinking keeps the photo in the gallery. Deleting removes it everywhere.
          </p>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose}>
        <button type="button">close</button>
      </div>
    </dialog>
  );
};

export default PhotoDeleteConfirmModal;
