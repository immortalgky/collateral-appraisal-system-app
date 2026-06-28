import '@/features/feeStructureMaintenance/i18n';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Button from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Icon from '@/shared/components/Icon';
import Modal from '@/shared/components/Modal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useParameterOptions } from '@/shared/utils/parameterUtils';
import {
  useGetFeeStructures,
  useCreateFeeStructure,
  useUpdateFeeStructure,
  useDeleteFeeStructure,
} from '../api/feeStructure';
import type { FeeStructureDto } from '../types';

// Fee codes + names come from the `TypeOfFee` general-parameter group
// (value = code, label = description), so they stay in sync with parameter maintenance.
const FEE_TYPE_PARAM_GROUP = 'TypeOfFee';

// ---- Schema ----

// feeName is not a form field — it is derived from the selected TypeOfFee parameter's description.
const feeSchema = z
  .object({
    feeCode: z.string().min(1, 'Fee type is required').max(20),
    baseAmount: z.coerce.number().min(0, 'Base amount must be >= 0'),
    minSellingPrice: z.coerce.number().min(0, 'Min selling price must be >= 0'),
    // Blank means "no upper limit" → null (the input's setValueAs maps '' → null).
    // Without this an empty input coerces to 0 and silently creates a degenerate
    // [0,0] / rejected top tier.
    maxSellingPrice: z.number().min(0).nullable(),
    isActive: z.boolean(),
  })
  .refine(
    v => v.maxSellingPrice == null || v.maxSellingPrice >= v.minSellingPrice,
    { message: 'Max must be >= min', path: ['maxSellingPrice'] },
  );

type FeeFormValues = {
  feeCode: string;
  baseAmount: number;
  minSellingPrice: number;
  maxSellingPrice: number | null;
  isActive: boolean;
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500';

// ---- Fee form modal ----

interface FeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing?: FeeStructureDto | null;
}

function FeeModal({ isOpen, onClose, editing }: FeeModalProps) {
  const { t } = useTranslation(['feeStructureMaintenance', 'common']);
  const createFee = useCreateFeeStructure();
  const updateFee = useUpdateFeeStructure();
  const isPending = createFee.isPending || updateFee.isPending;
  const feeTypeOptions = useParameterOptions(FEE_TYPE_PARAM_GROUP);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeeFormValues>({
    resolver: zodResolver(feeSchema),
    defaultValues: editing
      ? {
          feeCode: editing.feeCode,
          baseAmount: editing.baseAmount,
          minSellingPrice: editing.minSellingPrice,
          maxSellingPrice: editing.maxSellingPrice ?? null,
          isActive: editing.isActive,
        }
      : {
          feeCode: '',
          baseAmount: 0,
          minSellingPrice: 0,
          maxSellingPrice: null,
          isActive: true,
        },
  });

  // Resolve the human-readable fee name from the code's parameter description (display only).
  const resolveFeeName = (code: string) =>
    feeTypeOptions.find(o => o.value === code)?.label ?? code;

  const handleClose = () => {
    if (!isPending) {
      reset();
      onClose();
    }
  };

  const onSubmit = (values: FeeFormValues) => {
    const maxSellingPrice = values.maxSellingPrice ?? null;

    if (editing) {
      // feeCode is immutable on update — omit it from the payload.
      const { feeCode: _feeCode, ...rest } = values;
      void _feeCode;
      updateFee.mutate(
        { id: editing.id, ...rest, maxSellingPrice },
        {
          onSuccess: () => {
            toast.success(t('feeStructureMaintenance:toasts.updated'));
            handleClose();
          },
          onError: (err: unknown) => {
            const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
            toast.error(detail || t('feeStructureMaintenance:toasts.updateFailed'));
          },
        },
      );
    } else {
      createFee.mutate(
        { ...values, maxSellingPrice },
        {
          onSuccess: () => {
            toast.success(t('feeStructureMaintenance:toasts.created'));
            handleClose();
          },
          onError: (err: unknown) => {
            const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
            toast.error(detail || t('feeStructureMaintenance:toasts.createFailed'));
          },
        },
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        editing
          ? t('feeStructureMaintenance:modal.editTitle')
          : t('feeStructureMaintenance:modal.createTitle')
      }
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('feeStructureMaintenance:fields.feeType')} <span className="text-red-500">*</span>
          </label>
          {editing ? (
            // feeCode is immutable on update — show the current type read-only.
            <>
              <input
                className={inputClass}
                disabled
                value={`${editing.feeCode} — ${resolveFeeName(editing.feeCode)}`}
                readOnly
              />
              <p className="mt-1 text-xs text-gray-400">
                {t('feeStructureMaintenance:hints.feeCodeImmutable')}
              </p>
            </>
          ) : (
            <>
              <select {...register('feeCode')} className={inputClass} defaultValue="">
                <option value="" disabled>
                  {t('feeStructureMaintenance:fields.feeTypePlaceholder')}
                </option>
                {feeTypeOptions.map(opt => (
                  <option key={opt.value ?? opt.label} value={opt.value ?? ''}>
                    {opt.value} — {opt.label}
                  </option>
                ))}
              </select>
              {errors.feeCode && (
                <p className="mt-1 text-xs text-red-600">{errors.feeCode.message}</p>
              )}
            </>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('feeStructureMaintenance:fields.baseAmount')} <span className="text-red-500">*</span>
          </label>
          <input type="number" step="0.01" {...register('baseAmount')} className={inputClass} />
          {errors.baseAmount && (
            <p className="mt-1 text-xs text-red-600">{errors.baseAmount.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('feeStructureMaintenance:fields.minSellingPrice')}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register('minSellingPrice')}
              className={inputClass}
            />
            {errors.minSellingPrice && (
              <p className="mt-1 text-xs text-red-600">{errors.minSellingPrice.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('feeStructureMaintenance:fields.maxSellingPrice')}
              <span className="text-xs text-gray-400 ml-1">(optional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register('maxSellingPrice', {
                setValueAs: v => (v === '' || v === null || v === undefined ? null : Number(v)),
              })}
              className={inputClass}
              placeholder={t('feeStructureMaintenance:hints.maxSellingPrice')}
            />
            {errors.maxSellingPrice && (
              <p className="mt-1 text-xs text-red-600">{errors.maxSellingPrice.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="fee-isActive"
            type="checkbox"
            {...register('isActive')}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="fee-isActive" className="text-sm font-medium text-gray-700">
            {t('feeStructureMaintenance:fields.isActive')}
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
                : t('feeStructureMaintenance:modal.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Page ----

const FeeStructurePage = () => {
  const { t } = useTranslation(['feeStructureMaintenance', 'common']);
  const { data: fees, isLoading } = useGetFeeStructures();
  const deleteFee = useDeleteFeeStructure();
  const addDialog = useDisclosure();
  const [editing, setEditing] = useState<FeeStructureDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeStructureDto | null>(null);

  const feeTypeOptions = useParameterOptions(FEE_TYPE_PARAM_GROUP);

  const feeList = fees ?? [];

  // Resolve the display name from a fee code via the TypeOfFee parameter group.
  const feeName = (code: string) =>
    feeTypeOptions.find(o => o.value === code)?.label ?? code;

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteFee.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('feeStructureMaintenance:toasts.deleted'));
        setDeleteTarget(null);
      },
      onError: (err: unknown) => {
        const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
        toast.error(detail || t('feeStructureMaintenance:toasts.deleteFailed'));
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('feeStructureMaintenance:page.title')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('feeStructureMaintenance:page.subtitle')}
          </p>
        </div>
        <Button size="sm" type="button" onClick={addDialog.onOpen}>
          <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
          {t('feeStructureMaintenance:page.addFee')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : feeList.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-8 text-center text-sm text-gray-400 italic">
          {t('feeStructureMaintenance:page.noFees')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('feeStructureMaintenance:columns.feeCode')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('feeStructureMaintenance:columns.feeName')}
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('feeStructureMaintenance:columns.baseAmount')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('feeStructureMaintenance:columns.range')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('feeStructureMaintenance:columns.status')}
                </th>
                <th className="w-20 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {feeList.map(fee => (
                <tr key={fee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{fee.feeCode}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{feeName(fee.feeCode)}</td>
                  <td className="px-4 py-3 text-gray-600 text-right">
                    {fee.baseAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {fee.minSellingPrice.toLocaleString()}
                    {fee.maxSellingPrice != null
                      ? ` – ${fee.maxSellingPrice.toLocaleString()}`
                      : '+'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        fee.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {fee.isActive ? t('common:status.active') : t('common:status.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(fee)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        aria-label={`Edit ${feeName(fee.feeCode)}`}
                      >
                        <Icon name="pen" style="solid" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(fee)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        aria-label={`Delete ${feeName(fee.feeCode)}`}
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

      <FeeModal isOpen={addDialog.isOpen} onClose={addDialog.onClose} />

      {editing && <FeeModal isOpen onClose={() => setEditing(null)} editing={editing} />}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        title={t('feeStructureMaintenance:modal.deleteTitle')}
        message={
          deleteTarget
            ? t('feeStructureMaintenance:confirm.deleteFee', {
                name: feeName(deleteTarget.feeCode),
                code: deleteTarget.feeCode,
              })
            : ''
        }
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        isLoading={deleteFee.isPending}
      />
    </div>
  );
};

export default FeeStructurePage;
