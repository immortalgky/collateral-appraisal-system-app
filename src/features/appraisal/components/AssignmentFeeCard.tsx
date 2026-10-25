import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import FormCard from '@/shared/components/sections/FormCard';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useAddFeeItem, useRemoveFeeItem, useUpdateFeeItem } from '../api/fee';
import { useGetFeePreview } from '../api/feePreview';
import type { FeeItem } from '../types/appointmentAndFee';
import type { FeeBaseSource, FeePreviewItem, FeePreviewParams } from '../types/feePreview';
import { useFeeTypeLabel } from '../utils/useFeeTypeLabel';
import AddFeeModal from './AddFeeModal';
import AdminFeeBadge from './AdminFeeBadge';

const money = (amount: number) => formatNumber(amount, 2);

interface AssignmentFeeCardProps {
  appraisalId: string;
  /**
   * The selection to estimate; empty = the appraisal's actual assignment (a made assignment);
   * null = nothing is selected yet, so there is nothing to estimate.
   */
  params: FeePreviewParams | null;
  editable: boolean;
}

type FeeDialog = {
  /** Set when an existing admin item is being edited; unset adds a new one. */
  itemId?: string;
  defaults?: FeeItem;
};

const actionClass =
  'text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline';
const secondaryActionClass =
  'text-xs font-medium text-gray-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline';

/**
 * Admin-side fee estimate for the assignment being chosen. Items come from fee-preview; the admin's
 * own edits go through the ordinary fee item endpoints (the server marks them Admin and skips
 * approval), so the base is edited by adding or updating a feeCode '01' item and removed to fall
 * back to the system figure.
 */
export default function AssignmentFeeCard({
  appraisalId,
  params,
  editable,
}: AssignmentFeeCardProps) {
  const { t } = useTranslation('appraisal');
  const {
    data: preview,
    isError,
    isPlaceholderData,
    isFetching,
  } = useGetFeePreview(appraisalId, params ?? {}, params !== null);
  // The appraisal's fee row, as the fee-preview reports it (null until one exists).
  const feeId = preview?.feeId ?? undefined;
  const addItem = useAddFeeItem();
  const updateItem = useUpdateFeeItem();
  const removeItem = useRemoveFeeItem();
  // Fee writes are immediate, so one at a time: a second add while the first is in flight would
  // create a duplicate row.
  const busy = addItem.isPending || updateItem.isPending || removeItem.isPending;
  // The figures on screen belong to the previous selection while the new one loads (isPlaceholderData),
  // and right after the first write they are stale until the refetch lands: it creates the fee row,
  // whose id the preview does not carry yet, so a second add would post to the no-row route again.
  // Once the preview has a fee id, a background refetch (focus, a quotation change) freezes nothing.
  const frozen = busy || isPlaceholderData || (isFetching && !preview?.feeId);
  const [dialog, setDialog] = useState<FeeDialog | null>(null);
  const [deleting, setDeleting] = useState<FeePreviewItem | null>(null);

  /** Runs a write and toasts the outcome; false when it failed. */
  const run = async (action: () => Promise<unknown>, success: string, failure: string) => {
    try {
      await action();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error((error as { apiError?: { detail?: string } })?.apiError?.detail || failure);
      return false;
    }
  };

  // Returns false when nothing was saved, so the add/edit modal stays open with its input.
  const handleSubmit = async (data: Omit<FeeItem, 'id'>): Promise<boolean> => {
    if (busy) {
      toast.error(t('fee.toasts.changeInProgress'));
      return false;
    }
    const body = { feeCode: data.type, feeDescription: data.description, feeAmount: data.amount };
    const itemId = dialog?.itemId;
    // Editing the system's own base (no stored item, or a stored one still marked System) and
    // confirming it unchanged would make it a permanent admin override of the same figure: close
    // without writing anything. An admin's or a user's own item is saved as before.
    const shown = dialog?.defaults;
    const isSystemFigure =
      !itemId || preview?.items.find(i => i.id === itemId)?.source === 'System';
    if (
      isSystemFigure &&
      shown &&
      shown.type === data.type &&
      shown.description === data.description &&
      shown.amount === data.amount
    ) {
      return true;
    }
    if (itemId) {
      // An item that exists has a fee row, whose id the fee-preview carries.
      if (!feeId) {
        toast.error(t('fee.toasts.feeUpdateFailed'));
        return false;
      }
      return run(
        () => updateItem.mutateAsync({ appraisalId, feeId, feeItemId: itemId, ...body }),
        t('fee.toasts.feeUpdated'),
        t('fee.toasts.feeUpdateFailed'),
      );
    }
    // No fee row yet: addItem posts without a feeId and the server creates the row.
    return run(
      () => addItem.mutateAsync({ appraisalId, feeId, ...body }),
      t('fee.toasts.feeAdded'),
      t('fee.toasts.feeAddFailed'),
    );
  };

  const handleDelete = async () => {
    const itemId = deleting?.id;
    setDeleting(null);
    if (!itemId || busy) return;
    if (!feeId) {
      toast.error(t('fee.toasts.feeDeleteFailed'));
      return;
    }
    await run(
      () => removeItem.mutateAsync({ appraisalId, feeId, feeItemId: itemId }),
      t('fee.toasts.feeDeleted'),
      t('fee.toasts.feeDeleteFailed'),
    );
  };

  const typeLabel = useFeeTypeLabel();

  const toFeeItem = (item: FeePreviewItem): FeeItem => ({
    id: item.id ?? '',
    type: item.feeCode as FeeItem['type'],
    description: item.description,
    amount: item.amount,
  });

  const sourceNote = (source: FeeBaseSource): { text: string; warn?: boolean } | null => {
    const n = { appraisalNumber: source.appraisalNumber ?? '' };
    switch (source.kind) {
      case 'ConstructionInspectionFee':
        return { text: t('feePreview.source.ConstructionInspectionFee', n) };
      case 'Quotation':
        return {
          text: t('feePreview.source.Quotation', {
            quotationNumber: source.quotationNumber ?? '',
            winner: source.winnerCompanyName ?? '',
          }),
        };
      case 'Tier': {
        const min = money(source.tierMin ?? 0);
        const range =
          source.tierMax != null
            ? `${min} – ${money(source.tierMax)}`
            : t('feePreview.tierOpenEnded', { min });
        return {
          text: t('feePreview.source.Tier', {
            sellingPrice: source.sellingPrice != null ? money(source.sellingPrice) : '-',
            range,
          }),
        };
      }
      case 'None':
        return source.appraisalNumber
          ? { text: t('feePreview.source.NoneFromPrior', n), warn: true }
          : { text: t('feePreview.source.None') };
      default:
        return null;
    }
  };

  const renderBody = () => {
    if (params === null) {
      // Nothing to estimate: an editable page asks for a type, a read-only one has no data to show.
      return (
        <p className="text-sm text-gray-500">
          {t(editable ? 'feePreview.selectTypeFirst' : 'administration.noData')}
        </p>
      );
    }
    if (isError && !preview) {
      return <p className="text-sm text-danger">{t('feePreview.loadFailed')}</p>;
    }
    if (!preview) {
      return (
        <div
          className="flex justify-center py-4"
          role="status"
          aria-label={t('feePreview.loading')}
        >
          <Icon name="spinner" style="solid" className="animate-spin text-xl text-primary" />
        </div>
      );
    }

    const { baseSource } = preview;
    const base = preview.items.find(i => i.feeCode === '01');
    const baseIsAdmin = base?.source === 'Admin' && !!base.id;
    // No 01 line, whatever the source says (none, a quotation still waiting for its winner, or a
    // tier / prior fee that gave no amount): there is no system base to edit, so offer to set one.
    // Without it nothing could satisfy the base the assignment needs.
    const showUnsetBase = !base;
    // Waiting for a winner: say so above the rows (the controls below still work).
    const pendingNotice =
      baseSource.kind === 'QuotationPending' && !base ? (
        <div className="flex flex-col gap-0.5 rounded-lg bg-gray-50 px-2.5 py-2">
          <span className="text-sm font-medium text-gray-800">{t('feePreview.pending.title')}</span>
          <span className="text-xs text-gray-500">
            {baseSource.quotationNumber
              ? t('feePreview.pending.hint', { quotationNumber: baseSource.quotationNumber })
              : t('feePreview.pending.hintNoNumber')}
          </span>
        </div>
      ) : null;
    const extras = preview.items.filter(i => i.feeCode !== '01');
    // Both "None" notes (a prior that kept no inspection fee, or no source at all) point at the
    // unset-base row's button, so they end once a base item exists.
    const note = baseSource.kind === 'None' && !showUnsetBase ? null : sourceNote(baseSource);

    // Amounts sit right-aligned at the card's right edge, actions in the last column.
    const th =
      'border-b border-gray-200 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-600';
    const td = 'border-b border-gray-100 px-2 py-2 align-middle';
    const amountTd = clsx(td, 'text-right tabular-nums text-gray-800');
    const actionsTd = clsx(td, 'whitespace-nowrap');
    const dash = <span className="text-gray-400">—</span>;

    // Who set the amount: an admin's own figure shows the chip and what the system would have said.
    const sourceCell = (item: FeePreviewItem) =>
      item.source === 'Admin' ? (
        <AdminFeeBadge
          label={t('fee.adminChip')}
          systemAmount={
            item.feeCode === '01' && preview.systemBaseAmount != null
              ? money(preview.systemBaseAmount)
              : undefined
          }
        />
      ) : (
        dash
      );

    return (
      <div className={clsx('flex flex-col gap-2.5 text-sm', isPlaceholderData && 'opacity-60')}>
        {pendingNotice}
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={th}>{t('feePreview.columns.item')}</th>
              <th className={th}>{t('feePreview.columns.source')}</th>
              <th className={clsx(th, 'text-right')}>{t('feePreview.columns.amount')}</th>
              <th className={th}>
                <span className="sr-only">{t('fee.columns.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {base && (
              <tr>
                <td className={clsx(td, 'font-medium text-gray-800')}>{typeLabel('01')}</td>
                <td className={td}>{sourceCell(base)}</td>
                <td className={amountTd}>{money(base.amount)}</td>
                <td className={actionsTd}>
                  <span className="flex items-center justify-end gap-2">
                    {editable && (
                      <button
                        type="button"
                        className={actionClass}
                        disabled={frozen}
                        aria-label={t('feePreview.aria.editBase')}
                        onClick={() =>
                          setDialog(
                            // A stored 01 item is updated (the server makes it the Admin base);
                            // only the system's own figure, which has no item yet, is added.
                            base.id
                              ? { itemId: base.id, defaults: toFeeItem(base) }
                              : { defaults: toFeeItem(base) },
                          )
                        }
                      >
                        {t('feePreview.editBase')}
                      </button>
                    )}
                    {editable && baseIsAdmin && (
                      <button
                        type="button"
                        className={secondaryActionClass}
                        disabled={frozen}
                        aria-label={t('feePreview.aria.resetBase')}
                        onClick={() => setDeleting(base)}
                      >
                        {t('feePreview.resetBase')}
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            )}

            {showUnsetBase && (
              <tr>
                <td className={clsx(td, 'font-medium text-gray-800')}>{t('feePreview.type.01')}</td>
                <td className={td}>{dash}</td>
                <td className={amountTd}>{dash}</td>
                <td className={actionsTd}>
                  <span className="flex items-center justify-end gap-2">
                    {editable && (
                      <button
                        type="button"
                        className={actionClass}
                        disabled={frozen}
                        // The slip's "go fix" for a missing fee lands here.
                        data-fix-target=""
                        aria-label={t('feePreview.aria.setBase')}
                        onClick={() =>
                          setDialog({
                            defaults: {
                              id: '',
                              type: '01',
                              description: t('feePreview.type.01'),
                              amount: 0,
                            },
                          })
                        }
                      >
                        {t('feePreview.setBase')}
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            )}

            {extras.map((item, index) => {
              const isAdmin = item.source === 'Admin';
              return (
                <tr key={item.id ?? `${item.feeCode}-${index}`}>
                  <td className={clsx(td, 'text-gray-800')}>
                    <span className="font-medium">{item.description}</span>{' '}
                    <span className="text-gray-500">({typeLabel(item.feeCode)})</span>
                  </td>
                  <td className={td}>{sourceCell(item)}</td>
                  <td className={amountTd}>{money(item.amount)}</td>
                  <td className={actionsTd}>
                    <span className="flex items-center justify-end gap-2">
                      {editable && isAdmin && item.id && (
                        <>
                          <button
                            type="button"
                            className={actionClass}
                            disabled={frozen}
                            aria-label={t('feePreview.aria.editItem', {
                              description: item.description,
                            })}
                            onClick={() =>
                              setDialog({ itemId: item.id!, defaults: toFeeItem(item) })
                            }
                          >
                            {t('feePreview.edit')}
                          </button>
                          <button
                            type="button"
                            className={secondaryActionClass}
                            disabled={frozen}
                            aria-label={t('feePreview.aria.deleteItem', {
                              description: item.description,
                            })}
                            onClick={() => setDeleting(item)}
                          >
                            {t('feePreview.delete')}
                          </button>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Subtotal, VAT and the total live on the assignment slip, from this same query. */}
        {editable && (
          <button
            type="button"
            className="self-start rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
            disabled={frozen}
            onClick={() => setDialog({})}
          >
            + {t('fee.addFee')}
          </button>
        )}

        {note && (
          <p
            className={clsx(
              'rounded-lg px-2.5 py-2 text-xs',
              note.warn
                ? 'border border-amber-200 bg-amber-50 text-amber-800'
                : 'bg-gray-50 text-gray-600',
            )}
          >
            {note.text}
          </p>
        )}
      </div>
    );
  };

  return (
    <FormCard
      title={t('feePreview.title')}
      subtitle={editable ? t('feePreview.subtitleEditable') : t('feePreview.subtitle')}
    >
      {renderBody()}

      <AddFeeModal
        isOpen={dialog !== null}
        onClose={() => setDialog(null)}
        onSubmit={handleSubmit}
        defaultValues={dialog?.defaults}
        // "Edit" only when a stored item is updated; setting the base or changing the system's
        // figure adds an item, so those say "Add".
        isEditing={!!dialog?.itemId}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title={t('fee.deleteFeeDialog.title')}
        message={
          deleting?.feeCode === '01'
            ? preview?.systemBaseAmount != null
              ? t('feePreview.resetDialog.message', { amount: money(preview.systemBaseAmount) })
              : t('feePreview.resetDialog.messageNoSystem')
            : t('fee.deleteFeeDialog.message', {
                description: `${deleting?.description ?? ''} (${money(deleting?.amount ?? 0)})`,
              })
        }
        confirmText={
          deleting?.feeCode === '01'
            ? t('feePreview.resetDialog.confirm')
            : t('fee.deleteFeeDialog.confirm')
        }
        variant="danger"
      />
    </FormCard>
  );
}
