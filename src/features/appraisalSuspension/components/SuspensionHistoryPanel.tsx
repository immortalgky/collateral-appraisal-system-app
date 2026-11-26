import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Badge from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { formatLocaleDateTime } from '@/shared/utils/dateUtils';
import { useAppraisalSuspensionLogs } from '../api/appraisalSuspension';
import type { AppraisalSuspensionLog, AppraisalSuspensionRow } from '../types';

interface SuspensionHistoryPanelProps {
  row: AppraisalSuspensionRow | null;
}

/** One timeline entry: dot + badge, then "date · user", then the reason as the body. */
const LogEntry = ({ log, isLast }: { log: AppraisalSuspensionLog; isLast: boolean }) => {
  const { t, i18n } = useTranslation('appraisalSuspension');
  const suspended = log.action === 'Suspended';

  return (
    <li className="relative flex gap-3 pb-5">
      {/* Rail between dots; the last entry has none. */}
      {!isLast && (
        <span className="absolute left-[0.3125rem] top-4 bottom-0 w-px bg-(--palette-line)" />
      )}
      <span
        className={clsx(
          'relative mt-1.5 size-2.5 shrink-0 rounded-full',
          suspended ? 'bg-red-500' : 'bg-green-600',
        )}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <Badge size="sm" tone={suspended ? 'red' : 'green'} className="whitespace-nowrap">
          {t(suspended ? 'history.toSuspended' : 'history.toReactivated')}
        </Badge>
        <p className="text-xs text-(--palette-gray-500)">
          {formatLocaleDateTime(log.actionAt, i18n.language)} · {log.actionBy}
        </p>
        <p className="text-sm text-(--palette-ink) whitespace-pre-wrap wrap-break-word">
          {log.reason}
        </p>
      </div>
    </li>
  );
};

const SuspensionHistoryPanel = ({ row }: SuspensionHistoryPanelProps) => {
  const { data: logs = [], isLoading } = useAppraisalSuspensionLogs(row?.appraisalId ?? null);
  const { t } = useTranslation('appraisalSuspension');

  if (isLoading) {
    return (
      <div className="space-y-5" aria-busy="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton variant="circular" width="0.625rem" height="0.625rem" />
            <div className="flex-1 space-y-2">
              <Skeleton width="8rem" height="1.125rem" />
              <Skeleton width="12rem" height="0.75rem" />
              <Skeleton width="100%" height="0.875rem" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-(--palette-gray-500)">{t('history.empty')}</p>
    );
  }

  return (
    <ol>
      {logs.map((log, i) => (
        <LogEntry key={`${log.actionAt}-${i}`} log={log} isLast={i === logs.length - 1} />
      ))}
    </ol>
  );
};

export default SuspensionHistoryPanel;
