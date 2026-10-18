import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import DataErrorState from '@shared/components/DataErrorState';
import type { NodeHealth, QueueHealth } from '../types';
import {
  formatClockOrDateTime,
  isGrowing,
  isStale,
  queueSeverity,
  sortQueuesBySeverity,
} from '../utils/queueHealth';
import type { QueueSeverity } from '../utils/queueHealth';
import Sparkline from './Sparkline';
import { Tag } from './ui';

interface QueueHealthPanelProps {
  nodes: NodeHealth[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  // The server's own clock (see serverClock in utils/queueHealth.ts) — null until the summary that
  // carries it has loaded, in which case no staleness marking is shown yet.
  now: Date | null;
  onQueueSelect: (target: { queue: string; node: string }) => void;
}

const fmtRate = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1));

function ConsumerDots({ consumers }: { consumers?: number }) {
  if (consumers === undefined) return null;
  if (consumers === 0) {
    return (
      <span className="inline-flex" aria-hidden="true">
        <span className="size-[6px] rounded-full border border-red-500" />
      </span>
    );
  }
  const count = Math.min(consumers, 6);
  return (
    <span className="inline-flex gap-[2px]" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="size-[6px] rounded-full bg-primary" />
      ))}
    </span>
  );
}

interface QueueRowProps {
  queue: QueueHealth;
  node: string;
  severity: QueueSeverity;
  maxDepth: number;
  onSelect: (target: { queue: string; node: string }) => void;
}

const QueueRow = ({ queue: q, node, severity, maxDepth, onSelect }: QueueRowProps) => {
  const { t } = useTranslation('failedMessages');
  const growing = isGrowing(q);

  const why =
    severity === 'crit' ? (
      <span>{t('queueHealth.reasonCrit', { ready: q.ready ?? 0 })}</span>
    ) : growing ? (
      <span className="text-amber-600 dark:text-amber-400">{t('queueHealth.reasonGrowing')}</span>
    ) : q.publishRate !== undefined && q.deliverRate !== undefined ? (
      <span>
        {t('queueHealth.reasonRates', { in: fmtRate(q.publishRate), out: fmtRate(q.deliverRate) })}
      </span>
    ) : null;

  // Kept distinct from the 0-defaulted bar widths below — a genuinely absent broker read (a node
  // with no snapshot at all) must show "—", not "0 ready", which would wrongly claim an empty queue.
  const ready = q.ready;
  const unacked = q.unacked;
  const readyBar = ready ?? 0;
  const unackedBar = unacked ?? 0;
  const clickable = q.errorCount > 0 || q.skippedCount > 0;

  const stripeClass = clsx(
    'self-stretch rounded-r-[3px] w-[3px]',
    severity === 'crit'
      ? 'bg-red-500 shadow-[0_0_12px_theme(colors.red.500)]'
      : severity === 'warn'
        ? 'bg-amber-500'
        : 'bg-primary opacity-45',
  );

  const content = (
    <>
      <span className={clsx(stripeClass, 'max-[619px]:[grid-area:s]')} />
      <span className="min-w-0 flex flex-col gap-[3px] max-[619px]:[grid-area:n]">
        <span className="font-mono text-[12px] text-base-content overflow-hidden text-ellipsis whitespace-nowrap">
          {q.name}
        </span>
        <span
          className={clsx(
            'text-[11px] flex gap-1.5 items-center flex-wrap',
            severity === 'crit' ? 'text-red-600 dark:text-red-400' : 'text-base-content/60',
          )}
        >
          <ConsumerDots consumers={q.consumers} />
          {why}
          {q.isOrdered && <Tag tone="amber">{t('tags.ordered')}</Tag>}
        </span>
      </span>
      <span className="max-[619px]:[grid-area:k]">
        <Sparkline samples={q.samples} severity={severity} />
      </span>
      <span className="min-w-0 flex flex-col gap-1 max-[619px]:[grid-area:b]">
        <span className="h-[6px] rounded-full bg-base-content/10 overflow-hidden flex">
          <span
            className={clsx('h-full', severity === 'crit' ? 'bg-red-500' : 'bg-primary')}
            style={{ width: `${(readyBar / maxDepth) * 100}%` }}
          />
          <span
            className="h-full bg-sky-400"
            style={{ width: `${(unackedBar / maxDepth) * 100}%` }}
          />
        </span>
        <span className="text-[11px] text-base-content/70 tabular-nums flex justify-between gap-1.5">
          <span>{ready === undefined ? '—' : t('queueHealth.readyCount', { count: ready })}</span>
          <span>
            {unacked === undefined ? '—' : t('queueHealth.unackedCount', { count: unacked })}
          </span>
        </span>
      </span>
      <span
        className={clsx(
          'justify-self-end font-mono text-[11px] font-semibold rounded-md px-2 py-1 whitespace-nowrap max-[619px]:[grid-area:e]',
          q.errorCount > 0
            ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300'
            : q.skippedCount > 0
              ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300'
              : 'bg-transparent text-base-content/40 font-normal',
        )}
      >
        {q.errorCount > 0
          ? t('queueHealth.errorBadge', { count: q.errorCount })
          : q.skippedCount > 0
            ? t('queueHealth.skippedBadge', { count: q.skippedCount })
            : '—'}
      </span>
    </>
  );

  const rowClass = clsx(
    'w-full text-left grid gap-[12px] items-center py-[10px] pr-[14px] border-t border-base-300 first:border-t-0',
    'grid-cols-[3px_minmax(0,1fr)_auto] max-[619px]:[grid-template-areas:"s_n_e"_"s_k_k"_"s_b_b"] max-[619px]:gap-y-2',
    'min-[620px]:grid-cols-[3px_minmax(0,1.5fr)_124px_minmax(96px,1fr)_78px]',
  );

  if (!clickable) {
    return <div className={rowClass}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={clsx(rowClass, 'hover:bg-base-200 transition-colors')}
      title={t('queueHealth.filterHint')}
      onClick={() => onSelect({ queue: q.name, node })}
    >
      {content}
    </button>
  );
};

interface NodeCardProps {
  node: NodeHealth;
  now: Date | null;
  attentionOnly: boolean;
  maxDepth: number;
  onSelect: (target: { queue: string; node: string }) => void;
}

const NodeCard = ({ node, now, attentionOnly, maxDepth, onSelect }: NodeCardProps) => {
  const { t, i18n } = useTranslation('failedMessages');
  const stale = isStale(node.collectedAt, now);
  // A node with a Pending FailedMessage but no BrokerSnapshot row yet — `collectedAt` and
  // `managementStatus` are both omitted together in that case (see NodeHealth in types/index.ts).
  const hasSnapshot = node.collectedAt !== undefined;

  const sorted = sortQueuesBySeverity(node.queues).map(q => ({ q, severity: queueSeverity(q) }));
  const shown = attentionOnly ? sorted.filter(x => x.severity !== 'ok') : sorted;

  const sumPublish = node.queues.reduce((sum, q) => sum + (q.publishRate ?? 0), 0);
  const sumDeliver = node.queues.reduce((sum, q) => sum + (q.deliverRate ?? 0), 0);
  const sumReady = node.queues.reduce((sum, q) => sum + (q.ready ?? 0), 0);
  const attnCount = sorted.filter(x => x.severity !== 'ok').length;
  const anyCrit = sorted.some(x => x.severity === 'crit');

  return (
    <article
      className={clsx(
        'bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-sm',
        stale && 'opacity-70 saturate-50',
      )}
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5">
        <span className="font-mono text-[15px] font-semibold tracking-wide">{node.node}</span>
        <span className="text-[12px] text-base-content/60">
          {t('queueHealth.queueCount', { count: node.queues.length })}
        </span>
        <span
          className={clsx(
            'ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2 py-0.5',
            !hasSnapshot
              ? 'bg-base-300 text-base-content/60'
              : stale
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                : 'bg-primary/10 text-primary',
          )}
        >
          {hasSnapshot && !stale && (
            <span className="size-[6px] rounded-full bg-current motion-safe:animate-pulse" />
          )}
          {hasSnapshot
            ? t('queueHealth.dataAsOf', {
                time: formatClockOrDateTime(node.collectedAt, i18n.language, now),
              })
            : t('queueHealth.noSnapshotBadge')}
        </span>
      </div>

      {node.lastError && node.managementStatus === 'Ok' && (
        <div className="px-3.5 pb-2 text-[11px] font-mono text-amber-600 dark:text-amber-400 break-all">
          {node.lastError}
        </div>
      )}

      {!hasSnapshot ? (
        <div className="mx-3.5 mb-3 rounded-xl border border-base-300 bg-base-200 px-3 py-2.5 text-[13px] text-base-content/60">
          {t('queueHealth.noSnapshot')}
        </div>
      ) : node.managementStatus !== 'Ok' ? (
        <div className="mx-3.5 mb-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-3 py-2.5 text-[13px] text-amber-800 dark:text-amber-200 flex flex-col gap-1">
          <span>
            {node.managementStatus === 'Unauthorized'
              ? t('queueHealth.managementUnauthorized')
              : t('queueHealth.managementUnreachable')}
          </span>
          {node.lastError && (
            <span className="font-mono text-[11px] break-all">{node.lastError}</span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-4 max-[460px]:grid-cols-2 border-y border-base-300 bg-base-200 divide-x divide-base-300 max-[460px]:divide-x-0">
          <div className="px-3.5 py-2">
            <b className="block text-[20px] font-semibold tabular-nums leading-tight">
              {fmtRate(sumPublish)}
            </b>
            <span className="text-[11px] text-base-content/60">{t('queueHealth.statIn')}</span>
          </div>
          <div className="px-3.5 py-2">
            <b
              className={clsx(
                'block text-[20px] font-semibold tabular-nums leading-tight',
                sumDeliver < sumPublish - 1 && 'text-amber-600 dark:text-amber-400',
              )}
            >
              {fmtRate(sumDeliver)}
            </b>
            <span className="text-[11px] text-base-content/60">{t('queueHealth.statOut')}</span>
          </div>
          <div className="px-3.5 py-2 max-[460px]:border-t max-[460px]:border-base-300">
            <b
              className={clsx(
                'block text-[20px] font-semibold tabular-nums leading-tight',
                anyCrit && 'text-red-600 dark:text-red-400',
              )}
            >
              {sumReady.toLocaleString()}
            </b>
            <span className="text-[11px] text-base-content/60">{t('queueHealth.statReady')}</span>
          </div>
          <div className="px-3.5 py-2 max-[460px]:border-t max-[460px]:border-base-300">
            <b
              className={clsx(
                'block text-[20px] font-semibold tabular-nums leading-tight',
                attnCount > 0 && 'text-amber-600 dark:text-amber-400',
              )}
            >
              {attnCount}
            </b>
            <span className="text-[11px] text-base-content/60">
              {t('queueHealth.statAttention')}
            </span>
          </div>
        </div>
      )}

      <div>
        {shown.length === 0 ? (
          <div className="py-6 px-3.5 text-center text-[13px] text-base-content/60">
            {now && !stale && node.managementStatus === 'Ok'
              ? t('queueHealth.allOk')
              : t('queueHealth.noBrokerData')}
          </div>
        ) : (
          shown.map(({ q, severity }) => (
            <QueueRow
              key={q.name}
              queue={q}
              node={node.node}
              severity={severity}
              maxDepth={maxDepth}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </article>
  );
};

const QueueHealthPanel = ({
  nodes,
  isLoading,
  isError,
  onRetry,
  now,
  onQueueSelect,
}: QueueHealthPanelProps) => {
  const { t } = useTranslation('failedMessages');
  const [attentionOnly, setAttentionOnly] = useState(true);

  const maxDepth = useMemo(() => {
    const all = nodes.flatMap(n => n.queues.map(q => (q.ready ?? 0) + (q.unacked ?? 0)));
    return Math.max(20, ...all);
  }, [nodes]);

  return (
    <section
      className="bg-base-200 border border-base-300 rounded-[20px] p-[18px] flex flex-col gap-3.5"
      aria-label={t('queueHealth.title')}
    >
      <div className="flex flex-wrap gap-x-4 gap-y-2.5 items-center">
        <h2 className="text-[15px] font-semibold m-0">{t('queueHealth.title')}</h2>
        <span className="text-[12px] text-base-content/60">{t('queueHealth.refreshInterval')}</span>
        <span className="text-[12px] text-base-content/60">{t('queueHealth.sourceNote')}</span>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-3 text-[12px] text-base-content/70">
            <span className="flex items-center gap-1.5">
              <i className="inline-block size-2.5 rounded-[3px] bg-primary" />
              {t('queueHealth.legendReady')}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block size-2.5 rounded-[3px] bg-sky-400" />
              {t('queueHealth.legendUnacked')}
            </span>
          </span>
          <div
            className="inline-flex bg-base-300 rounded-[10px] p-0.5"
            role="group"
            aria-label={t('queueHealth.filterGroupLabel')}
          >
            <button
              type="button"
              aria-pressed={attentionOnly}
              onClick={() => setAttentionOnly(true)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-[12px]',
                attentionOnly ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/60',
              )}
            >
              {t('queueHealth.toggleAttention')}
            </button>
            <button
              type="button"
              aria-pressed={!attentionOnly}
              onClick={() => setAttentionOnly(false)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-[12px]',
                !attentionOnly ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/60',
              )}
            >
              {t('queueHealth.toggleAll')}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 min-[980px]:grid-cols-2 gap-3.5">
          {[0, 1].map(i => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-base-300 bg-base-100 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <DataErrorState variant="inline" onRetry={onRetry} />
      ) : nodes.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-base-content/60">
          {t('queueHealth.noNodes')}
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[980px]:grid-cols-2 gap-3.5">
          {nodes.map(node => (
            <NodeCard
              key={node.node}
              node={node}
              now={now}
              attentionOnly={attentionOnly}
              maxDepth={maxDepth}
              onSelect={onQueueSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default QueueHealthPanel;
