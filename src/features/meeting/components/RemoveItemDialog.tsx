import toast from 'react-hot-toast';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useRemoveMeetingItem } from '../api/meetings';

interface RemoveItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  appraisalId: string;
  appraisalNo: string | null;
}

const RemoveItemDialog = ({
  isOpen,
  onClose,
  meetingId,
  appraisalId,
  appraisalNo,
}: RemoveItemDialogProps) => {
  const removeItem = useRemoveMeetingItem();
  const label = appraisalNo ?? appraisalId.slice(0, 8);

  const handleClose = () => {
    if (!removeItem.isPending) onClose();
  };

  const handleConfirm = () => {
    removeItem.mutate(
      { id: meetingId, appraisalId },
      {
        onSuccess: () => {
          toast.success(`Appraisal ${label} returned to the queue`);
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to remove appraisal');
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Remove Appraisal" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Icon
            name="triangle-exclamation"
            style="solid"
            className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
          />
          <p className="text-sm text-amber-800">
            Remove <strong>{label}</strong> from this meeting? It will be returned to the meeting
            queue and can be added to another meeting later.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={removeItem.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            type="button"
            onClick={handleConfirm}
            disabled={removeItem.isPending}
          >
            {removeItem.isPending ? 'Removing...' : 'Remove'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RemoveItemDialog;
