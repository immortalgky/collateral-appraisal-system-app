import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import DateInput from '@shared/components/inputs/DateInput';
import NumberInput from '@shared/components/inputs/NumberInput';
import { AddPaymentFormSchema } from '../schemas/appointmentAndFee';
import type { PaymentRecord } from '../types/appointmentAndFee';

type AddPaymentFormData = z.infer<typeof AddPaymentFormSchema>;

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<PaymentRecord, 'id'>) => void;
}

/**
 * Modal for adding a payment record
 */
export default function AddPaymentModal({ isOpen, onClose, onSubmit }: AddPaymentModalProps) {
  const {
    register,
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

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = (data: AddPaymentFormData) => {
    onSubmit(data);
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Payment" size="sm">
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
          {...register('amount', { valueAsNumber: true })}
          error={errors.amount?.message}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Add Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
