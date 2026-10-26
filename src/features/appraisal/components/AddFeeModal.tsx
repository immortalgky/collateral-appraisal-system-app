import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import TextInput from '@shared/components/inputs/TextInput';
import NumberInput from '@shared/components/inputs/NumberInput';
import { type AddFeeFormData, AddFeeFormSchema } from '../schemas/appointmentAndFee';
import type { FeeItem } from '../types/appointmentAndFee';

interface AddFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<FeeItem, 'id'>) => void | boolean | Promise<void | boolean>;
  defaultValues?: FeeItem;
  isEditing?: boolean;
  readOnly?: boolean;
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
  readOnly = false,
}: AddFeeModalProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted },
    reset,
    control,
    setValue,
  } = useForm<AddFeeFormData>({
    resolver: zodResolver(AddFeeFormSchema),
    defaultValues: {
      type: defaultValues?.type || '99',
      description: defaultValues?.description || '',
      amount: defaultValues?.amount || 0,
    },
  });
  const amount = useWatch({ control, name: 'amount' });

  // Reset form when modal opens with new default values
  useEffect(() => {
    if (isOpen) {
      reset({
        type: defaultValues?.type || '99',
        description: defaultValues?.description || '',
        amount: defaultValues?.amount || 0,
      });
    }
  }, [isOpen, defaultValues, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  // The modal stays open, with its input, until the caller's save has finished: isSubmitting
  // disables Submit meanwhile, so it cannot fire twice, and a close request is ignored. A caller
  // that returns false says the save failed, and the modal stays open for another try.
  const handleFormSubmit = async (data: AddFeeFormData) => {
    const saved = await onSubmit(data);
    if (saved !== false) handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) handleClose();
      }}
      title={isEditing ? t('fee.addFeeModal.titleEdit') : t('fee.addFeeModal.titleAdd')}
      size="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
        {/* Fee Type - locked to the current value (add always uses "Other") */}
        <input type="hidden" {...register('type')} />

        {/* Description */}
        <TextInput
          label={t('fee.addFeeModal.descriptionLabel')}
          required
          placeholder={t('fee.addFeeModal.descriptionLabel')}
          {...register('description')}
          error={errors.description?.message}
          disabled={readOnly}
        />

        {/* Amount */}
        <NumberInput
          label={t('fee.addFeeModal.amountLabel')}
          required
          maxIntegerDigits={15}
          decimalPlaces={2}
          name="amount"
          value={amount}
          // Not a registered input, so re-check by hand once a submit has shown the error.
          onChange={e => setValue('amount', e.target.value ?? 0, { shouldValidate: isSubmitted })}
          error={errors.amount?.message}
          disabled={readOnly}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-(--palette-line)">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            {t('common:actions.cancel')}
          </Button>
          {!readOnly && (
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEditing ? t('common:actions.save') : t('common:actions.add')}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
