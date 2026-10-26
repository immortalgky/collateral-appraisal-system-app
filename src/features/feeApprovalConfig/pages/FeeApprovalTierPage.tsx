import '@/features/feeApprovalConfig/i18n';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import NativeSelect from '@/shared/components/inputs/NativeSelect';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Modal from '@/shared/components/Modal';
import { ValidationText } from '@/shared/components/form/ValidationText';
import { vmsg } from '@/shared/components/form/validationMessage';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import {
  useGetFeeApprovalTiers,
  useCreateFeeApprovalTier,
  useUpdateFeeApprovalTier,
  useDeleteFeeApprovalTier,
} from '../api/feeApprovalConfig';
import type { FeeApprovalTierDto } from '../types';

// ---- Schema ----

const tierSchema = z.object({
  minAmount: z.coerce.number().min(0, vmsg('minValue', { min: 0 })),
  maxAmount: z.coerce.number().nullable().optional(),
  approverCode: z.string().min(1, vmsg('required')),
  assignedType: z.enum(['1', '2'] as const),
  tierLabel: z.string().min(1, vmsg('required')),
  priority: z.coerce.number().min(1, vmsg('minValue', { min: 1 })),
  isActive: z.boolean(),
  appliesTo: z.enum(['Ext', 'Int', 'Both'] as const),
});

// Explicit type so RHF form values are well-typed (avoiding unknown from z.coerce input)
type TierFormValues = {
  minAmount: number;
  maxAmount?: number | null;
  approverCode: string;
  assignedType: '1' | '2';
  tierLabel: string;
  priority: number;
  isActive: boolean;
  appliesTo: 'Ext' | 'Int' | 'Both';
};

const inputClass =
  'w-full rounded-lg border border-(--palette-line-strong) px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

// ---- Tier form modal ----

interface TierModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing?: FeeApprovalTierDto | null;
}

function TierModal({ isOpen, onClose, editing }: TierModalProps) {
  const { t } = useTranslation(['feeApprovalConfig', 'common']);
  const createTier = useCreateFeeApprovalTier();
  const updateTier = useUpdateFeeApprovalTier();
  const isPending = createTier.isPending || updateTier.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TierFormValues>({
    resolver: zodResolver(tierSchema),
    defaultValues: editing
      ? {
          minAmount: editing.minAmount,
          maxAmount: editing.maxAmount ?? undefined,
          approverCode: editing.approverCode,
          assignedType: editing.assignedType,
          tierLabel: editing.tierLabel,
          priority: editing.priority,
          isActive: editing.isActive,
          appliesTo: editing.appliesTo,
        }
      : {
          minAmount: 0,
          approverCode: '',
          assignedType: '1',
          tierLabel: '',
          priority: 1,
          isActive: true,
          appliesTo: 'Ext',
        },
  });

  const handleClose = () => {
    if (!isPending) {
      reset();
      onClose();
    }
  };

  const onSubmit = (values: TierFormValues) => {
    const body = {
      ...values,
      maxAmount: values.maxAmount ?? null,
    };

    if (editing) {
      updateTier.mutate(
        { id: editing.id, ...body },
        {
          onSuccess: () => {
            toast.success(t('feeApprovalConfig:toasts.tierUpdated'));
            handleClose();
          },
          onError: (err: unknown) => {
            const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
            toast.error(detail || t('feeApprovalConfig:toasts.tierUpdateFailed'));
          },
        },
      );
    } else {
      createTier.mutate(body, {
        onSuccess: () => {
          toast.success(t('feeApprovalConfig:toasts.tierCreated'));
          handleClose();
        },
        onError: (err: unknown) => {
          const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('feeApprovalConfig:toasts.tierCreateFailed'));
        },
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        editing
          ? t('feeApprovalConfig:tierModal.editTitle')
          : t('feeApprovalConfig:tierModal.createTitle')
      }
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-(--palette-ink) mb-1">
              {t('feeApprovalConfig:fields.minAmount')} <span className="text-red-500">*</span>
            </label>
            <input type="number" step="0.01" {...register('minAmount')} className={inputClass} />
            {errors.minAmount && (
              <p className="mt-1 text-xs text-(--palette-danger)">
                <ValidationText message={errors.minAmount.message} />
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-(--palette-ink) mb-1">
              {t('feeApprovalConfig:fields.maxAmount')}
              <span className="text-xs text-(--palette-gray-400) ml-1">(optional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register('maxAmount')}
              className={inputClass}
              placeholder="Leave blank for no upper limit"
            />
            {errors.maxAmount && (
              <p className="mt-1 text-xs text-(--palette-danger)">
                <ValidationText message={errors.maxAmount.message} />
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-(--palette-ink) mb-1">
            {t('feeApprovalConfig:fields.tierLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            {...register('tierLabel')}
            className={inputClass}
            placeholder="e.g. intAdmin tier"
          />
          {errors.tierLabel && (
            <p className="mt-1 text-xs text-(--palette-danger)">
              <ValidationText message={errors.tierLabel.message} />
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-(--palette-ink) mb-1">
              {t('feeApprovalConfig:fields.approverCode')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('approverCode')}
              className={inputClass}
              placeholder="User/group code"
            />
            {errors.approverCode && (
              <p className="mt-1 text-xs text-(--palette-danger)">
                <ValidationText message={errors.approverCode.message} />
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-(--palette-ink) mb-1">
              {t('feeApprovalConfig:fields.assignedType')} <span className="text-red-500">*</span>
            </label>
            <NativeSelect {...register('assignedType')} className="w-full">
              <option value="1">{t('feeApprovalConfig:assignedType.user')}</option>
              <option value="2">{t('feeApprovalConfig:assignedType.group')}</option>
            </NativeSelect>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-(--palette-ink) mb-1">
              {t('feeApprovalConfig:fields.priority')} <span className="text-red-500">*</span>
            </label>
            <input type="number" {...register('priority')} className={inputClass} />
            {errors.priority && (
              <p className="mt-1 text-xs text-(--palette-danger)">
                <ValidationText message={errors.priority.message} />
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-(--palette-ink) mb-1">
              {t('feeApprovalConfig:fields.appliesTo')}
            </label>
            <NativeSelect {...register('appliesTo')} className="w-full">
              <option value="Ext">Ext</option>
              <option value="Int">Int</option>
              <option value="Both">Both</option>
            </NativeSelect>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="tier-isActive"
            type="checkbox"
            {...register('isActive')}
            className="h-4 w-4 rounded border-(--palette-line-strong) text-blue-600 dark:text-blue-400"
          />
          <label htmlFor="tier-isActive" className="text-sm font-medium text-(--palette-ink)">
            {t('feeApprovalConfig:fields.isActive')}
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? t('common:status.saving')
              : editing
                ? t('common:actions.save')
                : t('feeApprovalConfig:tierModal.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Page ----

const FeeApprovalTierPage = () => {
  const { t } = useTranslation(['feeApprovalConfig', 'common']);
  const { data: tiers, isLoading } = useGetFeeApprovalTiers();
  const deleteTier = useDeleteFeeApprovalTier();
  const addDialog = useDisclosure();
  const [editingTier, setEditingTier] = useState<FeeApprovalTierDto | null>(null);

  const tierList = tiers ?? [];

  const handleDelete = (tier: FeeApprovalTierDto) => {
    if (!confirm(t('feeApprovalConfig:confirm.deleteTier', { label: tier.tierLabel }))) return;
    deleteTier.mutate(tier.id, {
      onSuccess: () => toast.success(t('feeApprovalConfig:toasts.tierDeleted')),
      onError: (err: unknown) => {
        const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
        toast.error(detail || t('feeApprovalConfig:toasts.tierDeleteFailed'));
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-(--palette-ink)">
            {t('feeApprovalConfig:tierPage.title')}
          </h3>
          <p className="text-xs text-(--palette-gray-500) mt-0.5">
            {t('feeApprovalConfig:tierPage.subtitle')}
          </p>
        </div>
        <Button size="sm" type="button" onClick={addDialog.onOpen}>
          <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
          {t('feeApprovalConfig:tierPage.addTier')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icon
            name="spinner"
            style="solid"
            className="w-5 h-5 animate-spin text-(--palette-gray-400)"
          />
        </div>
      ) : tierList.length === 0 ? (
        <div className="bg-(--palette-surface) rounded-lg border border-(--palette-line) px-4 py-8 text-center text-sm text-(--palette-gray-400) italic">
          {t('feeApprovalConfig:tierPage.noTiers')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-(--palette-line) bg-(--palette-surface)">
          <table className="min-w-full divide-y divide-(--palette-line) text-sm">
            <thead className="bg-(--palette-surface-2)">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-(--palette-gray-500) uppercase">
                  {t('feeApprovalConfig:columns.label')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-(--palette-gray-500) uppercase">
                  {t('feeApprovalConfig:columns.range')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-(--palette-gray-500) uppercase">
                  {t('feeApprovalConfig:columns.approver')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-(--palette-gray-500) uppercase">
                  {t('feeApprovalConfig:columns.type')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-(--palette-gray-500) uppercase">
                  {t('feeApprovalConfig:columns.priority')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-(--palette-gray-500) uppercase">
                  {t('feeApprovalConfig:columns.status')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-(--palette-gray-500) uppercase">
                  {t('feeApprovalConfig:columns.appliesTo')}
                </th>
                <th className="text-xs w-20 px-4 py-2.5 font-semibold" />
              </tr>
            </thead>
            <tbody className="bg-(--palette-surface) divide-y divide-(--palette-line)">
              {tierList.map(tier => (
                <tr key={tier.id} className="hover:bg-(--palette-surface-2)">
                  <td className="px-4 py-3 text-(--palette-ink) font-medium">{tier.tierLabel}</td>
                  <td className="px-4 py-3 text-(--palette-gray-600)">
                    {tier.minAmount.toLocaleString()}
                    {tier.maxAmount != null ? ` – ${tier.maxAmount.toLocaleString()}` : '+'}
                  </td>
                  <td className="px-4 py-3 text-(--palette-gray-600) font-mono text-xs">
                    {tier.approverCode}
                  </td>
                  <td className="px-4 py-3 text-(--palette-gray-600)">
                    {tier.assignedType === '1'
                      ? t('feeApprovalConfig:assignedType.user')
                      : t('feeApprovalConfig:assignedType.group')}
                  </td>
                  <td className="px-4 py-3 text-(--palette-gray-600)">{tier.priority}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        tier.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-(--palette-surface-3) text-(--palette-gray-500)'
                      }`}
                    >
                      {tier.isActive ? t('common:status.active') : t('common:status.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-(--palette-gray-600)">{tier.appliesTo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingTier(tier)}
                        className="p-1 text-(--palette-gray-400) hover:text-(--palette-gray-600) rounded"
                        aria-label={`Edit ${tier.tierLabel}`}
                      >
                        <Icon name="pen" style="solid" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tier)}
                        className="p-1 text-(--palette-gray-400) hover:text-(--palette-danger) rounded"
                        aria-label={`Delete ${tier.tierLabel}`}
                      >
                        <Icon name="trash" style="solid" className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TierModal isOpen={addDialog.isOpen} onClose={addDialog.onClose} />

      {editingTier && (
        <TierModal isOpen onClose={() => setEditingTier(null)} editing={editingTier} />
      )}
    </div>
  );
};

export default FeeApprovalTierPage;
