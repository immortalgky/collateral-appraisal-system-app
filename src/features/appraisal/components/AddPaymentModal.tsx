import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import DateInput from '@shared/components/inputs/DateInput';
import NumberInput from '@shared/components/inputs/NumberInput';
import { AddPaymentFormSchema } from '../schemas/appointmentAndFee';

type AddPaymentFormData = z.infer<typeof AddPaymentFormSchema>;

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddPaymentFormData) => void;
  defaultValues?: { paymentDate: string; amount: number } | null;
  isEditing?: boolean;
  maxAmount?: number;
  requestedAt?: string | null;
  readOnly?: boolean;
}

/**
 * Modal for adding or editing a payment record
 */
export default function AddPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  isEditing = false,
  maxAmount,
  requestedAt,
  readOnly = false,
}: AddPaymentModalProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    setError,
    watch,
  } = useForm<AddPaymentFormData>({
    resolver: zodResolver(AddPaymentFormSchema),
    defaultValues: {
      paymentDate: '',
      amount: 0,
    },
  });

  const paymentDate = watch('paymentDate');

  // Reset form with default values when modal opens
  useEffect(() => {
    if (isOpen) {
      reset(defaultValues ?? { paymentDate: '', amount: 0 });
    }
  }, [isOpen, defaultValues, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = (data: AddPaymentFormData) => {
    if (maxAmount !== undefined && data.amount > maxAmount) {
      setError('amount', { type: 'manual', message: `Amount cannot exceed ${maxAmount}` });
      return;
    }

    onSubmit(data);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        isEditing ? t('payment.addPaymentModal.titleEdit') : t('payment.addPaymentModal.titleAdd')
      }
      size="sm"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
        {/* Payment Date */}
        <DateInput
          label={t('payment.addPaymentModal.dateLabel')}
          required
          value={paymentDate}
          onChange={value => setValue('paymentDate', value || '')}
          minDate={requestedAt}
          error={errors.paymentDate?.message}
          disabled={readOnly}
        />

        {/* Amount */}
        <NumberInput
          label={t('payment.addPaymentModal.amountLabel')}
          required
          maxIntegerDigits={15}
          decimalPlaces={2}
          name="amount"
          value={watch('amount')}
          onChange={e => setValue('amount', e.target.value ?? 0)}
          error={errors.amount?.message}
          disabled={readOnly}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={handleClose}>
            {t('common:actions.cancel')}
          </Button>
          {!readOnly && (
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEditing ? t('common:actions.save') : t('payment.addPayment')}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
