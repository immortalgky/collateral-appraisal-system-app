import { useTranslation } from 'react-i18next';
import { Skeleton } from '@shared/components/Skeleton';
import DataErrorState from '@shared/components/DataErrorState';
import type { FailedMessagesSummary } from '../types';
import { OUTBOX_MODULES } from '../types';
import { elapsedParts, formatClockOrDateTime, formatDateTime, isStale } from '../utils/queueHealth';

interface SummaryStripProps {
  summary?: FailedMessagesSummary;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  // The server's own clock (see serverClock in utils/queueHealth.ts) — null until the summary that
  // carries it has loaded, in which case no staleness marking is shown yet.
  now: Date | null;
}

const tileClass = (bad: boolean) =>
  `bg-base-100 p-[14px_18px] flex flex-col gap-[3px] ${bad ? 'bg-gradient-to-b from-red-50 to-base-100 dark:from-red-500/10' : ''}`;

const SummaryStrip = ({ summary, isLoading, isError, onRetry, now }: SummaryStripProps) => {
  const { t, i18n } = useTranslation('failedMessages');

  // No data and no error = still loading (or paused offline) — never a failure.
  if (isLoading || (!summary && !isError)) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-px bg-base-300 border border-base-300 rounded-2xl overflow-hidden">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-base-100 p-[14px_18px] flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="bg-base-100 border border-base-300 rounded-2xl">
        <DataErrorState variant="inline" title={t('summary.loadFailed')} onRetry={onRetry} />
      </div>
    );
  }

  const anyStale = summary.nodes.some(n => isStale(n.collectedAt, now));
  // Same failed + stuck rule as the SourceSwitch badge — a stuck-only outbox is still a problem.
  const outboxTotal = summary.outboxFailedCount + summary.outboxStuckCount;
  const outboxBad = outboxTotal > 0;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-px bg-base-300 border border-base-300 rounded-2xl overflow-hidden shadow-sm">
      {/* Pending */}
      <div className={tileClass(summary.pendingCount > 0)}>
        <span className="text-[11px] font-semibold tracking-wide uppercase text-base-content/60">
          {t('summary.pendingLabel')}
        </span>
        <span
          className={`text-[30px] font-semibold leading-tight tracking-tight tabular-nums ${summary.pendingCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}
        >
          {summary.pendingCount}
        </span>
        {summary.oldestPendingAt && (
          <span className="text-[12px] text-base-content/60">
            {t('summary.pendingSub', {
              date: formatDateTime(summary.oldestPendingAt, i18n.language),
            })}
          </span>
        )}
      </div>

      {/* Last 24h */}
      <div className={tileClass(false)}>
        <span className="text-[11px] font-semibold tracking-wide uppercase text-base-content/60">
          {t('summary.last24hLabel')}
        </span>
        <span className="text-[30px] font-semibold leading-tight tracking-tight tabular-nums">
          {summary.last24h.total}
        </span>
        <span className="text-[12px] text-base-content/60">
          {t('summary.last24hSub', {
            retried: summary.last24h.retried,
            discarded: summary.last24h.discarded,
          })}
        </span>
      </div>

      {/* Collectors */}
      <div className={tileClass(anyStale)}>
        <span className="text-[11px] font-semibold tracking-wide uppercase text-base-content/60">
          {t('summary.collectorLabel')}
        </span>
        {summary.nodes.length === 0 ? (
          <span className="text-[13px] text-base-content/60">{t('summary.collectorNoNodes')}</span>
        ) : (
          summary.nodes.map(node => {
            // A node can have a Pending FailedMessage but no BrokerSnapshot row yet — neither stale
            // (nothing to be behind on) nor fresh, just unknown; doesn't count toward `anyStale`.
            if (node.collectedAt === undefined) {
              return (
                <span key={node.node} className="flex items-center gap-2 text-[13px]">
                  <span className="size-2 rounded-full shrink-0 bg-base-content/30" />
                  <span className="text-base-content/60">
                    {t('summary.collectorNoSnapshot', { node: node.node })}
                  </span>
                </span>
              );
            }
            const stale = isStale(node.collectedAt, now);
            const parts = stale && now ? elapsedParts(node.collectedAt, now) : null;
            return (
              <span key={node.node} className="flex items-center gap-2 text-[13px]">
                <span
                  className={`size-2 rounded-full shrink-0 ${stale ? 'bg-red-500' : 'bg-emerald-500'}`}
                />
                {stale && parts ? (
                  <b className="font-semibold text-red-600 dark:text-red-400">
                    {t('summary.collectorStale', {
                      node: node.node,
                      hours: parts.hours,
                      minutes: parts.minutes,
                    })}
                  </b>
                ) : (
                  <span>
                    {t('summary.collectorFresh', {
                      node: node.node,
                      time: formatClockOrDateTime(node.collectedAt, i18n.language, now),
                    })}
                  </span>
                )}
              </span>
            );
          })
        )}
        {anyStale && (
          <span className="text-[12px] text-base-content/60">
            {t('summary.collectorStaleSub', {
              nodes: summary.nodes
                .filter(n => isStale(n.collectedAt, now))
                .map(n => n.node)
                .join(', '),
            })}
          </span>
        )}
      </div>

      {/* Outbox */}
      <div className={tileClass(outboxBad)}>
        <span className="text-[11px] font-semibold tracking-wide uppercase text-base-content/60">
          {t('summary.outboxLabel')}
        </span>
        <span
          className={`text-[30px] font-semibold leading-tight tracking-tight tabular-nums ${outboxBad ? 'text-red-600 dark:text-red-400' : ''}`}
        >
          {outboxTotal}
        </span>
        <span className="text-[12px] text-base-content/60">
          {t('summary.outboxSub', {
            failed: summary.outboxFailedCount,
            stuck: summary.outboxStuckCount,
            count: OUTBOX_MODULES.length,
          })}
        </span>
      </div>
    </div>
  );
};

export default SummaryStrip;
