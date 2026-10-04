import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/components';
import { useRelativeTime } from '@/shared/hooks/useFormatters';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

interface PmaSyncStatusProps {
  status?: string | null;
  error?: string | null;
  syncedAt?: string | null;
}

/**
 * Where this PMA property stands with the external system, shown beside the type chip in the
 * editor header: synced (and when), waiting, or failed. The failure reason is read from the badge
 * (a focusable note described by a screen-reader-only line) as well as by hover; the retry hint
 * only shows where Save is there to retry with.
 */
const PmaSyncStatus = ({ status, error, syncedAt }: PmaSyncStatusProps) => {
  const { t } = useTranslation('appraisal');
  const relTime = useRelativeTime();
  const readOnly = usePageReadOnly();
  const reasonId = useId();
  if (!status || status === 'NotSynced') return null;
  const synced = syncedAt ? relTime(syncedAt) : null;

  return (
    <span className="flex shrink-0 items-center gap-2">
      {status === 'Delivered' && (
        <>
          <Badge type="externalSyncStatus" value="Delivered" size="sm">
            {t('editorHeader.pmaSync.synced')}
          </Badge>
          {synced && (
            <span className="text-xs text-gray-400" title={synced.absolute}>
              · {synced.relative}
            </span>
          )}
        </>
      )}
      {status === 'Pending' && (
        <Badge type="externalSyncStatus" value="Pending" size="sm">
          {t('editorHeader.pmaSync.pending')}
        </Badge>
      )}
      {status === 'Failed' && (
        <>
          {/* The badge is the focusable note; its description is the reason, held outside it so a
              screen reader says "failed", then the reason, once each. Hover still shows the title. */}
          <span
            role="note"
            tabIndex={error ? 0 : undefined}
            title={error ?? undefined}
            aria-describedby={error ? reasonId : undefined}
          >
            <Badge type="externalSyncStatus" value="Failed" size="sm">
              {t('editorHeader.pmaSync.failed')}
            </Badge>
          </span>
          {!readOnly && (
            <span className="text-xs text-gray-400">{t('editorHeader.pmaSync.retryHint')}</span>
          )}
          {error && (
            <span id={reasonId} className="sr-only">
              {error}
            </span>
          )}
        </>
      )}
    </span>
  );
};

export default PmaSyncStatus;
