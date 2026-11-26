import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Textarea from '@/shared/components/inputs/Textarea';
import { formatNumber } from '@/shared/utils/formatUtils';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { errorText } from '@/shared/utils/errorUtils';
import { useAppraisalTypeLabel } from '@/shared/hooks/useCodeLabels';
import { useSetAppraisalSuspension } from '../api/appraisalSuspension';
import type { AppraisalSuspensionRow } from '../types';

interface SuspensionActionDialogProps {
  /** null = closed. Rendered with `key={appraisalId}` so the reason starts empty for each row. */
  row: AppraisalSuspensionRow | null;
  onClose: () => void;
}

/** Suspend or reactivate one appraisal: reason (required) + confirm. */
const SuspensionActionDialog = ({ row, onClose }: SuspensionActionDialogProps) => {
  const { t, i18n } = useTranslation('appraisalSuspension');
  const appraisalTypeLabel = useAppraisalTypeLabel();
  const [reason, setReason] = useState('');
  const mutation = useSetAppraisalSuspension();

  if (!row) return null;

  const suspend = !row.isSuspended;
  const trimmed = reason.trim();

  const handleConfirm = () => {
    if (!trimmed) return;
    mutation.mutate(
      { appraisalId: row.appraisalId, isSuspended: suspend, reason: trimmed },
      {
        onSuccess: () => {
          toast.success(
            t(suspend ? 'action.suspendSuccess' : 'action.reactivateSuccess', {
              number: row.appraisalNumber,
            }),
          );
          onClose();
        },
        onError: error => toast.error(errorText(error, t('action.failed'))),
      },
    );
  };

  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      onConfirm={handleConfirm}
      title={t(suspend ? 'action.suspendTitle' : 'action.reactivateTitle', {
        number: row.appraisalNumber,
      })}
      confirmText={t(suspend ? 'action.suspend' : 'action.reactivate')}
      cancelText={t('action.cancel')}
      variant={suspend ? 'danger' : 'primary'}
      isLoading={mutation.isPending}
      loadingText={t('action.saving')}
      confirmDisabled={!trimmed}
    >
      <div className="text-left space-y-3">
        {/* Enough detail to recognise the appraisal before acting on it. */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border border-(--palette-line) bg-(--palette-surface-2) px-3 py-2.5 text-sm">
          {(
            [
              ['appraisalNumber', row.appraisalNumber],
              ['customerName', row.customerName ?? '—'],
              ['appraisalType', appraisalTypeLabel(row.appraisalType) ?? row.appraisalType],
              [
                'appraisedValue',
                row.appraisedValue != null ? formatNumber(row.appraisedValue, 2) : '—',
              ],
              ['completedAt', formatLocaleDate(row.completedAt, i18n.language)],
            ] as const
          ).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-(--palette-gray-500)">{t(`table.col.${key}`)}</dt>
              <dd className="font-medium text-(--palette-ink) wrap-break-word">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-(--palette-gray-600)">
          {t(suspend ? 'action.suspendWarning' : 'action.reactivateWarning')}
        </p>
        <Textarea
          label={t('action.reasonLabel')}
          required
          value={reason}
          onChange={e => setReason(e.target.value)}
          maxLength={4000}
          placeholder={t('action.reasonPlaceholder')}
        />
      </div>
    </ConfirmDialog>
  );
};

export default SuspensionActionDialog;
