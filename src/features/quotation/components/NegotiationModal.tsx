import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { openNegotiationFormSchema, type OpenNegotiationFormValues } from '../schemas/quotation';
import { useOpenNegotiation } from '../api/quotation';

interface NegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  companyQuotationId: string;
  companyName: string;
  currentRounds: number;
  maxRounds?: number;
}

const NegotiationModal = ({
  isOpen,
  onClose,
  quotationId,
  companyQuotationId,
  companyName,
  currentRounds,
  maxRounds = 3,
}: NegotiationModalProps) => {
  const { mutate: openNegotiation, isPending } = useOpenNegotiation(quotationId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpenNegotiationFormValues>({
    resolver: zodResolver(openNegotiationFormSchema),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (values: OpenNegotiationFormValues) => {
    openNegotiation(
      {
        companyQuotationId,
        message: values.message,
      },
      {
        onSuccess: () => {
          toast.success('Negotiation round opened — awaiting company response');
          handleClose();
        },
        onError: (err: any) => {
          toast.error(err?.apiError?.detail ?? 'Failed to open negotiation round');
        },
      },
    );
  };

  const roundsRemaining = maxRounds - currentRounds;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Open Negotiation Round" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-100 flex items-start gap-2">
          <Icon name="handshake" style="solid" className="size-4 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-sm text-orange-700">
            <p>
              Negotiating with <strong>{companyName}</strong>. Round{' '}
              <strong>
                {currentRounds + 1} of {maxRounds}
              </strong>{' '}
              ({roundsRemaining} remaining). The company sets the revised price by adjusting their
              per-item discount when they respond.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message to Company <span className="text-danger">*</span>
          </label>
          <textarea
            {...register('message')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            placeholder="Explain what you'd like the company to revise (e.g., target a 10% discount on items 1 and 3)"
          />
          {errors.message && <p className="mt-1 text-xs text-danger">{errors.message.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <Icon name="circle-play" style="solid" className="size-4 mr-2" />
                Open Round
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NegotiationModal;
