import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Dropdown from '@shared/components/inputs/Dropdown';
import TextInput from '@shared/components/inputs/TextInput';
import NumberInput from '@shared/components/inputs/NumberInput';
import { AddFeeFormSchema } from '../schemas/appointmentAndFee';
import { FEE_ITEM_TYPE_OPTIONS } from '../types/appointmentAndFee';
import type { FeeItem } from '../types/appointmentAndFee';

type AddFeeFormData = z.infer<typeof AddFeeFormSchema>;

interface AddFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<FeeItem, 'id'>) => void;
  defaultValues?: FeeItem;
  isEditing?: boolean;
}

/**
 * Modal for adding or editing a fee item
 */
export default function AddFeeModal({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  isEditing = false,
}: AddFeeModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<AddFeeFormData>({
    resolver: zodResolver(AddFeeFormSchema),
    defaultValues: {
      type: defaultValues?.type || 'appraisal',
      description: defaultValues?.description || '',
      amount: defaultValues?.amount || 0,
    },
  });

  const selectedType = watch('type');

  // Reset form when modal opens with new default values
  useEffect(() => {
    if (isOpen) {
      reset({
        type: defaultValues?.type || 'appraisal',
        description: defaultValues?.description || '',
        amount: defaultValues?.amount || 0,
      });
    }
  }, [isOpen, defaultValues, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = (data: AddFeeFormData) => {
    onSubmit(data);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Fee' : 'Add Fee'}
      size="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
        {/* Fee Type */}
        <Dropdown
          name="type"
          label="Fee Type"
          required
          options={FEE_ITEM_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
          value={selectedType}
          onChange={value => setValue('type', value as 'appraisal' | 'other')}
          error={errors.type?.message}
        />

        {/* Description */}
        <TextInput
          label="Description"
          required
          placeholder="Enter fee description"
          {...register('description')}
          error={errors.description?.message}
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
            {isEditing ? 'Update' : 'Add'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
