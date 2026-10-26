import { useState } from 'react';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useTranslation } from 'react-i18next';

interface BlockReappraisalNotRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const BlockReappraisalNotRequiredModal = ({
  isOpen,
  onClose,
  onConfirm,
}: BlockReappraisalNotRequiredModalProps) => {
  const [remark, setRemark] = useState('');
  const { t } = useTranslation(['blockReappraisal', 'common']);

  const handleClose = () => {
    setRemark('');
    onClose();
  };

  const handleConfirm = () => {
    if (!remark.trim()) return;
    onConfirm(remark.trim());
    setRemark('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('detail.optOutModal.title')} size="sm">
      <div className="flex flex-col gap-4">
        {/* Warning banner */}
        <div className="p-3 rounded-lg border flex items-start gap-2 bg-(--palette-req-wash) border-(--palette-req-line)">
          <Icon
            name="triangle-exclamation"
            style="solid"
            className="size-4 shrink-0 mt-0.5 text-red-500"
          />
          <p className="text-sm text-(--palette-req)">{t('detail.optOutModal.body')}</p>
        </div>

        {/* Remark */}
        <div>
          <label className="block text-sm font-medium text-(--palette-ink) mb-1.5">
            {t('detail.optOutModal.remarkLabel')} <span className="text-danger">*</span>
          </label>
          <textarea
            value={remark}
            onChange={e => setRemark(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t('detail.optOutModal.remarkPlaceholder')}
            className="w-full px-3 py-2 border border-(--palette-line) rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none resize-none"
          />
          <p className="text-xs text-(--palette-gray-400) mt-1 text-right">{remark.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!remark.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            <Icon name="ban" style="solid" className="size-4 mr-2" />
            {t('detail.optOutModal.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BlockReappraisalNotRequiredModal;
