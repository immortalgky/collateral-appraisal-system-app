import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import TextInput from '@shared/components/inputs/TextInput';
import NumberInput from '@shared/components/inputs/NumberInput';
import Checkbox from '@shared/components/inputs/Checkbox';
import Dropdown from '@shared/components/inputs/Dropdown';
import Textarea from '@shared/components/inputs/Textarea';
import type { DocumentTypeDto } from '../types';

const CATEGORY_OPTIONS = [
  { value: 'VAL_REPORT', label: 'Complete Valuation Report' },
  { value: 'VAL_DOC', label: 'Collateral Valuation Document' },
  { value: 'SUBMIT_DOC', label: 'Submission Documents for Valuation' },
];

const Schema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer')
    .nullable()
    .optional(),
  category: z.string().nullable().optional(),
  sortOrder: z.coerce.number(),
  isActive: z.boolean(),
});

export type DocumentTypeFormValues = z.infer<typeof Schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: DocumentTypeFormValues) => Promise<void>;
  editing?: DocumentTypeDto | null;
  isSaving?: boolean;
}

export default function DocumentTypeModal({ isOpen, onClose, onSubmit, editing, isSaving }: Props) {
  const isEditing = !!editing;

  const defaults = useMemo<DocumentTypeFormValues>(
    () => ({
      code: editing?.code ?? '',
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      category: editing?.category ?? '',
      sortOrder: editing?.sortOrder ?? 0,
      isActive: editing?.isActive ?? true,
    }),
    [editing],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DocumentTypeFormValues>({ resolver: zodResolver(Schema), defaultValues: defaults });

  useEffect(() => {
    if (isOpen) reset(defaults);
  }, [isOpen, defaults, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Document Type' : 'Add Document Type'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <TextInput
            label="Code"
            required
            disabled={isEditing}
            placeholder="e.g. D044"
            {...register('code')}
            error={errors.code?.message}
          />
          <Dropdown
            label="Category"
            options={CATEGORY_OPTIONS}
            showValuePrefix={false}
            placeholder="Select a category"
            value={watch('category') ?? undefined}
            onChange={v => setValue('category', v ?? null)}
            error={errors.category?.message}
          />
        </div>

        <TextInput
          label="Name"
          required
          placeholder="Document type name"
          {...register('name')}
          error={errors.name?.message}
        />

        <Textarea
          label="Description"
          placeholder="Optional description"
          maxLength={500}
          showCharCount
          value={watch('description') ?? ''}
          onChange={e => setValue('description', e.target.value)}
          error={errors.description?.message}
        />

        <NumberInput
          label="Sort Order"
          decimalPlaces={0}
          min={0}
          name="sortOrder"
          value={watch('sortOrder')}
          onChange={e => setValue('sortOrder', e.target.value ?? 0)}
          error={errors.sortOrder?.message}
        />

        {isEditing && (
          <Checkbox label="Active" checked={watch('isActive')} onChange={c => setValue('isActive', c)} />
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Add Document Type'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
