import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('meeting');
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
          toast.success(t('toasts.itemRemoved', { label }));
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.itemRemoveFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('dialogs.removeAppraisal')} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Icon
            name="triangle-exclamation"
            style="solid"
            className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
          />
          <p className="text-sm text-amber-800">{t('removeDialog.confirm', { label })}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={removeItem.isPending}
          >
            {t('buttons.cancel')}
          </Button>
          <Button
            variant="danger"
            type="button"
            onClick={handleConfirm}
            disabled={removeItem.isPending}
          >
            {removeItem.isPending ? t('removeDialog.removing') : t('buttons.remove')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RemoveItemDialog;
