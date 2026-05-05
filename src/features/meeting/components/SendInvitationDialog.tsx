import toast from 'react-hot-toast';

import EmailCompositionModal from '@/shared/components/EmailCompositionModal';
import { useSendInvitation } from '../api/meetings';
import type { EmailFormValues } from '@/shared/schemas/email';
import type { SendInvitationResponse } from '../api/types';

interface SendInvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  meetingNo: string;
  /** Pre-filled To field — comma-separated member emails. */
  memberEmails?: string;
  /** When true, renders as a resend confirmation (idempotent on the backend). */
  isResend?: boolean;
  onSuccess?: (response: SendInvitationResponse) => void;
}

const SendInvitationDialog = ({
  isOpen,
  onClose,
  meetingId,
  meetingNo: _meetingNo,
  memberEmails,
  isResend = false,
  onSuccess,
}: SendInvitationDialogProps) => {
  const sendInvitation = useSendInvitation();

  const handleSubmit = (values: EmailFormValues) => {
    sendInvitation.mutate(
      {
        id: meetingId,
        from: values.from,
        to: values.to,
        subject: values.subject,
        content: values.content,
        attachments: values.attachments,
      },
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

  return (
    <EmailCompositionModal
      isOpen={isOpen}
      onClose={onClose}
      title={isResend ? 'Resend Invitation' : 'New Email'}
      showAttachments={true}
      showCc={false}
      subjectLabel="Title"
      defaultValues={{ to: memberEmails ?? '' }}
      isPending={sendInvitation.isPending}
      onSubmit={handleSubmit}
    />
  );
};

export default SendInvitationDialog;
