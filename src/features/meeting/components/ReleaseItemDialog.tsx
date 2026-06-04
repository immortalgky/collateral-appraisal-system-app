import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useReleaseMeetingItem } from '../api/meetings';

interface ReleaseItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  appraisalId: string;
  appraisalNo: string | null;
}

const ReleaseItemDialog = ({
  isOpen,
  onClose,
  meetingId,
  appraisalId,
  appraisalNo,
}: ReleaseItemDialogProps) => {
  const { t } = useTranslation('meeting');
  const releaseItem = useReleaseMeetingItem();

  const handleClose = () => {
    if (!releaseItem.isPending) onClose();
  };

  const handleConfirm = () => {
    releaseItem.mutate(
      { meetingId, appraisalId },
      {
        onSuccess: () => {
          toast.success(t('toasts.itemReleased'));
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.itemReleaseFailed'));
        },
      },
    );
  };

  const label = appraisalNo ?? appraisalId.slice(0, 8);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('dialogs.releaseAppraisal')} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Icon
            name="circle-info"
            style="solid"
            className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"
          />
          <p className="text-sm text-blue-800">{t('releaseDialog.confirm', { label })}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={releaseItem.isPending}
          >
            {t('buttons.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={releaseItem.isPending}>
            {releaseItem.isPending ? t('releaseDialog.releasing') : t('buttons.release')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReleaseItemDialog;
