import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  isLoading?: boolean;
}

export const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading = false,
}: DeleteConfirmationModalProps) => {
  const { t } = useTranslation(['appraisal', 'common']);
  const resolvedTitle = title ?? t('deleteConfirmationModal.title');
  const resolvedMessage = message ?? t('deleteConfirmationModal.message');
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={resolvedTitle} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Icon name="exclamation-triangle" className="text-red-600 text-xl" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600">{resolvedMessage}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? t('common:status.loading') : t('deleteConfirmationModal.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
