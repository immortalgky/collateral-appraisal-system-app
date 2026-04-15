import toast from 'react-hot-toast';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useSendInvitation } from '../api/meetings';
import type { SendInvitationResponse } from '../api/types';

interface SendInvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  onSuccess?: (response: SendInvitationResponse) => void;
}

const SendInvitationDialog = ({
  isOpen,
  onClose,
  meetingId,
  onSuccess,
}: SendInvitationDialogProps) => {
  const sendInvitation = useSendInvitation();

  const handleClose = () => {
    if (!sendInvitation.isPending) onClose();
  };

  const handleConfirm = () => {
    sendInvitation.mutate(
      { id: meetingId },
      {
        onSuccess: data => {
          toast.success(`Invitation sent — Meeting No. ${data.meetingNo} assigned`);
          onSuccess?.(data);
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to send invitation');
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Send Invitation" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Icon
            name="triangle-exclamation"
            style="solid"
            className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
          />
          <p className="text-sm text-amber-800">
            Sending the invitation will assign a Meeting No. and move the meeting status to{' '}
            <strong>Scheduled</strong>. This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={sendInvitation.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={sendInvitation.isPending}>
            {sendInvitation.isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SendInvitationDialog;
