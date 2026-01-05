import Icon from './Icon';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'triangle-exclamation',
      iconBg: 'bg-danger/10',
      iconColor: 'text-danger',
      confirmBtn: 'bg-danger hover:bg-danger/80 text-white',
    },
    warning: {
      icon: 'circle-exclamation',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white',
    },
    info: {
      icon: 'circle-info',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      confirmBtn: 'bg-blue-500 hover:bg-blue-600 text-white',
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
    // Don't auto-close - let the caller handle it (especially for async operations)
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}>
            <Icon name={styles.icon} style="solid" className={`size-7 ${styles.iconColor}`} />
          </div>
          <h3 className="font-semibold text-lg text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBtn}`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose}>
        <button type="button">close</button>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;
