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
            <p className="px-3 py-2 text-sm text-(--palette-gray-500)">
              {t('confirmDialog.noChanges')}
            </p>
          )}
          {groups.map(({ group, entries }) => (
            <section key={group}>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-(--palette-gray-400)">
                {group || t('confirmDialog.fieldsHeading')}
              </h3>
              <div className="rounded-lg border border-(--palette-line) divide-y divide-(--palette-line-soft)">
                {entries.map(entry => (
                  <div key={entry.key} className="px-3 py-2 text-xs">
                    <div className="font-medium text-(--palette-ink) mb-0.5">{entry.label}</div>
                    {entry.kind === 'changed' && (
                      <div className="flex items-center gap-2 text-(--palette-gray-500)">
                        <span className="line-through">
                          {formatDiffValue(dateOnlyValue(entry.key, entry.from))}
                        </span>
                        <span aria-hidden="true">→</span>
                        <span className="text-(--palette-ink) font-medium">
                          {formatDiffValue(dateOnlyValue(entry.key, entry.to))}
                        </span>
                      </div>
                    )}
                    {entry.kind === 'added' && (
                      <div className="text-(--palette-ink)">
                        <span className="mr-2 font-semibold text-emerald-700 dark:text-emerald-300">
                          {t('confirmDialog.rowAdded')}
                        </span>
                        {formatDiffValue(dateOnlyValue(entry.key, entry.to))}
                      </div>
                    )}
                    {entry.kind === 'removed' && (
                      <div className="text-(--palette-gray-500)">
                        <span className="mr-2 font-semibold text-(--palette-req)">
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
          <div className="text-xs font-medium text-(--palette-gray-500) mb-1">
            {t('confirmDialog.reasonLabel')}
          </div>
          <p className="text-sm text-(--palette-ink) whitespace-pre-wrap rounded-lg bg-(--palette-surface-2) px-3 py-2">
            {reason}
          </p>
        </div>
      </div>
    </ConfirmDialog>
  );
};

export default CorrectionConfirmDialog;
