import toast from 'react-hot-toast';

import EmailCompositionModal from '@/shared/components/EmailCompositionModal';
import { useAuthStore } from '@/features/auth/store';
import { useSendInvitation } from '../api/meetings';
import type { EmailFormValues } from '@/shared/schemas/email';
import type { SendInvitationResponse } from '../api/types';

interface SendInvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  meetingNo: string;
  startAt?: string | null;
  location?: string | null;
  /** Pre-filled To field — comma-separated member emails. */
  memberEmails?: string;
  /** When true, renders as a resend confirmation (idempotent on the backend). */
  isResend?: boolean;
  onSuccess?: (response: SendInvitationResponse) => void;
}

function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatThaiTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

const SendInvitationDialog = ({
  isOpen,
  onClose,
  meetingId,
  meetingNo,
  startAt,
  location,
  memberEmails,
  isResend = false,
  onSuccess,
}: SendInvitationDialogProps) => {
  const sendInvitation = useSendInvitation();
  const currentUser = useAuthStore(s => s.user);

  const date = startAt ? formatThaiDate(startAt) : '......';
  const time = startAt ? formatThaiTime(startAt) : '......';
  const room = location ?? '......';

  const defaultValues: Partial<EmailFormValues> = {
    from: currentUser?.email ?? '',
    to: memberEmails ?? 'committee@lhbank.com',
    subject: `ขอเรียนเชิญคณะกรรมการฯ เข้าร่วมประชุมมติ คณะกรรมการกำหนดราคาประเมินหลักประกัน ครั้งที่ ${meetingNo} ในวัน ${date} เวลา ${time}`,
    content: `เรียน คณะกรรมการกำหนดราคาประเมินหลักประกัน\n\n    ขอเรียนเชิญคณะกรรมการฯ เข้าร่วมประชุมมติและกรรมการกำหนดราคาประเมินหลักประกัน\nครั้งที่ ${meetingNo} ในวัน ${date} เวลา ${time} ณ ห้องประชุม ${room}\nหรือหากมีการเปลี่ยนแปลงจะแจ้งอีกครั้งภายหลังค่ะ\n\nจึงเรียนมาเพื่อโปรดทราบ\n${currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}`,
    attachments: ['Agenda Meeting'],
  };

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
      defaultValues={defaultValues}
      isPending={sendInvitation.isPending}
      onSubmit={handleSubmit}
    />
  );
};

export default SendInvitationDialog;
