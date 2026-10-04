import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import toast from 'react-hot-toast';
import SlideOverPanel from '@shared/components/SlideOverPanel';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import DataErrorState from '@shared/components/DataErrorState';
import { isGoneOrForbidden } from '../api/detailPolling';
import { useGetFailedMessage } from '../api/failedMessages';
import type { FailedMessageDetail } from '../types';
import {
  canDiscard,
  canRetry,
  displayQueueName,
  formatClockCeilMinute,
  formatClockOrDateTime,
  formatDateTime,
  refHref,
  shortMessageType,
} from '../utils/queueHealth';
import { consumerStatusTone, refText, refTypeLabel, retryAvailableAtLabel } from '../utils/labels';
import type { Tone } from '../utils/labels';
import {
  Callout,
  CodeBlock,
  HeadersTable,
  KeyValueList,
  RefCell,
  SectionTitle,
  StatusPill,
  Tag,
  Timeline,
} from './ui';
import type { TimelineItem } from './ui';
import type { RetryableItem } from './ConfirmActionDialog';

interface FailedMessageDrawerProps {
  id: string | null;
  onClose: () => void;
  canManage: boolean;
  onRequestRetry: (item: RetryableItem) => void;
  onRequestDiscard: (item: RetryableItem) => void;
  onOpenSibling: (id: string) => void;
  // The server's own clock (see serverClock in utils/queueHealth.ts) — null until the summary that
  // carries it has loaded, in which case retry stays disabled for any row with a retryAvailableAt.
  now: Date | null;
}

const FailedMessageDrawer = ({
  id,
  onClose,
  canManage,
  onRequestRetry,
  onRequestDiscard,
  onOpenSibling,
  now,
}: FailedMessageDrawerProps) => {
  const { t, i18n } = useTranslation('failedMessages');
  const open = !!id;

  // Hold the last opened id through the close animation so the panel keeps showing that message
  // (rather than flashing to the loading/error state) while SlideOverPanel animates out.
  const [shownId, setShownId] = useState(id);
  if (id && id !== shownId) setShownId(id);

  // Polls while RetryRequested (still being republished) or a retryAvailableAt wait window is in
  // effect (see useGetFailedMessage's refetchInterval) — no client-side timer needed here.
  const { data, isLoading, isError, error, refetch } = useGetFailedMessage(shownId, { open });

  // The poll got a 404/403 (row purged, or permission revoked) — `data` is stale, so no action on it.
  const gone = isGoneOrForbidden(error);
  const retryable = data ? canRetry(data, now) && !gone : false;

  const footer = data ? (
    canManage && data.status === 'Pending' ? (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onRequestDiscard(data)}
          disabled={gone}
          className="rounded-lg border border-red-300 text-red-600 text-[13px] font-medium px-4 py-2 hover:bg-red-50 disabled:opacity-50"
        >
          {t('drawer.discard')}
        </button>
        <button
          type="button"
          onClick={() => onRequestRetry(data)}
          disabled={!retryable}
          title={
            !retryable && !gone && data.retryAvailableAt
              ? retryAvailableAtLabel(t, data.retryAvailableAt)
              : undefined
          }
          className="rounded-lg bg-primary text-primary-content text-[13px] font-medium px-4 py-2 disabled:opacity-50"
        >
          {t('drawer.retry')}
        </button>
      </div>
    ) : canManage && canDiscard(data) ? (
      // RetryRequested: already sending back, so only discard (not retry) makes sense here.
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => onRequestDiscard(data)}
          disabled={gone}
          className="rounded-lg border border-red-300 text-red-600 text-[13px] font-medium px-4 py-2 hover:bg-red-50 disabled:opacity-50"
        >
          {t('drawer.discard')}
        </button>
        <p className="text-[12px] text-gray-400">{t('drawer.discardStuckHint')}</p>
      </div>
    ) : canDiscard(data) ? (
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
      isOpen={!!id}
      onClose={onClose}
      title={data ? displayQueueName(data.sourceQueue, data.kind) : t('drawer.title')}
      subtitle={data ? shortMessageType(data.messageType) : undefined}
      width="xl"
      footer={footer}
    >
      {!shownId ? null : isLoading ? (
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
          <FailedMessageDrawerBody
            key={data.id}
            data={data}
            onOpenSibling={onOpenSibling}
            language={i18n.language}
            now={now}
          />
        </>
      ) : null}
    </SlideOverPanel>
  );
};

interface BodyProps {
  data: FailedMessageDetail;
  onOpenSibling: (id: string) => void;
  language: string | undefined;
  now: Date | null;
}

const historyLine = (
  t: TFunction<'failedMessages'>,
  action: string,
  actorCode?: string,
): string => {
  // `RetryFailed` is server-generated (the broker or the publish itself failed) — there's no human
  // actor to attribute it to, so it never interpolates one. The specific cause is the entry's
  // `reason`, which the timeline renders after this headline.
  if (action === 'RetryFailed') return t('history.retryFailed');
  const actor = actorCode ?? t('history.system');
  switch (action) {
    case 'Retry':
      return t('history.retry', { actor });
    case 'Discard':
      return t('history.discard', { actor });
    case 'OutboxResend':
      return t('history.outboxResend', { actor });
    default:
      return t('history.unknown', { actor, action });
  }
};

const FailedMessageDrawerBody = ({ data, onOpenSibling, language, now }: BodyProps) => {
  const { t } = useTranslation('failedMessages');

  const pending = data.status === 'Pending';
  const href = refHref(data.refType, data.refId);
  const refLabel = refTypeLabel(t, data.refType);
  const ref = refText(t, data);

  const handleCopyMessageId = () => {
    if (!data.messageId) return;
    if (!navigator.clipboard) {
      toast.error(t('drawer.copyFailed'));
      return;
    }
    void navigator.clipboard
      .writeText(data.messageId)
      .then(() => toast.success(t('drawer.copied')))
      .catch(() => toast.error(t('drawer.copyFailed')));
  };

  const statusTone: Tone = consumerStatusTone(data.status);

  const overviewItems: { label: string; value: ReactNode }[] = [
    {
      label: t('drawer.reference'),
      value: <RefCell label={refLabel} number={data.refNumber} refId={data.refId} href={href} />,
    },
    {
      label: t('drawer.messageType'),
      value: <span className="font-mono break-words">{data.messageType ?? '—'}</span>,
    },
    {
      label: t('drawer.consumer'),
      value: <span className="font-mono">{data.consumerType ?? '—'}</span>,
    },
    {
      label: t('drawer.retryDestination'),
      value: (
        <span className="font-mono">
          {data.sourceQueue} @ {data.node}
        </span>
      ),
    },
    {
      label: t('drawer.messageId'),
      value: data.messageId ? (
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{data.messageId}</span>
          <button
            type="button"
            onClick={handleCopyMessageId}
            className="text-primary text-[12px] hover:underline"
          >
            {t('drawer.copy')}
          </button>
        </span>
      ) : (
        '—'
      ),
    },
    {
      label: t('drawer.conversationId'),
      value: data.conversationId ? <span className="font-mono">{data.conversationId}</span> : '—',
    },
    { label: t('drawer.contentType'), value: data.contentType ?? '—' },
    { label: t('drawer.faultedAt'), value: formatDateTime(data.faultedAt, language) },
    { label: t('drawer.collectedAt'), value: formatDateTime(data.collectedAt, language) },
    {
      label: t('drawer.autoRetry'),
      value:
        data.kind === 'Skipped'
          ? t('drawer.autoRetryNoConsumer')
          : data.isNonTransient
            ? t('drawer.autoRetrySkippedByPolicy')
            : t('drawer.autoRetryCount', { count: data.retryCount }),
    },
  ];
  if (data.actionBy && data.actionAt) {
    overviewItems.push({
      label: t('drawer.actionBy'),
      value: `${data.actionBy} · ${formatDateTime(data.actionAt, language)}`,
    });
  }
  if (data.actionReason) {
    overviewItems.push({ label: t('drawer.actionReason'), value: data.actionReason });
  }

  const timelineItems: TimelineItem[] = [
    {
      tone: 'red',
      content: (
        <>
          {t('drawer.timelineFaulted', {
            queue: displayQueueName(data.sourceQueue, data.kind),
            node: data.node,
          })}
          {data.kind === 'Error' &&
            ` · ${t('drawer.timelineFaultedRetrySuffix', { count: data.retryCount })}`}
        </>
      ),
      time: formatDateTime(data.faultedAt, language),
    },
    ...data.history.map(h => ({
      tone: (h.action === 'Retry' || h.action === 'OutboxResend'
        ? 'emerald'
        : h.action === 'RetryFailed'
          ? 'red'
          : 'gray') as Tone,
      content: (
        <>
          {historyLine(t, h.action, h.actorCode)}
          {h.reason && <> · {t('drawer.timelineReason', { reason: h.reason })}</>}
        </>
      ),
      time: formatDateTime(h.at, language),
    })),
  ];
  if (data.status === 'RetryRequested') {
    timelineItems.push({ tone: 'sky', content: t('drawer.timelineWaiting', { node: data.node }) });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={statusTone} blink={data.status === 'RetryRequested'}>
          {data.status === 'RetryRequested'
            ? t('status.retryRequestedAt', { node: data.node })
            : t(`status.${data.status}`)}
        </StatusPill>
        {data.isOrderedQueue && <Tag tone="amber">{t('tags.ordered')}</Tag>}
        {data.isNonTransient && <Tag tone="red">{t('tags.nonTransient')}</Tag>}
        {data.kind === 'Skipped' && <Tag tone="sky">{t('tags.noConsumer')}</Tag>}
      </div>

      {pending && data.isOrderedQueue && (
        <Callout tone="amber" title={t('drawer.orderedCalloutTitle')}>
          {t('drawer.orderedCalloutBody', {
            time: formatClockOrDateTime(data.faultedAt, language, now, 'HH:mm'),
            ref,
          })}
        </Callout>
      )}
      {pending && data.isNonTransient && (
        <Callout tone="red" title={t('drawer.nonTransientCalloutTitle')}>
          {t('drawer.nonTransientCalloutBody', {
            exceptionType: data.exceptionType,
            ref,
          })}
        </Callout>
      )}
      {pending && data.kind === 'Skipped' && (
        <Callout tone="sky" title={t('drawer.skippedCalloutTitle')}>
          {t('drawer.skippedCalloutBody')}
        </Callout>
      )}
      {pending && data.retryAvailableAt && (
        <Callout
          tone="sky"
          title={t('drawer.retryAvailableAtTitle', {
            time: formatClockCeilMinute(data.retryAvailableAt),
          })}
        >
          {t('drawer.retryAvailableAtBody')}
        </Callout>
      )}

      <section>
        <SectionTitle>{t('drawer.overview')}</SectionTitle>
        <KeyValueList items={overviewItems} />
      </section>

      <section>
        <SectionTitle>{t('drawer.siblings')}</SectionTitle>
        {data.siblings.length === 0 ? (
          <span className="text-[13px] text-gray-400">{t('drawer.noSiblings')}</span>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-[13px]">
                <tbody>
                  {data.siblings.map(sibling => (
                    <tr
                      key={sibling.id}
                      tabIndex={0}
                      onClick={() => onOpenSibling(sibling.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.target === e.currentTarget) {
                          onOpenSibling(sibling.id);
                        }
                      }}
                      className="cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <td className="px-2.5 py-1.5 font-mono">
                        {displayQueueName(sibling.sourceQueue, sibling.kind)}
                      </td>
                      <td className="px-2.5 py-1.5">
                        <StatusPill tone={consumerStatusTone(sibling.status)}>
                          {t(`status.${sibling.status}`)}
                        </StatusPill>
                      </td>
                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        {formatDateTime(sibling.faultedAt, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-gray-400 mt-1.5">{t('drawer.siblingsNote')}</p>
          </>
        )}
      </section>

      {data.kind !== 'Skipped' && (
        <section>
          <SectionTitle>{t('drawer.exception')}</SectionTitle>
          <Callout tone="red" title={data.exceptionType}>
            {data.exceptionMessage}
          </Callout>
          {data.stackTrace && (
            <details className="mt-2">
              <summary className="text-[12px] text-gray-400 cursor-pointer">
                {t('drawer.stackTrace')}
              </summary>
              <CodeBlock className="mt-1.5">{data.stackTrace}</CodeBlock>
            </details>
          )}
        </section>
      )}

      <section>
        <SectionTitle>{t('drawer.body')}</SectionTitle>
        <CodeBlock wrap>{data.body}</CodeBlock>
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

export default FailedMessageDrawer;
