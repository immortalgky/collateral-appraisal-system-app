import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import FileBadgeIcon from './documentCard/FileBadgeIcon';
import type { CarryForwardDocument } from '@/features/appraisal/api/priorAppraisal';
import { carriedTitleRef, carryEntryKey } from '../utils/carryForward';

interface CarryForwardSummaryProps {
  number: string | null;
  usedCount: number;
  unused: CarryForwardDocument[];
  onRestore: (doc: CarryForwardDocument) => void;
  /** Opens the file in a new tab, like View on a file already in the list. */
  onView: (doc: CarryForwardDocument) => void;
  getDocTypeName: (code: string) => string;
}

/** "From previous appraisal X · used n · not used m" plus the list that brings a file back. */
const CarryForwardSummary = ({
  number,
  usedCount,
  unused,
  onRestore,
  onView,
  getDocTypeName,
}: CarryForwardSummaryProps) => {
  const { t } = useTranslation('request');
  const [showUnused, setShowUnused] = useState(false);
  const open = showUnused && unused.length > 0;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-violet-500/10 px-3 py-2 text-sm text-(--palette-ink)">
        <span>
          {t('carryForward.summary.from')}{' '}
          <b className="text-violet-700 dark:text-violet-300">{number}</b>
        </span>
        <span>
          · {t('carryForward.summary.used')} <b className="tabular-nums">{usedCount}</b>
        </span>
        <span>
          · {t('carryForward.summary.unused')} <b className="tabular-nums">{unused.length}</b>
        </span>
        {unused.length > 0 && (
          <button
            type="button"
            onClick={() => setShowUnused(v => !v)}
            aria-expanded={open}
            className="cursor-pointer text-violet-700 dark:text-violet-300 underline underline-offset-2 hover:text-violet-900 dark:hover:text-violet-200"
          >
            {open ? t('carryForward.summary.hide') : t('carryForward.summary.show')}
          </button>
        )}
      </div>

      {open && (
        <div className="overflow-hidden rounded-lg border border-violet-200 dark:border-violet-500/30">
          <div className="flex flex-wrap justify-between gap-1 bg-violet-500/10 px-3 py-2 text-sm text-(--palette-ink)">
            <span>{t('carryForward.unusedPanel.title')}</span>
            <span>{t('carryForward.unusedPanel.hint')}</span>
          </div>
          {unused.map(doc => (
            <div
              key={carryEntryKey(doc)}
              className="flex flex-wrap items-center gap-3 border-t border-(--palette-line-soft) px-3 py-2"
            >
              <FileBadgeIcon fileName={doc.fileName} />
              <span className="min-w-48 flex-1 text-sm text-(--palette-ink)">
                <b className="font-medium">{getDocTypeName(doc.suggestedType)}</b>
                {/* A title's file says which title it came from: its deed is not told apart by its name */}
                {carriedTitleRef(t, doc) && (
                  <span className="text-(--palette-gray-500)"> ·{carriedTitleRef(t, doc)}</span>
                )}{' '}
                · {doc.fileName}
                {!doc.defaultUse && (
                  <span className="ml-2 rounded-full bg-(--palette-surface-3) px-2 py-0.5 text-xs text-(--palette-gray-600)">
                    {t('carryForward.unusedPanel.defaultNotUsed')}
                  </span>
                )}
              </span>
              {/* A disabled button shows no tooltip in every browser, so the span carries it */}
              <span
                title={doc.documentId ? undefined : t('carryForward.unusedPanel.viewUnavailable')}
              >
                <button
                  type="button"
                  onClick={() => onView(doc)}
                  disabled={!doc.documentId}
                  aria-label={`${t('documentActions.view')} ${doc.fileName}`}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-(--palette-line) bg-(--palette-surface) text-(--palette-gray-600) hover:bg-(--palette-surface-2) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="eye" style="regular" className="h-4 w-4" />
                </button>
              </span>
              <button
                type="button"
                onClick={() => onRestore(doc)}
                className="cursor-pointer rounded-md border border-violet-200 bg-(--palette-surface) px-3 py-1 text-sm text-violet-700 hover:bg-violet-500/10 dark:border-violet-500/40 dark:text-violet-300"
              >
                {t('carryForward.unusedPanel.use')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CarryForwardSummary;

/** Shown in place of the summary line when the previous appraisal's documents could not be loaded. */
export const CarryForwardLoadError = ({
  retrying,
  onRetry,
}: {
  retrying: boolean;
  onRetry: () => void;
}) => {
  const { t } = useTranslation('request');
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-(--palette-warn-wash) px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
      <span>{t('carryForward.retry.message')}</span>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="cursor-pointer text-violet-700 dark:text-violet-300 underline underline-offset-2 hover:text-violet-900 dark:hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t('carryForward.retry.action')}
      </button>
    </div>
  );
};
