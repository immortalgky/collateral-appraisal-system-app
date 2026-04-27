import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useDeclineInvitation } from '../api/quotation';

interface DeclineInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful decline/withdraw, before onClose. */
  onSuccess?: () => void;
  quotationId: string;
  companyId: string;
  /** 'decline' = first-time decline; 'withdraw' = already submitted, now pulling out of the quotation */
  mode?: 'decline' | 'withdraw';
}

/**
 * Modal for ExtCompany to decline an invitation or pull out after submitting.
 * Calls POST /quotations/{id}/companies/{companyId}/decline.
 */
const DeclineInvitationModal = ({
  isOpen,
  onClose,
  onSuccess,
  quotationId,
  companyId,
  mode = 'decline',
}: DeclineInvitationModalProps) => {
  const [reason, setReason] = useState('');
  const { mutate: decline, isPending } = useDeclineInvitation(quotationId);

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (!reason.trim()) return;
    decline(
      { companyId, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(
            mode === 'withdraw'
              ? 'You have opted out of this quotation'
              : 'Invitation declined successfully',
          );
          onSuccess?.();
          handleClose();
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? 'Action failed. Please try again.');
        },
      },
    );
  };

  const isWithdraw = mode === 'withdraw';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isWithdraw ? 'Opt Out of Quotation' : 'Decline Invitation'}
      size="sm"
    >
      <div className="flex flex-col gap-4">
        {/* Warning banner */}
        <div
          className={`p-3 rounded-lg border flex items-start gap-2 ${
            isWithdraw
              ? 'bg-orange-50 border-orange-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <Icon
            name="triangle-exclamation"
            style="solid"
            className={`size-4 shrink-0 mt-0.5 ${isWithdraw ? 'text-orange-500' : 'text-red-500'}`}
          />
          <p className={`text-sm ${isWithdraw ? 'text-orange-700' : 'text-red-700'}`}>
            {isWithdraw
              ? 'You will no longer participate in this quotation. Any information you submitted will be retracted and will not be considered.'
              : 'You are declining this invitation. The bank will be notified and you will not be able to participate in this quotation.'}
          </p>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Reason <span className="text-danger">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={
              isWithdraw
                ? 'Please explain why you no longer want to participate in this quotation...'
                : 'Please explain why you are declining this invitation...'
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !reason.trim()}
            className={isWithdraw ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {isPending ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                {isWithdraw ? 'Opting out...' : 'Declining...'}
              </>
            ) : (
              <>
                <Icon name={isWithdraw ? 'arrow-rotate-left' : 'ban'} style="solid" className="size-4 mr-2" />
                {isWithdraw ? 'Opt Out' : 'Decline Invitation'}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeclineInvitationModal;
