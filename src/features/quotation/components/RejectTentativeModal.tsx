import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import {
  makeRejectTentativeFormSchema,
  type RejectTentativeFormValues,
} from '../schemas/quotation';
import { useRejectTentativeWinner } from '../api/quotation';

interface RejectTentativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  companyName: string;
}

const RejectTentativeModal = ({
  isOpen,
  onClose,
  quotationId,
  companyName,
}: RejectTentativeModalProps) => {
  const { t } = useTranslation(['quotation', 'common']);
  const { mutate: reject, isPending } = useRejectTentativeWinner(quotationId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectTentativeFormValues>({
    resolver: zodResolver(makeRejectTentativeFormSchema(t)),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (values: RejectTentativeFormValues) => {
    reject(
      { reason: values.reason },
      {
        onSuccess: () => {
          toast.success(t('toasts.winnerRejected'));
          handleClose();
        },
        onError: (err: any) => {
          toast.error(err?.apiError?.detail ?? t('toasts.winnerRejectFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('rejectWinner.title')} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
          <Icon
            name="triangle-exclamation"
            style="solid"
            className="size-4 text-red-500 shrink-0 mt-0.5"
          />
          <div className="text-sm text-red-700">
            <p
              dangerouslySetInnerHTML={{
                __html: t('rejectWinner.body', { company: `<strong>${companyName}</strong>` }),
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.reason')} <span className="text-danger">*</span>
          </label>
          <textarea
            {...register('reason')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-danger/20 focus:border-danger outline-none resize-none"
            placeholder={t('placeholders.reason')}
          />
          {errors.reason && <p className="mt-1 text-xs text-danger">{errors.reason.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="danger" disabled={isPending}>
            {isPending ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                {t('rejectWinner.rejecting')}
              </>
            ) : (
              <>
                <Icon name="xmark" style="solid" className="size-4 mr-2" />
                {t('rejectWinner.rejectButton')}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RejectTentativeModal;
