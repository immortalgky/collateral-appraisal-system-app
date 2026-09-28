import { useBlocker } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';
import type { UnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesWarning';

interface UnsavedChangesDialogProps {
  blocker: UnsavedChangesGuard;
}

// The blocker lives in the same component as its dialog, so a blocked navigation always has a
// visible prompt to resolve it.
const Guard = ({ skipRef }: { skipRef: UnsavedChangesGuard['skipRef'] }) => {
  const blocker = useBlocker(() => !skipRef.current);

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

// Mounted only while dirty: a clean form registers no router blocker at all.
const UnsavedChangesDialog = ({ blocker }: UnsavedChangesDialogProps) =>
  blocker.when ? <Guard skipRef={blocker.skipRef} /> : null;

export default UnsavedChangesDialog;
