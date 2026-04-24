import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { finalizeFormSchema, type FinalizeFormValues } from '../schemas/quotation';
import { useFinalizeQuotation } from '../api/quotation';

interface FinalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  companyQuotationId: string;
  companyName: string;
  suggestedPrice?: number | null;
}

const FinalizeModal = ({
  isOpen,
  onClose,
  quotationId,
  companyQuotationId,
  companyName,
  suggestedPrice,
}: FinalizeModalProps) => {
  const { mutate: finalize, isPending } = useFinalizeQuotation(quotationId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FinalizeFormValues>({
    resolver: zodResolver(finalizeFormSchema),
    defaultValues: {
      finalPrice: suggestedPrice ?? undefined,
    },
  });

  const handleClose = () => {
    reset({ finalPrice: suggestedPrice ?? undefined });
    onClose();
  };

  const onSubmit = (values: FinalizeFormValues) => {
    finalize(
      {
        companyQuotationId,
        finalPrice: values.finalPrice,
        reason: values.reason ?? null,
      },
      {
        onSuccess: () => {
          toast.success('Quotation finalized — click Assign to route externally');
          handleClose();
        },
        onError: (err: any) => {
          toast.error(err?.apiError?.detail ?? 'Failed to finalize quotation');
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Finalize Quotation" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex items-start gap-2">
          <Icon name="circle-check" style="solid" className="size-4 text-green-500 shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">
            <p>
              Finalizing with <strong>{companyName}</strong>. This records the agreed price and
              marks the quotation as finalized. Click "Assign" on the task to route externally.
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Final Price (THB) <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('finalPrice', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            placeholder="Enter the agreed final price"
          />
          {errors.finalPrice && (
            <p className="mt-1 text-xs text-danger">{errors.finalPrice.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <textarea
            {...register('reason')}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none"
            placeholder="Any additional notes..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700">
            {isPending ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                Finalizing...
              </>
            ) : (
              <>
                <Icon name="flag-checkered" style="solid" className="size-4 mr-2" />
                Finalize
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FinalizeModal;
