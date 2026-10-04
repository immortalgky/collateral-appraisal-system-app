import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import DataErrorState from '@shared/components/DataErrorState';
import type { OutboxListItem } from '../types';
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
import { outboxStatusLabelKey, outboxStatusTone, refTypeLabel } from '../utils/labels';
import { RefCell, StatusPill, Tag, Th } from './ui';

interface OutboxFailuresTableProps {
  items: OutboxListItem[];
  isLoading: boolean;
  // The query's total row count — an empty `items` with count > 0 is a page past the end (the page is
  // clamping back), which must never read as an empty/all-clear state.
  totalCount: number;
  isError: boolean;
  onRetry: () => void;
  canManage: boolean;
  selection: Map<string, OutboxListItem>;
  onToggleRow: (item: OutboxListItem) => void;
  onToggleAll: (selectable: OutboxListItem[]) => void;
  onOpen: (item: OutboxListItem) => void;
  // A search or module filter is applied (the tab itself does not count).
  hasFilters: boolean;
  // The default Failed tab — only here can an empty list read as all-clear.
  failedTab: boolean;
  // True while the rows shown are the previous query's placeholder data — they must not be selectable.
  selectionDisabled?: boolean;
  // The server's own clock (see serverClock in utils/queueHealth.ts) — null until the summary that
  // carries it has loaded, in which case no "stuck for" elapsed time is shown yet.
  now: Date | null;
  // The Stuck tab: the server already filtered every row as stuck, so a Processing row renders as
  // Stuck while `now` is still null (until the summary loads); once it is known, `now` decides.
  stuckTab?: boolean;
  // The summary's outbox counts (undefined until it loads). Only 0 and 0 may read as an all-clear.
  outboxFailedCount?: number;
  outboxStuckCount?: number;
}

const OutboxFailuresTable = ({
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
  hasFilters,
  failedTab,
  selectionDisabled,
  now,
  stuckTab,
  outboxFailedCount,
  outboxStuckCount,
}: OutboxFailuresTableProps) => {
  const { t, i18n } = useTranslation('failedMessages');

  const selectable = items.filter(isOutboxSelectable);
  const allSelected = selectable.length > 0 && selectable.every(i => selection.has(outboxKey(i)));
  // 6 data columns, plus the checkbox column only when the viewer can act on rows.
  const columnCount = canManage ? 7 : 6;
  // Which empty text is honest. Another tab's emptiness says nothing about the outbox as a whole, so
  // it is always neutral; on the Failed tab all-clear needs the summary to say 0 failed AND 0 stuck.
  const emptyKind =
    !failedTab || outboxFailedCount === undefined || outboxStuckCount === undefined
      ? 'neutral'
      : outboxFailedCount === 0 && outboxStuckCount === 0
        ? 'clear'
        : outboxStuckCount > 0
          ? 'stuck'
          : 'neutral';

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
          <Th>{t('table.occurredAt')}</Th>
          <Th>{t('table.moduleEventType')}</Th>
          <Th>{t('table.reference')}</Th>
          <Th>{t('table.latestError')}</Th>
          <Th>{t('table.retry')}</Th>
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
            <td colSpan={columnCount} className="text-center py-12">
              <p className="text-[15px] font-semibold">
                {hasFilters
                  ? t('table.filteredEmptyTitle')
                  : emptyKind === 'clear'
                    ? t('table.outboxEmptyTitle')
                    : emptyKind === 'stuck'
                      ? t('table.outboxEmptyStuckTitle')
                      : t('table.outboxEmptyNeutralTitle')}
              </p>
              <p className="text-base-content/60 mt-1">
                {hasFilters
                  ? t('table.filteredEmptyDesc')
                  : emptyKind === 'clear'
                    ? t('table.outboxEmptyDesc')
                    : emptyKind === 'stuck'
                      ? t('table.outboxEmptyStuckDesc')
                      : t('table.outboxEmptyNeutralDesc')}
              </p>
            </td>
          </tr>
        ) : (
          items.map(item => {
            const key = outboxKey(item);
            const checked = selection.has(key);
            const selectableRow = isOutboxSelectable(item);
            const failureClass = classifyOutboxFailure(item);
            const href = refHref(item.refType, item.refId);
            // Only a guess while the clock is unknown; once known, a row claimed again is judged by it.
            const assumeStuck = !!stuckTab && item.status === 'Processing' && now === null;
            const stuck = assumeStuck || isStuck(item, now);
            // The duration needs the clock — hidden while `now` is unknown.
            const parts =
              stuck && now ? elapsedParts(item.processingStartedAt ?? item.occurredAt, now) : null;
            return (
              <tr
                key={key}
                tabIndex={0}
                onClick={() => onOpen(item)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(item);
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
                        aria-label={t('table.selectRow', { type: item.eventType })}
                        checked={checked}
                        disabled={selectionDisabled}
                        onChange={() => onToggleRow(item)}
                      />
                    )}
                  </td>
                )}
                <td className="px-[10px] py-[10px] whitespace-nowrap tabular-nums">
                  {formatDateTime(item.occurredAt, i18n.language)}
                </td>
                <td className="px-[10px] py-[10px]">
                  <div className="font-mono text-[12px]">{outboxTableName(item.module)}</div>
                  <div
                    className="text-[12px] text-base-content/60 break-words"
                    title={item.eventType}
                  >
                    {shortEventType(item.eventType)}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {failureClass === 'blocked' && <Tag tone="red">{t('tags.resendWontHelp')}</Tag>}
                    {failureClass === 'typeNowResolves' && (
                      <Tag tone="sky">{t('tags.typeNowResolves')}</Tag>
                    )}
                    {failureClass === 'payloadWarning' && (
                      <Tag tone="amber">{t('tags.payloadWarning')}</Tag>
                    )}
                    {item.newerSentCount != null && item.newerSentCount > 0 && (
                      <Tag tone="amber">{t('tags.newerSent', { count: item.newerSentCount })}</Tag>
                    )}
                  </div>
                </td>
                <td className="px-[10px] py-[10px]">
                  <RefCell
                    label={refTypeLabel(t, item.refType)}
                    number={item.refNumber}
                    refId={item.refId}
                    href={href}
                  />
                </td>
                <td className="px-[10px] py-[10px] max-w-[46ch]">
                  {!item.error && item.status === 'Processing' ? (
                    <span className="text-[12px] text-base-content/60">
                      {parts
                        ? t('table.stuckFor', { hours: parts.hours, minutes: parts.minutes })
                        : stuck
                          ? t('outboxStatus.Stuck')
                          : t('outboxStatus.Processing')}
                    </span>
                  ) : (
                    <div className="text-[12px] text-base-content/60 line-clamp-2 break-words">
                      {item.error}
                    </div>
                  )}
                </td>
                <td className="px-[10px] py-[10px] tabular-nums">
                  {item.status === 'Processing' ? '—' : item.retryCount}
                </td>
                <td className="px-[10px] py-[10px] whitespace-nowrap">
                  <StatusPill
                    tone={outboxStatusTone(item, now, assumeStuck)}
                    blink={item.status === 'Pending'}
                  >
                    {t(outboxStatusLabelKey(item, now, assumeStuck))}
                  </StatusPill>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
};

export default OutboxFailuresTable;
