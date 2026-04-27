import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import {
  finalizeFormSchema,
  type FinalizeFormValues,
  type CompanyQuotationItemDto,
} from '../schemas/quotation';
import { useFinalizeQuotation } from '../api/quotation';
import { deriveFeeTotals } from './QuotationFeeBreakdown';

interface AppraisalLabel {
  appraisalId: string;
  appraisalNumber?: string | null;
}

interface FinalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  companyQuotationId: string;
  companyName: string;
  /** Winning company's per-appraisal items — drives the per-appraisal fee table. */
  winnerItems: CompanyQuotationItemDto[];
  /** Optional appraisal display labels (number, etc.) — keyed/looked up by appraisalId. */
  appraisals?: AppraisalLabel[];
}

const FinalizeModal = ({
  isOpen,
  onClose,
  quotationId,
  companyQuotationId,
  companyName,
  winnerItems,
  appraisals,
}: FinalizeModalProps) => {
  const { mutate: finalize, isPending } = useFinalizeQuotation(quotationId);

  const { register, handleSubmit, reset } = useForm<FinalizeFormValues>({
    resolver: zodResolver(finalizeFormSchema),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (values: FinalizeFormValues) => {
    finalize(
      {
        companyQuotationId,
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

  const formatCurrency = (v: number | null | undefined) =>
    v != null
      ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v)
      : '—';

  /** Per-appraisal fee = the winner's per-item net amount (after discount, negotiated discount, and VAT). */
  const itemFee = (item: CompanyQuotationItemDto): number => {
    const { netAmount } = deriveFeeTotals(
      item.feeAmount,
      item.discount,
      item.negotiatedDiscount,
      item.vatPercent,
    );
    if (Number.isFinite(netAmount) && netAmount > 0) return netAmount;
    return item.quotedPrice ?? 0;
  };

  const appraisalLabelFor = (appraisalId: string): string => {
    const match = appraisals?.find(a => a.appraisalId === appraisalId);
    return match?.appraisalNumber?.trim() || appraisalId.slice(0, 8);
  };

  const sortedItems = [...winnerItems].sort((a, b) => a.itemNumber - b.itemNumber);
  const grandTotal = sortedItems.reduce((sum, item) => sum + itemFee(item), 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Finalize Quotation" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex items-start gap-2">
          <Icon name="circle-check" style="solid" className="size-4 text-green-500 shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">
            <p>
              Finalizing with <strong>{companyName}</strong>. The system will commit each appraisal's fee
              from the per-appraisal price the winner submitted (shown below). Click "Assign" on the task
              to route externally. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appraisal
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fee (Net)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-3 text-center text-sm text-gray-500">
                    Winner has no per-appraisal items.
                  </td>
                </tr>
              ) : (
                sortedItems.map(item => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {appraisalLabelFor(item.appraisalId)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-gray-900 tabular-nums">
                      {formatCurrency(itemFee(item))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {sortedItems.length > 1 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="px-3 py-2 text-sm font-medium text-gray-700">Total</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <textarea
            {...register('reason')}
            rows={3}
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
