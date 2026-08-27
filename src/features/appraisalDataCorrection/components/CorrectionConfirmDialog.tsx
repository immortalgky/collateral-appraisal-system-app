import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import type { DiffRow } from '../utils/diffRows';

interface CorrectionConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  diffRows: DiffRow[];
  reason: string;
  isLoading?: boolean;
}

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

const CorrectionConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  diffRows,
  reason,
  isLoading,
}: CorrectionConfirmDialogProps) => {
  const { t } = useTranslation('appraisalDataCorrection');

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t('confirmDialog.title')}
      confirmText={t('confirmDialog.confirm')}
      cancelText={t('confirmDialog.cancel')}
      variant="warning"
      isLoading={isLoading}
      loadingText={t('confirmDialog.saving')}
    >
      <div className="text-left space-y-4">
        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
          {diffRows.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">{t('confirmDialog.noChanges')}</p>
          ) : (
            diffRows.map(row => (
              <div key={row.field} className="px-3 py-2 text-xs">
                <div className="font-medium text-gray-700 mb-0.5">{row.label}</div>
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="line-through">{formatValue(row.from)}</span>
                  <span aria-hidden="true">→</span>
                  <span className="text-gray-900 font-medium">{formatValue(row.to)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">
            {t('confirmDialog.reasonLabel')}
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2">
            {reason}
          </p>
        </div>
      </div>
    </ConfirmDialog>
  );
};

export default CorrectionConfirmDialog;
