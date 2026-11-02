import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import { vmsg } from '@/shared/components/form/validationMessage';
import TextInput from '@shared/components/inputs/TextInput';
import NumberInput from '@shared/components/inputs/NumberInput';
import Checkbox from '@shared/components/inputs/Checkbox';
import Dropdown from '@shared/components/inputs/Dropdown';
import Textarea from '@shared/components/inputs/Textarea';
import RadioGroup from '@shared/components/inputs/RadioGroup';
import { carryForwardLockKind, DOCUMENT_TYPE_CATEGORIES, type DocumentTypeDto } from '../types';

const Schema = z.object({
  code: z.string().min(1, vmsg('required')),
  name: z.string(),
  nameTh: z.string().min(1, vmsg('required')),
  description: z
    .string()
    .max(500, vmsg('maxLength', { max: 500 }))
    .nullable()
    .optional(),
  category: z.string().nullable().optional(),
  sortOrder: z.coerce.number(),
  isActive: z.boolean(),
  carryForwardByDefault: z.boolean(),
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
  const { t } = useTranslation('request');
  const isEditing = !!editing;
  const categoryOptions = DOCUMENT_TYPE_CATEGORIES.map(value => ({
    value,
    label: t(`documentTypeAdmin.categories.${value}`),
  }));

  const defaults = useMemo<DocumentTypeFormValues>(
    () => ({
      code: editing?.code ?? '',
      name: editing?.name ?? '',
      nameTh: editing?.nameTh ?? '',
      description: editing?.description ?? '',
      category: editing?.category ?? '',
      sortOrder: editing?.sortOrder ?? 0,
      isActive: editing?.isActive ?? true,
      carryForwardByDefault: editing?.carryForwardByDefault ?? false,
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

  // The server says which types are locked. A new type has no flag yet; one typed as D036 is
  // rejected as a duplicate code, so create stays unlocked.
  const carryLock = editing ? carryForwardLockKind(editing) : null;

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
      title={isEditing ? t('documentTypeAdmin.titleEdit') : t('documentTypeAdmin.titleAdd')}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <TextInput
            label={t('documentTypeAdmin.fields.code')}
            required
            disabled={isEditing}
            placeholder={t('documentTypeAdmin.fields.codePlaceholder')}
            {...register('code')}
            error={errors.code?.message}
          />
          <Dropdown
            label={t('documentTypeAdmin.fields.category')}
            options={categoryOptions}
            showValuePrefix={false}
            placeholder={t('documentTypeAdmin.fields.categoryPlaceholder')}
            value={watch('category') ?? undefined}
            onChange={v => setValue('category', v ?? null)}
            error={errors.category?.message}
          />
        </div>

        <TextInput
          label={t('documentTypeAdmin.fields.name')}
          required
          placeholder={t('documentTypeAdmin.fields.namePlaceholder')}
          {...register('name')}
          error={errors.name?.message}
        />

        <TextInput
          label={t('documentTypeAdmin.fields.nameTh')}
          placeholder={t('documentTypeAdmin.fields.nameThPlaceholder')}
          {...register('nameTh')}
          error={errors.nameTh?.message}
        />

        <Textarea
          label={t('documentTypeAdmin.fields.description')}
          placeholder={t('documentTypeAdmin.fields.descriptionPlaceholder')}
          maxLength={500}
          showCharCount
          value={watch('description') ?? ''}
          onChange={e => setValue('description', e.target.value)}
          error={errors.description?.message}
        />

        <NumberInput
          label={t('documentTypeAdmin.fields.sortOrder')}
          decimalPlaces={0}
          min={0}
          name="sortOrder"
          value={watch('sortOrder')}
          onChange={e => setValue('sortOrder', e.target.value ?? 0)}
          error={errors.sortOrder?.message}
        />

        <fieldset className="flex flex-col gap-2 rounded-lg border border-(--palette-line) px-3 py-2.5">
          <legend className="px-1 text-xs font-medium text-(--palette-gray-600)">
            {t('carryForward.admin.legend')}
          </legend>
          {carryLock ? (
            <p className="text-sm text-(--palette-gray-600)">
              {carryLock === 'target'
                ? t('carryForward.admin.lockedTargetText')
                : t('carryForward.admin.lockedSourceText')}
            </p>
          ) : (
            <>
              <RadioGroup
                size="sm"
                value={watch('carryForwardByDefault') ? 'use' : 'dontUse'}
                // The group reports '' when the selected option is clicked again; keep the choice.
                onChange={v => v && setValue('carryForwardByDefault', v === 'use')}
                options={[
                  {
                    value: 'use',
                    label: t('carryForward.admin.useLabel'),
                    description: t('carryForward.admin.useHelp'),
                  },
                  {
                    value: 'dontUse',
                    label: t('carryForward.admin.dontUseLabel'),
                    description: t('carryForward.admin.dontUseHelp'),
                  },
                ]}
              />
              <p className="text-xs text-(--palette-gray-400)">
                {t('carryForward.admin.appliesLater')}
              </p>
            </>
          )}
        </fieldset>

        {isEditing && (
          <Checkbox
            label={t('documentTypeAdmin.fields.active')}
            checked={watch('isActive')}
            onChange={c => setValue('isActive', c)}
          />
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-(--palette-line)">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving}>
            {t('documentTypeAdmin.cancel')}
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {isEditing ? t('documentTypeAdmin.save') : t('documentTypeAdmin.add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
