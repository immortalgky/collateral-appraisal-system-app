import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useEndMeeting } from '../api/meetings';

interface EndMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  onSuccess?: () => void;
}

/**
 * Confirm-only dialog that manually ends an in-progress meeting.
 * The backend refuses (409) if any decision item is still pending release or
 * routed back; that ProblemDetails.detail is surfaced via toast.
 */
const EndMeetingDialog = ({ isOpen, onClose, meetingId, onSuccess }: EndMeetingDialogProps) => {
  const { t } = useTranslation('meeting');
  const endMeeting = useEndMeeting();

  const handleClose = () => {
    if (!endMeeting.isPending) onClose();
  };

  const handleConfirm = () => {
    endMeeting.mutate(
      { id: meetingId },
      {
        onSuccess: () => {
          toast.success(t('toasts.meetingEnded'));
          onSuccess?.();
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.meetingEndFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('dialogs.endMeeting')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{t('endDialog.description')}</p>

        <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <Icon
            name="circle-info"
            style="regular"
            className="w-4 h-4 text-gray-400 shrink-0 mt-0.5"
          />
          <p className="text-xs text-gray-500">{t('endDialog.note')}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={endMeeting.isPending}
          >
            {t('buttons.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={endMeeting.isPending}>
            {endMeeting.isPending ? t('endDialog.processing') : t('buttons.confirmEnd')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EndMeetingDialog;
