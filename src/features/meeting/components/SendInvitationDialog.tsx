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
  meetingNo: string;
  /** When true, renders as a resend confirmation (idempotent on the backend). */
  isResend?: boolean;
  onSuccess?: (response: SendInvitationResponse) => void;
}

const SendInvitationDialog = ({
  isOpen,
  onClose,
  meetingId,
  meetingNo,
  isResend = false,
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
          toast.success(
            isResend
              ? `Invitation re-sent — Meeting No. ${data.meetingNo}`
              : `Invitation emailed — Meeting No. ${data.meetingNo}`,
          );
          onSuccess?.(data);
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || `Failed to ${isResend ? 're-send' : 'send'} invitation`);
        },
      },
    );
  };

  const title = isResend ? 'Resend Invitation' : 'Send Invitation';
  const actionLabel = isResend ? 'Resend Invitation' : 'Send Invitation';
  const pendingLabel = isResend ? 'Resending...' : 'Sending...';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-xs font-medium text-gray-500 uppercase">Meeting No.</span>
          <span className="text-sm font-semibold text-gray-900">{meetingNo}</span>
        </div>

        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Icon
            name="triangle-exclamation"
            style="solid"
            className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
          />
          <p className="text-sm text-amber-800">
            {isResend ? (
              <>
                The invitation will be <strong>re-sent</strong> to all committee members. The
                meeting status will remain unchanged.
              </>
            ) : (
              <>
                The invitation will be emailed to all committee members and the meeting status will
                move to <strong>Invitation Sent</strong>. This action cannot be undone.
              </>
            )}
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
            {sendInvitation.isPending ? pendingLabel : actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SendInvitationDialog;
