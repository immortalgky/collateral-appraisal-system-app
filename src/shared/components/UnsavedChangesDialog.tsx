import type { Blocker } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';

interface UnsavedChangesDialogProps {
  blocker: Blocker;
}

const UnsavedChangesDialog = ({ blocker }: UnsavedChangesDialogProps) => {
  if (blocker.state !== 'blocked') return null;

  return (
    <ConfirmDialog
      isOpen
      onClose={() => blocker.reset?.()}
      onConfirm={() => blocker.proceed?.()}
      title="Unsaved Changes"
      message="You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost."
      confirmText="Leave"
      cancelText="Stay"
      variant="warning"
    />
  );
};

export default UnsavedChangesDialog;
