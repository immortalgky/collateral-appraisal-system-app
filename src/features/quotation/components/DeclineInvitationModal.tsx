import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';

interface DeclineInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called with the trimmed reason once the user confirms "not participating". This modal makes
   * NO API call — "not participate" is just a flag on the normal Draft → Send-to-Checker → Submit
   * pipeline now. The page sets local `notParticipating`/`declineReason` state from this callback
   * and persists it through the normal Save Draft / Send to Checker / Submit calls (SaveDraft,
   * SubmitDraftToChecker, and SubmitQuotation all accept `notParticipating` + `declineReason`;
   * the Checker's final Submit is authoritative for Declined vs Submitted).
   */
  onConfirm: (reason: string) => void;
}

/**
 * Reason-capture modal for marking a company quotation as "not participating". Used by both Maker
 * and Checker via the same Participating Yes/No toggle on ExtCompanySubmitQuotationPage — the
 * decision itself is finalized later by whichever role submits (Send to Checker / Submit).
 */
const DeclineInvitationModal = ({ isOpen, onClose, onConfirm }: DeclineInvitationModalProps) => {
  const { t } = useTranslation(['quotation', 'common']);
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('decline.declineTitle')} size="sm">
      <div className="flex flex-col gap-4">
        {/* Warning banner */}
        <div className="p-3 rounded-lg border flex items-start gap-2 bg-red-50 border-red-200">
          <Icon
            name="triangle-exclamation"
            style="solid"
            className="size-4 shrink-0 mt-0.5 text-red-500"
          />
          <p className="text-sm text-red-700">{t('decline.declineBody')}</p>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('fields.reason')} <span className="text-danger">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t('placeholders.declineReason')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            <Icon name="ban" style="solid" className="size-4 mr-2" />
            {t('buttons.declineInvitation')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeclineInvitationModal;
