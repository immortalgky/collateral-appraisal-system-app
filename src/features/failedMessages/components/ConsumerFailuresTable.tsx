import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import DataErrorState from '@shared/components/DataErrorState';
import type { FailedMessageListItem } from '../types';
import {
  canDiscard,
  displayQueueName,
  formatDateTime,
  refHref,
  shortMessageType,
} from '../utils/queueHealth';
import type { CollectorState } from '../utils/queueHealth';
import {
  consumerStatusTone,
  exceptionTypeLabel,
  refTypeLabel,
  retryAvailableAtLabel,
} from '../utils/labels';
import { RefCell, StatusPill, Tag, Th } from './ui';

interface ConsumerFailuresTableProps {
  items: FailedMessageListItem[];
  isLoading: boolean;
  // The query's total row count — an empty `items` with count > 0 is a page past the end (the page is
  // clamping back), which must never read as an empty/all-clear state.
  totalCount: number;
  isError: boolean;
  onRetry: () => void;
  canManage: boolean;
  selection: Map<string, FailedMessageListItem>;
  onToggleRow: (item: FailedMessageListItem) => void;
  onToggleAll: (selectable: FailedMessageListItem[]) => void;
  onOpen: (id: string) => void;
  isDefaultUnfiltered: boolean;
  // True while the rows shown are the previous query's placeholder data — they must not be selectable.
  selectionDisabled?: boolean;
  // Drives the default-tab, no-filter empty state — an empty list must not claim "running normally"
  // while a collector is stale or its Management API is down (see deriveCollectorState).
  collectorState: CollectorState;
}

const ConsumerFailuresTable = ({
  items,
  isLoading,
  totalCount,
  isError,
  onRetry,
  canManage,
  selection,
  onToggleRow,
  onToggleAll,
  onOpen,
  isDefaultUnfiltered,
  selectionDisabled,
  collectorState,
}: ConsumerFailuresTableProps) => {
  const { t, i18n } = useTranslation('failedMessages');

  // Checkbox eligibility follows canDiscard (Pending + RetryRequested) — the retry confirm dialog
  // groups the resulting selection into sendable / waiting / too-soon on its own (groupRetrySelection).
  const selectable = items.filter(canDiscard);
  const allSelected = selectable.length > 0 && selectable.every(i => selection.has(i.id));
  // 7 data columns, plus the checkbox column only when the viewer can act on rows.
  const columnCount = canManage ? 8 : 7;
  const isCollectorWarning = collectorState.kind === 'stale' || collectorState.kind === 'mgmtDown';

  return (
    <table className="w-full text-[13px] border-collapse">
      <thead>
        <tr className="bg-base-200 border-b border-base-300">
          {canManage && (
            <Th className="w-9">
              <input
                type="checkbox"
                aria-label={t('table.selectAll')}
                checked={allSelected}
                disabled={selectionDisabled || selectable.length === 0}
                onChange={() => onToggleAll(selectable)}
              />
            </Th>
          )}
          <Th>{t('table.faultedAt')}</Th>
          <Th>{t('table.queueMessageType')}</Th>
          <Th>{t('table.reference')}</Th>
          <Th>{t('table.exception')}</Th>
          <Th>{t('table.retry')}</Th>
          <Th>{t('table.node')}</Th>
          <Th>{t('table.status')}</Th>
        </tr>
      </thead>
      <tbody>
        {isLoading || (items.length === 0 && totalCount > 0) ? (
          <TableRowSkeleton
            rows={5}
            columns={Array.from({ length: columnCount }, () => ({ width: 'w-full' }))}
          />
        ) : isError ? (
          <tr>
            <td colSpan={columnCount} className="py-4">
              <DataErrorState variant="inline" title={t('table.loadFailed')} onRetry={onRetry} />
            </td>
          </tr>
        ) : items.length === 0 ? (
          <tr>
            <td colSpan={columnCount} className="py-12 bg-base-100">
              {isDefaultUnfiltered && isCollectorWarning ? (
                <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-[15px] font-semibold text-amber-800 dark:text-amber-200">
                    {t('empty.warningTitle')}
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    {collectorState.kind === 'stale'
                      ? t('empty.staleBody', {
                          nodes: collectorState.nodes.join(', '),
                          time: formatDateTime(collectorState.since, i18n.language),
                        })
                      : t('empty.mgmtDownBody', { nodes: collectorState.nodes.join(', ') })}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-[15px] font-semibold">
                    {!isDefaultUnfiltered
                      ? t('table.filteredEmptyTitle')
                      : collectorState.kind === 'unknown'
                        ? t('empty.unknownTitle')
                        : t('table.consumerEmptyTitle')}
                  </p>
                  <p className="text-base-content/60 mt-1">
                    {isDefaultUnfiltered
                      ? collectorState.kind === 'unknown'
                        ? t('empty.unknownDesc')
                        : t('table.consumerEmptyDesc')
                      : t('table.filteredEmptyDesc')}
                  </p>
                </div>
              )}
            </td>
          </tr>
        ) : (
          items.map(item => {
            const checked = selection.has(item.id);
            const selectableRow = canDiscard(item);
            const href = refHref(item.refType, item.refId);
            return (
              <tr
                key={item.id}
                tabIndex={0}
                onClick={() => onOpen(item.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(item.id);
                }}
                className={clsx(
                  'border-b border-base-200 last:border-b-0 cursor-pointer hover:bg-base-200/60 transition-colors align-top',
                  checked && 'bg-primary/10 shadow-[inset_3px_0_0_var(--color-primary)]',
                )}
              >
                {canManage && (
                  <td
                    className="px-[10px] py-[10px]"
                    onClick={selectableRow ? e => e.stopPropagation() : undefined}
                  >
                    {selectableRow && (
                      <input
                        type="checkbox"
                        aria-label={t('table.selectRow', { type: item.messageType ?? item.id })}
                        checked={checked}
                        disabled={selectionDisabled}
                        onChange={() => onToggleRow(item)}
                      />
                    )}
                  </td>
                )}
                <td className="px-[10px] py-[10px] whitespace-nowrap tabular-nums">
                  {formatDateTime(item.faultedAt, i18n.language)}
                </td>
                <td className="px-[10px] py-[10px]">
                  <div className="font-mono text-[12px] break-words">
                    {displayQueueName(item.sourceQueue, item.kind)}
                  </div>
                  <div
                    className="text-[12px] text-base-content/60 break-words"
                    title={item.messageType}
                  >
                    {item.messageType ? shortMessageType(item.messageType) : '—'}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.isOrderedQueue && <Tag tone="amber">{t('tags.ordered')}</Tag>}
                    {item.isNonTransient && <Tag tone="red">{t('tags.nonTransient')}</Tag>}
                    {item.kind === 'Skipped' && <Tag tone="sky">{t('tags.noConsumer')}</Tag>}
                  </div>
                </td>
                <td className="px-[10px] py-[10px]">
                  <RefCell
                    label={refTypeLabel(t, item.refType)}
                    number={item.refNumber}
                    refId={item.refId}
                    href={href}
                  />
                  {item.siblingCount > 0 && (
                    <div className="mt-1">
                      <Tag tone="gray">
                        {t('tags.failedElsewhere', { count: item.siblingCount })}
                      </Tag>
                    </div>
                  )}
                </td>
                <td className="px-[10px] py-[10px] max-w-[46ch]">
                  <div
                    className="font-medium break-words"
                    title={item.kind === 'Skipped' ? undefined : item.exceptionType}
                  >
                    {exceptionTypeLabel(t, item.exceptionType, item.kind)}
                  </div>
                  {item.exceptionMessage && (
                    <div className="text-[12px] text-base-content/60 line-clamp-2 break-words">
                      {item.exceptionMessage}
                    </div>
                  )}
                </td>
                <td className="px-[10px] py-[10px] tabular-nums">
                  {item.kind === 'Skipped' ? '—' : item.retryCount}
                </td>
                <td className="px-[10px] py-[10px]">{item.node}</td>
                <td className="px-[10px] py-[10px] whitespace-nowrap">
                  <StatusPill
                    tone={consumerStatusTone(item.status)}
                    blink={item.status === 'RetryRequested'}
                  >
                    {item.status === 'RetryRequested'
                      ? t('status.retryRequestedAt', { node: item.node })
                      : t(`status.${item.status}`)}
                  </StatusPill>
                  {item.actionBy && item.actionAt && (
                    <div className="text-[12px] text-base-content/60 mt-0.5">
                      {item.actionBy} · {formatDateTime(item.actionAt, i18n.language)}
                    </div>
                  )}
                  {item.retryAvailableAt && (
                    <div className="text-[12px] text-sky-600 mt-0.5">
                      {retryAvailableAtLabel(t, item.retryAvailableAt)}
                    </div>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
};

export default ConsumerFailuresTable;
