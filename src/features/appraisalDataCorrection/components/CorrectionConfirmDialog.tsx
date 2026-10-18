import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { dateOnlyValue, formatDiffValue, groupDiff, type DiffEntry } from '../utils/formDiff';

interface CorrectionConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  diff: DiffEntry[];
  reason: string;
  isLoading?: boolean;
}

const CorrectionConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  diff,
  reason,
  isLoading,
}: CorrectionConfirmDialogProps) => {
  const { t } = useTranslation('appraisalDataCorrection');
  const groups = useMemo(() => groupDiff(diff), [diff]);

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
        <div className="max-h-72 overflow-y-auto space-y-3">
          {groups.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-500">{t('confirmDialog.noChanges')}</p>
          )}
          {groups.map(({ group, entries }) => (
            <section key={group}>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {group || t('confirmDialog.fieldsHeading')}
              </h3>
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                {entries.map(entry => (
                  <div key={entry.key} className="px-3 py-2 text-xs">
                    <div className="font-medium text-gray-700 mb-0.5">{entry.label}</div>
                    {entry.kind === 'changed' && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="line-through">
                          {formatDiffValue(dateOnlyValue(entry.key, entry.from))}
                        </span>
                        <span aria-hidden="true">→</span>
                        <span className="text-gray-900 font-medium">
                          {formatDiffValue(dateOnlyValue(entry.key, entry.to))}
                        </span>
                      </div>
                    )}
                    {entry.kind === 'added' && (
                      <div className="text-gray-700">
                        <span className="mr-2 font-semibold text-emerald-700">
                          {t('confirmDialog.rowAdded')}
                        </span>
                        {formatDiffValue(dateOnlyValue(entry.key, entry.to))}
                      </div>
                    )}
                    {entry.kind === 'removed' && (
                      <div className="text-gray-500">
                        <span className="mr-2 font-semibold text-red-700">
                          {t('confirmDialog.rowRemoved')}
                        </span>
                        <span className="line-through">
                          {formatDiffValue(dateOnlyValue(entry.key, entry.from))}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
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
