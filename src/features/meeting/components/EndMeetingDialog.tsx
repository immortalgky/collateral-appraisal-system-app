import toast from 'react-hot-toast';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useEndMeeting } from '../api/meetings';

interface EndMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  itemCount: number;
}

const EndMeetingDialog = ({ isOpen, onClose, meetingId, itemCount }: EndMeetingDialogProps) => {
  const endMeeting = useEndMeeting();

  const handleClose = () => {
    if (!endMeeting.isPending) onClose();
  };

  const handleConfirm = () => {
    endMeeting.mutate(
      { id: meetingId },
      {
        onSuccess: () => {
          toast.success(`Released ${itemCount} appraisal${itemCount === 1 ? '' : 's'} for voting`);
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to end meeting');
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="End Meeting" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Icon
            name="triangle-exclamation"
            style="solid"
            className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
          />
          <p className="text-sm text-amber-800">
            Releasing <strong>{itemCount}</strong> appraisal{itemCount === 1 ? '' : 's'} to the
            committee for voting. This cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={endMeeting.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={endMeeting.isPending}>
            {endMeeting.isPending ? 'Releasing...' : 'Release for Voting'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EndMeetingDialog;
