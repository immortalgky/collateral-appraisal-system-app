import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SlideOverPanel from '@shared/components/SlideOverPanel';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import DataErrorState from '@shared/components/DataErrorState';
import { isGoneOrForbidden } from '../api/detailPolling';
import { useGetOutboxMessage } from '../api/outboxMessages';
import type { OutboxDetail, OutboxListItem, OutboxModule } from '../types';
import {
  classifyOutboxFailure,
  elapsedParts,
  formatDateTime,
  isOutboxSelectable,
  isStuck,
  outboxKey,
  outboxTableName,
  refHref,
  shortEventType,
} from '../utils/queueHealth';
import {
  moduleLabel,
  outboxStatusLabelKey,
  outboxStatusTone,
  refText,
  refTypeLabel,
} from '../utils/labels';
import type { Tone } from '../utils/labels';
import {
  Callout,
  CodeBlock,
  HeadersTable,
  KeyValueList,
  RefCell,
  SectionTitle,
  StatusPill,
  Timeline,
} from './ui';
import type { TimelineItem } from './ui';

interface OutboxMessageDrawerProps {
  target: { module: OutboxModule; id: string } | null;
  onClose: () => void;
  canManage: boolean;
  onRequestResend: (item: OutboxListItem) => void;
  // The server's own clock (see serverClock in utils/queueHealth.ts) — null until the summary that
  // carries it has loaded, in which case no "stuck for" elapsed time is shown yet.
  now: Date | null;
  // The active outbox status tab is 'Stuck' — the server already says any Processing row here is
  // stuck, so the drawer agrees with the table row while `now` is unknown (then `now` decides).
  stuckTab?: boolean;
}

type Target = { module: OutboxModule; id: string };

const sameTarget = (a: Target | null, b: Target | null) =>
  a?.module === b?.module && a?.id === b?.id;

const OutboxMessageDrawer = ({
  target,
  onClose,
  canManage,
  onRequestResend,
  now,
  stuckTab,
}: OutboxMessageDrawerProps) => {
  const { t, i18n } = useTranslation('failedMessages');
  const open = !!target;

  // Hold the last opened target through the close animation so the panel keeps showing that
  // message (rather than flashing to the loading/error state) while SlideOverPanel animates out.
  const [shownTarget, setShownTarget] = useState<Target | null>(target);
  if (target && !sameTarget(target, shownTarget)) setShownTarget(target);

  const { data, isLoading, isError, error, refetch } = useGetOutboxMessage(
    shownTarget?.module ?? null,
    shownTarget?.id ?? null,
    { open },
  );

  // The poll got a 404/403 (row purged, or permission revoked) — `data` is stale, so no action on it.
  const gone = isGoneOrForbidden(error);
  const canResend = !!data && isOutboxSelectable(data);
  const footer = data ? (
    canResend && canManage ? (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onRequestResend(data)}
          disabled={gone}
          className="rounded-lg bg-primary text-primary-content text-[13px] font-medium px-4 py-2 disabled:opacity-50"
        >
          {t('outboxDrawer.resend')}
        </button>
      </div>
    ) : canResend ? (
      <div className="flex justify-end">
        <span className="text-[13px] text-gray-500">{t('drawer.viewOnly')}</span>
      </div>
    ) : (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 text-[13px] font-medium px-4 py-2"
        >
          {t('drawer.close')}
        </button>
      </div>
    )
  ) : undefined;

  return (
    <SlideOverPanel
      isOpen={!!target}
      onClose={onClose}
      title={data ? shortEventType(data.eventType) : t('outboxDrawer.title')}
      subtitle={
        data ? `${moduleLabel(t, data.module)} · ${outboxTableName(data.module)}` : undefined
      }
      width="xl"
      footer={footer}
    >
      {!shownTarget ? null : isLoading ? (
        <table className="w-full">
          <tbody>
            <TableRowSkeleton columns={[{ width: 'w-full' }]} rows={6} />
          </tbody>
        </table>
      ) : isError && !data ? (
        // A 404/403 on the very first fetch never recovers on retry — say so instead of offering it.
        gone ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            {t('drawer.goneOrForbidden')}
          </div>
        ) : (
          <DataErrorState variant="inline" onRetry={refetch} />
        )
      ) : data ? (
        <>
          {isError && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
              {gone ? t('drawer.goneOrForbidden') : t('drawer.refreshFailed')}
            </div>
          )}
          <OutboxMessageDrawerBody
            key={outboxKey(data)}
            data={data}
            now={now}
            stuckTab={stuckTab}
            language={i18n.language}
          />
        </>
      ) : null}
    </SlideOverPanel>
  );
};

const OutboxMessageDrawerBody = ({
  data,
  now,
  stuckTab,
  language,
}: {
  data: OutboxDetail;
  now: Date | null;
  stuckTab?: boolean;
  language: string | undefined;
}) => {
  const { t } = useTranslation('failedMessages');

  const href = refHref(data.refType, data.refId);
  const refLabel = refTypeLabel(t, data.refType);
  const ref = refText(t, data);

  // Only a guess while the clock is unknown; once known, a row that was claimed again is judged by it.
  const assumeStuck = !!stuckTab && data.status === 'Processing' && now === null;
  const statusTone: Tone = outboxStatusTone(data, now, assumeStuck);
  const statusLabelKey = outboxStatusLabelKey(data, now, assumeStuck);
  const failureClass = classifyOutboxFailure(data);

  const stuck = assumeStuck || isStuck(data, now);
  // The duration needs the clock — hidden while `now` is unknown.
  const stuckParts =
    stuck && now ? elapsedParts(data.processingStartedAt ?? data.occurredAt, now) : null;

  const overviewItems = [
    {
      label: t('drawer.reference'),
      value: <RefCell label={refLabel} number={data.refNumber} refId={data.refId} href={href} />,
    },
    {
      label: t('outboxDrawer.table'),
      value: <span className="font-mono">{outboxTableName(data.module)}</span>,
    },
    {
      label: t('outboxDrawer.eventType'),
      value: <span className="font-mono break-words">{data.eventType}</span>,
    },
    {
      label: t('outboxDrawer.correlationId'),
      value: data.correlationId ? <span className="font-mono">{data.correlationId}</span> : '—',
    },
    { label: t('outboxDrawer.occurredAt'), value: formatDateTime(data.occurredAt, language) },
    {
      label: t('outboxDrawer.processingStartedAt'),
      value: formatDateTime(data.processingStartedAt, language),
    },
    { label: t('outboxDrawer.processedAt'), value: formatDateTime(data.processedAt, language) },
    {
      label: t('table.retry'),
      value: data.status === 'Processing' ? '—' : String(data.retryCount),
    },
  ];

  const timelineItems: TimelineItem[] = [
    {
      tone: 'gray',
      content: t('outboxDrawer.timelineOccurred'),
      time: formatDateTime(data.occurredAt, language),
    },
  ];
  if (data.processingStartedAt) {
    timelineItems.push({
      tone: 'amber',
      content: t('outboxDrawer.timelineProcessing'),
      time: formatDateTime(data.processingStartedAt, language),
    });
  }
  if (data.status === 'Failed') {
    timelineItems.push({
      tone: 'red',
      content: t('outboxDrawer.timelineFailed', { count: data.retryCount }),
    });
  }
  if (data.status === 'Processed') {
    timelineItems.push({
      tone: 'emerald',
      content: t('outboxDrawer.timelineProcessed'),
      time: formatDateTime(data.processedAt, language),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <StatusPill tone={statusTone} blink={data.status === 'Pending'}>
        {t(statusLabelKey)}
      </StatusPill>

      {isOutboxSelectable(data) && data.newerSentCount === 0 && (
        <Callout tone="sky" title={t('outboxDrawer.noConsumerCalloutTitle')}>
          {t('outboxDrawer.noConsumerCalloutBody', { module: moduleLabel(t, data.module) })}
        </Callout>
      )}
      {data.status === 'Failed' && data.newerSentCount == null && (
        <Callout tone="amber" title={t('outboxDrawer.newerSentUnknownCalloutTitle')}>
          {t('outboxDrawer.newerSentUnknownCalloutBody', { ref })}
        </Callout>
      )}
      {data.status === 'Failed' && data.newerSentCount != null && data.newerSentCount > 0 && (
        <Callout
          tone="amber"
          title={t('outboxDrawer.newerSentCalloutTitle', { count: data.newerSentCount })}
        >
          {t('outboxDrawer.newerSentCalloutBody', { ref })}
        </Callout>
      )}
      {failureClass === 'blocked' && (
        <Callout tone="red" title={t('tags.resendWontHelp')}>
          {t('outboxDrawer.deterministicBody')}
        </Callout>
      )}
      {failureClass === 'typeNowResolves' && (
        <Callout tone="sky" title={t('outboxDrawer.typeNowResolvesTitle')}>
          {t('outboxDrawer.typeNowResolvesBody')}
        </Callout>
      )}
      {failureClass === 'payloadWarning' && (
        <Callout tone="amber" title={t('outboxDrawer.payloadWarningTitle')}>
          {t('outboxDrawer.payloadWarningBody')}
        </Callout>
      )}
      {stuck && (
        <Callout
          tone="amber"
          title={
            stuckParts
              ? t('outboxDrawer.stuckCalloutTitle', {
                  hours: stuckParts.hours,
                  minutes: stuckParts.minutes,
                })
              : t('outboxStatus.Stuck')
          }
        >
          {t('outboxDrawer.stuckCalloutBody')}
        </Callout>
      )}

      <section>
        <SectionTitle>{t('drawer.overview')}</SectionTitle>
        <KeyValueList items={overviewItems} />
      </section>

      {data.error && (
        <section>
          <SectionTitle>{t('table.latestError')}</SectionTitle>
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
            <span className="font-mono break-all">{data.error}</span>
          </div>
        </section>
      )}

      <section>
        <SectionTitle>{t('outboxDrawer.payload')}</SectionTitle>
        <CodeBlock wrap>{data.payload}</CodeBlock>
      </section>

      {data.headers && Object.keys(data.headers).length > 0 && (
        <section>
          <SectionTitle>{t('drawer.headers')}</SectionTitle>
          <HeadersTable headers={data.headers} />
        </section>
      )}

      <section>
        <SectionTitle>{t('drawer.history')}</SectionTitle>
        <Timeline items={timelineItems} />
      </section>
    </div>
  );
};

export default OutboxMessageDrawer;
