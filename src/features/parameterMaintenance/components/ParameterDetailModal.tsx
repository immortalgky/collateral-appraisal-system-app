import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import TextInput from '@shared/components/inputs/TextInput';
import NumberInput from '@shared/components/inputs/NumberInput';

const ParameterFormSchema = z.object({
  group: z.string(),
  code: z.string(),
  descriptionTh: z.string(),
  descriptionEn: z.string(),
  country: z.string(),
  seqNo: z.coerce.number(),
  isActive: z.boolean(),
});

export type ParameterFormValues = z.infer<typeof ParameterFormSchema>;
export interface ParameterPairDefaults {
  group?: string;
  code?: string;
  descriptionTh?: string;
  descriptionEn?: string;
  country?: string;
  seqNo?: number;
  isActive?: boolean;
}
interface ParameterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ParameterFormValues) => Promise<void>;
  defaultValues?: ParameterPairDefaults | null;
  isEditing?: boolean;
  isSaving?: boolean;
  group?: string;
  groupEditable?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export default function ParameterDetailModal({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  isEditing = false,
  isSaving,
  group,
  groupEditable = false,
}: ParameterDetailModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ParameterFormValues>({
    resolver: zodResolver(ParameterFormSchema),
    defaultValues: {
      group: defaultValues?.group ?? group ?? '',
      code: defaultValues?.code ?? '',
      descriptionTh: defaultValues?.descriptionTh ?? '',
      descriptionEn: defaultValues?.descriptionEn ?? '',
      country: defaultValues?.country ?? 'TH',
      seqNo: defaultValues?.seqNo ?? 1,
      isActive: defaultValues?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        group: defaultValues?.group ?? group ?? '',
        code: defaultValues?.code ?? '',
        descriptionTh: defaultValues?.descriptionTh ?? '',
        descriptionEn: defaultValues?.descriptionEn ?? '',
        country: defaultValues?.country ?? 'TH',
        seqNo: defaultValues?.seqNo ?? 1,
        isActive: defaultValues?.isActive ?? true,
      });
    }
  }, [isOpen, defaultValues, group, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Parameter' : 'Add Parameter'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Group / Code */}
        <div className="grid grid-cols-2 gap-4">
          <TextInput
            label="Group"
            required
            disabled={!groupEditable}
            placeholder="e.g. AppraisalPurpose"
            {...register('group')}
            error={errors.group?.message}
          />
          <TextInput
            label="Code"
            required
            placeholder="e.g. 01"
            {...register('code')}
            error={errors.code?.message}
          />
        </div>

        {/* Descriptions */}
        <TextInput
          label="TH Description"
          required
          placeholder="กรอกคำอธิบายภาษาไทย"
          {...register('descriptionTh')}
          error={errors.descriptionTh?.message}
        />
        <TextInput
          label="EN Description"
          required
          placeholder="Enter English description"
          {...register('descriptionEn')}
          error={errors.descriptionEn?.message}
        />

        {/* Country */}
        <TextInput
          label="Country"
          required
          placeholder="e.g. TH"
          {...register('country')}
          error={errors.country?.message}
        />

        {/* Seq No */}
        <NumberInput
          label="Seq No"
          decimalPlaces={0}
          min={0}
          name="seqNo"
          value={watch('seqNo')}
          onChange={e => setValue('seqNo', e.target.value ?? 0)}
          error={errors.seqNo?.message}
        />

        {/* Status toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <button
            type="button"
            onClick={() => setValue('isActive', !watch('isActive'))}
            className={`w-fit inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              watch('isActive')
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <span
              className={`size-2 rounded-full ${watch('isActive') ? 'bg-emerald-500' : 'bg-gray-400'}`}
            />
            {watch('isActive') ? 'Active' : 'Inactive'}
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Add Parameter'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
