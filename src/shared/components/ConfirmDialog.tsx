import type { ReactNode } from 'react';
import Icon from './Icon';
import { useLoadingStore } from '@shared/store';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'primary';
  isLoading?: boolean;
  /**
   * When true, while isLoading the body message is replaced by the live
   * activity-completion progress text (e.g. "Checking: …") from the loading store,
   * so the step being processed is visible even though this dialog sits above the
   * global loading overlay.
   */
  showActivityProgress?: boolean;
  /**
   * Rich body slot. When provided, replaces the plain message paragraph.
   * The dialog box also widens to max-w-md to accommodate richer content.
   */
  children?: ReactNode;
  /**
   * When true (and not loading), the header shows an error icon instead of the
   * variant icon — so a failure state doesn't display a green success check.
   * The confirm button keeps its variant colour (so Cancel/retry stay normal).
   */
  hasError?: boolean;
  /**
   * When true (and not loading, not hasError), the header shows an amber warning
   * icon instead of the variant icon. Also replaces the built-in footer buttons
   * with `customFooter` when provided, so the caller can supply a single
   * "Continue anyway" primary action without a competing "Submit" button.
   */
  hasWarning?: boolean;
  /**
   * Replaces the built-in Cancel/Confirm button row when `hasWarning` is true.
   * Ignored in all other states so existing callers are unaffected.
   */
  customFooter?: ReactNode;
  /** Text shown on the confirm button while loading (defaults to "Processing..."). */
  loadingText?: string;
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
  showActivityProgress = false,
  children,
  hasError = false,
  hasWarning = false,
  customFooter,
  loadingText,
}: ConfirmDialogProps) => {
  const progressMessage = useLoadingStore(s => s.message);
  if (!isOpen) return null;

  const showProgress = !children && isLoading && showActivityProgress && !!progressMessage;
  const bodyMessage = showProgress ? progressMessage : message;

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
    primary: {
      icon: 'circle-check',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      confirmBtn: 'bg-primary hover:bg-primary/80 text-white',
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
    // Don't auto-close - let the caller handle it (especially for async operations)
  };

  return (
    <dialog className="modal modal-open z-[60]">
      <div className={`modal-box bg-white rounded-2xl shadow-xl ${children ? 'max-w-md' : 'max-w-sm'}`}>
        <div className="flex flex-col items-center text-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              isLoading
                ? 'bg-primary/10'
                : hasError
                  ? 'bg-danger/10'
                  : hasWarning
                    ? 'bg-amber-50'
                    : styles.iconBg
            }`}
          >
            {isLoading ? (
              <Icon name="spinner" style="solid" className="size-7 text-primary animate-spin" />
            ) : hasError ? (
              <Icon name="triangle-exclamation" style="solid" className="size-7 text-danger" />
            ) : hasWarning ? (
              <Icon name="triangle-exclamation" style="solid" className="size-7 text-amber-500" />
            ) : (
              <Icon name={styles.icon} style="solid" className={`size-7 ${styles.iconColor}`} />
            )}
          </div>
          <h3 className="font-semibold text-lg text-gray-900 mb-2">{title}</h3>
          {children ? (
            <div className="w-full mb-6">{children}</div>
          ) : (
            <p className={`text-sm mb-6 ${showProgress ? 'text-primary animate-pulse' : 'text-gray-500'}`}>
              {bodyMessage}
            </p>
          )}
          {hasWarning && !isLoading && customFooter ? (
            <div className="flex gap-3 w-full">{customFooter}</div>
          ) : (
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
                    <Icon name="spinner" style="solid" className="size-4 animate-spin shrink-0" />
                    <span className="truncate">{loadingText ?? 'Processing...'}</span>
                  </span>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      <div
        className="modal-backdrop bg-black/40"
        onClick={isLoading ? undefined : onClose}
      >
        <button type="button" disabled={isLoading}>
          close
        </button>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;
