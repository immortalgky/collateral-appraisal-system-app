import toast from 'react-hot-toast';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useSendShortlistToRm } from '../api/quotation';

interface SendToRmModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  shortlistedCount: number;
}

const SendToRmModal = ({ isOpen, onClose, quotationId, shortlistedCount }: SendToRmModalProps) => {
  const { mutate: sendToRm, isPending } = useSendShortlistToRm(quotationId);

  const handleConfirm = () => {
    sendToRm(undefined, {
      onSuccess: () => {
        toast.success('Shortlist sent to RM for selection');
        onClose();
      },
      onError: (err: any) => {
        toast.error(err?.apiError?.detail ?? 'Failed to send shortlist to RM');
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Shortlist to RM" size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
          <Icon
            name="circle-info"
            style="solid"
            className="size-5 text-purple-500 shrink-0 mt-0.5"
          />
          <div className="text-sm text-purple-700">
            <p className="font-medium mb-1">Confirm shortlist submission</p>
            <p>
              You are sending <strong>{shortlistedCount} shortlisted</strong> company bid(s) to the
              RM for final selection. The RM will pick a tentative winner from these submissions.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Icon name="paper-plane" style="solid" className="size-4 mr-2" />
                Send to RM
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SendToRmModal;
