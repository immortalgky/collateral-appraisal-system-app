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
        proposedPrice: values.proposedPrice,
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
              <strong>{currentRounds + 1} of {maxRounds}</strong> ({roundsRemaining} remaining).
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proposed Price (THB) <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('proposedPrice', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="Enter your proposed price"
          />
          {errors.proposedPrice && (
            <p className="mt-1 text-xs text-danger">{errors.proposedPrice.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message <span className="text-danger">*</span>
          </label>
          <textarea
            {...register('message')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            placeholder="Explain your proposed price to the company..."
          />
          {errors.message && (
            <p className="mt-1 text-xs text-danger">{errors.message.message}</p>
          )}
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
