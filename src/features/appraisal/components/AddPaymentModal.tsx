import { useEffect } from 'react';
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
}: AddPaymentModalProps) {
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
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
    onSubmit(data);
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditing ? 'Edit Payment' : 'Add Payment'} size="sm">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
        {/* Payment Date */}
        <DateInput
          label="Payment Date"
          required
          value={paymentDate}
          onChange={value => setValue('paymentDate', value || '')}
          error={errors.paymentDate?.message}
        />

        {/* Amount */}
        <NumberInput
          label="Amount"
          required
          decimalPlaces={2}
          name="amount"
          value={watch('amount')}
          onChange={e => setValue('amount', e.target.value ?? 0)}
          error={errors.amount?.message}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEditing ? 'Save' : 'Add Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
