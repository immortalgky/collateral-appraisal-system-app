import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Pagination from '@shared/components/Pagination';
import { useHasPermission } from '@shared/hooks/useHasPermission';
import { useMenuLabel } from '@shared/hooks/useMenuLabel';
import {
  failedMessageKeys,
  useGetFailedMessages,
  useGetFailedMessagesSummary,
} from '../api/failedMessages';
import { outboxMessageKeys, useGetOutboxMessages } from '../api/outboxMessages';
import { useCommittedSearch } from '../hooks/useCommittedSearch';
import { useScopedSelection } from '../hooks/useScopedSelection';
import { useServerClock } from '../hooks/useServerClock';
import {
  canDiscard,
  confirmDoneEffects,
  deriveCollectorState,
  formatClock,
  isOutboxSelectable,
  isTopGroupActive,
  outboxKey,
  tabCountChip,
  toggleAllInMap,
  toggleInMap,
} from '../utils/queueHealth';
import type {
  FailedMessageListItem,
  FailedMessageStatusFilter,
  OutboxListItem,
  OutboxModule,
  OutboxStatusFilter,
  TopGroup,
} from '../types';
import { OUTBOX_MODULES } from '../types';
import { exceptionTypeLabel, moduleLabel } from '../utils/labels';
import SummaryStrip from '../components/SummaryStrip';
import QueueHealthPanel from '../components/QueueHealthPanel';
import TopGroupChips from '../components/TopGroupChips';
import SourceSwitch from '../components/SourceSwitch';
import ConsumerFailuresTable from '../components/ConsumerFailuresTable';
import OutboxFailuresTable from '../components/OutboxFailuresTable';
import BulkActionBar from '../components/BulkActionBar';
import FailedMessageDrawer from '../components/FailedMessageDrawer';
import OutboxMessageDrawer from '../components/OutboxMessageDrawer';
import ConfirmActionDialog from '../components/ConfirmActionDialog';
import type { ConfirmRequest } from '../components/ConfirmActionDialog';

const PAGE_SIZE = 20;

type DrawerTarget =
  | { kind: 'consumer'; id: string }
  | { kind: 'outbox'; module: OutboxModule; id: string };

// A selection setter's shape, per useScopedSelection — parameterised so toggleRow/toggleAll work for
// both the consumer and outbox selections below without duplicating either's toggle logic.
type SelectionSetter<T> = (updater: (prev: Map<string, T>) => Map<string, T>) => void;

function toggleRow<T>(setSelection: SelectionSetter<T>, key: (item: T) => string, item: T) {
  setSelection(prev => toggleInMap(prev, key, item));
}

function toggleAll<T>(setSelection: SelectionSetter<T>, key: (item: T) => string, selectable: T[]) {
  setSelection(prev => toggleAllInMap(prev, key, selectable));
}

const CONSUMER_TABS = [
  { value: 'Pending', labelKey: 'tabs.pending' },
  { value: 'RetryRequested', labelKey: 'tabs.retryRequested' },
  { value: 'Retried', labelKey: 'tabs.retried' },
  { value: 'Discarded', labelKey: 'tabs.discarded' },
  { value: 'All', labelKey: 'tabs.all' },
] as const satisfies { value: FailedMessageStatusFilter; labelKey: string }[];

const OUTBOX_TABS = [
  { value: 'Failed', labelKey: 'tabs.outboxFailed' },
  { value: 'Stuck', labelKey: 'tabs.outboxStuck' },
  { value: 'Resent', labelKey: 'tabs.outboxResent' },
  { value: 'All', labelKey: 'tabs.all' },
] as const satisfies { value: OutboxStatusFilter; labelKey: string }[];

const FailedMessagesPage = () => {
  const { t } = useTranslation('failedMessages');
  const canManage = useHasPermission('FAILED_MESSAGE_MANAGE');
  // Page title follows the sidebar/breadcrumb menu name so all three match and switch together on
  // the language toggle — see OperationalReportPage.tsx for the same pattern.
  const menuLabel = useMenuLabel('/admin/failed-messages');
  const queryClient = useQueryClient();
  const listSectionRef = useRef<HTMLDivElement>(null);

  const [source, setSource] = useState<'consumer' | 'outbox'>('consumer');

  const [consumerStatus, setConsumerStatus] = useState<FailedMessageStatusFilter>('Pending');
  const [consumerQueue, setConsumerQueue] = useState('');
  const [consumerNode, setConsumerNode] = useState('');
  const [consumerExceptionType, setConsumerExceptionType] = useState('');
  const consumerSearch = useCommittedSearch();
  // Stable (useCallback) across renders, unlike `consumerSearch` itself — see the clamp effect below.
  const { setPage: setConsumerPage } = consumerSearch;

  const [outboxStatus, setOutboxStatus] = useState<OutboxStatusFilter>('Failed');
  const [outboxModule, setOutboxModule] = useState<OutboxModule | ''>('');
  const outboxSearch = useCommittedSearch();
  const { setPage: setOutboxPage } = outboxSearch;

  // Each source remembers its own page, keyed to the committed search it was set under (see
  // useCommittedSearch) — switching source must not reset or share the other's page.
  const pageNumber = source === 'consumer' ? consumerSearch.page : outboxSearch.page;

  // Dropped whenever that source's committed search changes (and never restored). See useScopedSelection.
  const [consumerSelection, setConsumerSelection, clearConsumerSelection] =
    useScopedSelection<FailedMessageListItem>(consumerSearch.committed);
  const [outboxSelection, setOutboxSelection, clearOutboxSelection] =
    useScopedSelection<OutboxListItem>(outboxSearch.committed);

  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  // Opening a confirm from a drawer closes the drawer underneath it (SlideOverPanel is a Headless UI
  // Dialog with a focus trap, ConfirmDialog is a separate portaled <dialog>), so Cancel reopens it
  // from here.
  const [reopenDrawer, setReopenDrawer] = useState<DrawerTarget | null>(null);

  const clearSelection = () => {
    clearConsumerSelection();
    clearOutboxSelection();
  };

  // Defaults to the currently active source; pass explicitly when also switching source in the same
  // call (the `source` closure value hasn't updated yet from a `setSource` earlier in that call).
  const resetPageAndSelection = (target: 'consumer' | 'outbox' = source) => {
    if (target === 'consumer') consumerSearch.setPage(1);
    else outboxSearch.setPage(1);
    clearSelection();
  };

  const summaryQuery = useGetFailedMessagesSummary();

  const consumerParams = useMemo(
    () => ({
      status: consumerStatus,
      queue: consumerQueue || undefined,
      node: consumerNode || undefined,
      exceptionType: consumerExceptionType || undefined,
      search: consumerSearch.committed || undefined,
      pageNumber: consumerSearch.page,
      pageSize: PAGE_SIZE,
    }),
    [
      consumerStatus,
      consumerQueue,
      consumerNode,
      consumerExceptionType,
      consumerSearch.committed,
      consumerSearch.page,
    ],
  );
  const consumerListQuery = useGetFailedMessages(consumerParams, {
    enabled: source === 'consumer',
  });

  const outboxParams = useMemo(
    () => ({
      status: outboxStatus,
      module: outboxModule || undefined,
      search: outboxSearch.committed || undefined,
      pageNumber: outboxSearch.page,
      pageSize: PAGE_SIZE,
    }),
    [outboxStatus, outboxModule, outboxSearch.committed, outboxSearch.page],
  );
  const outboxListQuery = useGetOutboxMessages(outboxParams, { enabled: source === 'outbox' });

  // If the active filter/tab's result shrank (an item left the list, a retry emptied a page), the
  // page the user was on may no longer exist — pull them back to the new last page.
  const activeCount =
    source === 'consumer' ? consumerListQuery.data?.count : outboxListQuery.data?.count;
  // True while the active list shows the previous key's rows (keepPreviousData) while the new key loads.
  const isPlaceholderData =
    source === 'consumer' ? consumerListQuery.isPlaceholderData : outboxListQuery.isPlaceholderData;
  useEffect(() => {
    // Undefined (first load) or placeholder (the previous key's stale total, mid page/filter change)
    // must never drive a clamp.
    if (activeCount === undefined || isPlaceholderData) return;
    const lastPage = Math.max(1, Math.ceil(activeCount / PAGE_SIZE));
    if (pageNumber > lastPage) {
      if (source === 'consumer') setConsumerPage(lastPage);
      else setOutboxPage(lastPage);
    }
  }, [activeCount, isPlaceholderData, pageNumber, source, setConsumerPage, setOutboxPage]);

  // The server's own clock (see useServerClock/serverClock in utils/queueHealth.ts) — never the
  // browser's, which may be skewed or in a different zone.
  const now = useServerClock(summaryQuery.data?.serverTime, summaryQuery.dataUpdatedAt);

  const queueOptions = useMemo(() => {
    const set = new Set<string>();
    summaryQuery.data?.nodes.forEach(n => n.queues.forEach(q => set.add(q.name)));
    summaryQuery.data?.topGroups.forEach(g => set.add(g.queue));
    return [...set].sort();
  }, [summaryQuery.data]);

  const nodeOptions = useMemo(
    () => (summaryQuery.data?.nodes ?? []).map(n => n.node),
    [summaryQuery.data],
  );

  const collectorState = useMemo(
    () => deriveCollectorState(summaryQuery.data?.nodes, now),
    [summaryQuery.data, now],
  );

  const handleSourceChange = (next: 'consumer' | 'outbox') => {
    if (next === source) return;
    setSource(next);
    // Each source keeps its own remembered page — switching source no longer resets it.
    clearSelection();
    setDrawer(null);
  };

  const handleQueueSelect = ({ queue, node }: { queue: string; node: string }) => {
    setSource('consumer');
    setConsumerStatus('Pending');
    setConsumerQueue(queue);
    setConsumerNode(node);
    setConsumerExceptionType('');
    consumerSearch.clear();
    // Explicit target: `source` above hasn't updated yet from `setSource` in this same call.
    resetPageAndSelection('consumer');
    listSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleTopGroupToggle = (group: TopGroup) => {
    const isActive = isTopGroupActive(group, {
      queue: consumerQueue,
      exceptionType: consumerExceptionType,
      node: consumerNode,
      search: consumerSearch.committed,
      status: consumerStatus,
    });
    setConsumerStatus('Pending');
    if (isActive) {
      setConsumerQueue('');
      setConsumerExceptionType('');
    } else {
      setConsumerQueue(group.queue);
      setConsumerExceptionType(group.exceptionType);
    }
    // A chip sets queue + exceptionType only — clear whatever else the user had filtered by, so the
    // chip's own pressed state (which only tracks queue + exceptionType) stays meaningful.
    setConsumerNode('');
    consumerSearch.clear();
    resetPageAndSelection();
  };

  const handlePageChange = (zeroBasedPage: number) => {
    if (source === 'consumer') consumerSearch.setPage(zeroBasedPage + 1);
    else outboxSearch.setPage(zeroBasedPage + 1);
    clearSelection();
  };

  const handleRefresh = () => {
    void summaryQuery.refetch();
    if (source === 'consumer') void consumerListQuery.refetch();
    else void outboxListQuery.refetch();
    // The open drawer polls on its own schedule, but a manual refresh should catch it up right away.
    if (drawer?.kind === 'consumer') {
      void queryClient.invalidateQueries({ queryKey: failedMessageKeys.detail(drawer.id) });
    } else if (drawer?.kind === 'outbox') {
      void queryClient.invalidateQueries({
        queryKey: outboxMessageKeys.detail(drawer.module, drawer.id),
      });
    }
  };

  // ─── Selection ──────────────────────────────────────────────────────────
  const toggleConsumerRow = (item: FailedMessageListItem) =>
    toggleRow(setConsumerSelection, i => i.id, item);
  const toggleConsumerAll = (selectable: FailedMessageListItem[]) =>
    toggleAll(setConsumerSelection, i => i.id, selectable);
  const toggleOutboxRow = (item: OutboxListItem) => toggleRow(setOutboxSelection, outboxKey, item);
  const toggleOutboxAll = (selectable: OutboxListItem[]) =>
    toggleAll(setOutboxSelection, outboxKey, selectable);

  // ─── Drawer / confirm orchestration ────────────────────────────────────
  const openConfirm = (request: ConfirmRequest) => {
    if (drawer) {
      setReopenDrawer(drawer);
      setDrawer(null);
    } else {
      setReopenDrawer(null);
    }
    setConfirmRequest(request);
  };
  const handleCloseConfirm = () => {
    setConfirmRequest(null);
    if (reopenDrawer) {
      setDrawer(reopenDrawer);
      setReopenDrawer(null);
    }
  };
  const handleConfirmDone = () => {
    // A drawer-origin confirm (single-row action) must not wipe an unrelated bulk-bar selection.
    if (confirmRequest && confirmDoneEffects(confirmRequest.origin).clearSelection)
      clearSelection();
    setConfirmRequest(null);
    setReopenDrawer(null);
  };

  const consumerItems = consumerListQuery.data?.items ?? [];
  const outboxItems = outboxListQuery.data?.items ?? [];

  // The checked/selected state shown and acted on is always trimmed to the current page's own
  // (fresh) items — a stored id for a row that scrolled off the page or stopped being selectable
  // (retried, resent, no longer Failed) must not silently stay "selected" underneath the user.
  const visibleConsumerSelection = new Map(
    consumerItems
      .filter(i => canDiscard(i) && consumerSelection.has(i.id))
      .map(i => [i.id, i] as const),
  );
  const visibleOutboxSelection = new Map(
    outboxItems
      .filter(i => isOutboxSelectable(i) && outboxSelection.has(outboxKey(i)))
      .map(i => [outboxKey(i), i] as const),
  );

  // Filters beyond the tab (status) selection itself — while any of these are set, a tab's chip can
  // only ever reflect the currently active tab's own (filtered) list count, never a summary total.
  const consumerHasFilters = !!(
    consumerQueue ||
    consumerNode ||
    consumerExceptionType ||
    consumerSearch.committed
  );
  const outboxHasFilters = !!(outboxModule || outboxSearch.committed);
  const isConsumerDefaultUnfiltered = consumerStatus === 'Pending' && !consumerHasFilters;
  const consumerSummaryCounts = { Pending: summaryQuery.data?.pendingCount };
  const outboxSummaryCounts = {
    Failed: summaryQuery.data?.outboxFailedCount,
    Stuck: summaryQuery.data?.outboxStuckCount,
  };

  const totalCount =
    source === 'consumer'
      ? (consumerListQuery.data?.count ?? 0)
      : (outboxListQuery.data?.count ?? 0);
  const selectionCount =
    source === 'consumer' ? visibleConsumerSelection.size : visibleOutboxSelection.size;

  // A failed background poll must not hide the last good summary — only show the error state when
  // there's nothing to fall back on. When data IS present, surface the failure as a small note
  // instead (see the amber "refresh failed" line next to "Updated …" below).
  const summaryHasErrorWithNoData = summaryQuery.isError && !summaryQuery.data;
  // No data and no error covers a paused (offline) query too, where isLoading is false.
  const summaryPending = !summaryQuery.data && !summaryQuery.isError;

  // Same idea for the active list: a failed poll keeps showing the last good rows, with a small note
  // above the table — and disables the bulk actions until a successful refetch clears the error.
  const activeListQuery = source === 'consumer' ? consumerListQuery : outboxListQuery;
  const listRefreshFailed = activeListQuery.isError && !!activeListQuery.data;

  return (
    // While the fixed BulkActionBar is up (it can wrap to several rows on a narrow screen), leave
    // room under the pager so it never covers it.
    <div
      className={`px-4 sm:px-6 lg:px-8 pt-8 flex flex-col gap-4 ${canManage && selectionCount > 0 ? 'pb-32' : 'pb-8'}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeader
          title={menuLabel ?? t('page.title')}
          subtitle={t('page.subtitle')}
          icon="triangle-exclamation"
          iconColor="rose"
        />
        <div className="flex items-center gap-2 text-[12px] text-gray-500">
          <span>{t('page.refreshed', { time: formatClock(summaryQuery.data?.serverTime) })}</span>
          {summaryQuery.data && summaryQuery.isError && (
            <span className="text-amber-700">{t('page.refreshFailed')}</span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('page.refresh')}
          </button>
        </div>
      </div>

      <SummaryStrip
        summary={summaryQuery.data}
        isLoading={summaryPending}
        isError={summaryHasErrorWithNoData}
        onRetry={() => void summaryQuery.refetch()}
        now={now}
      />

      <QueueHealthPanel
        nodes={summaryQuery.data?.nodes ?? []}
        isLoading={summaryPending}
        isError={summaryHasErrorWithNoData}
        onRetry={() => void summaryQuery.refetch()}
        now={now}
        onQueueSelect={handleQueueSelect}
      />

      {source === 'consumer' && (
        <TopGroupChips
          topGroups={summaryQuery.data?.topGroups ?? []}
          activeQueue={consumerQueue || undefined}
          activeExceptionType={consumerExceptionType || undefined}
          activeNode={consumerNode || undefined}
          activeSearch={consumerSearch.committed || undefined}
          activeStatus={consumerStatus}
          onToggle={handleTopGroupToggle}
        />
      )}

      <div
        ref={listSectionRef}
        className="bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden"
      >
        <SourceSwitch
          source={source}
          onChange={handleSourceChange}
          consumerCount={summaryQuery.data?.pendingCount}
          outboxCount={
            summaryQuery.data &&
            summaryQuery.data.outboxFailedCount + summaryQuery.data.outboxStuckCount
          }
        />

        <div className="flex flex-wrap gap-2.5 items-center px-3 py-2.5 border-b border-base-300">
          <div
            className="inline-flex flex-wrap gap-0.5 bg-base-200 rounded-[11px] p-[3px]"
            role="tablist"
          >
            {(source === 'consumer' ? CONSUMER_TABS : OUTBOX_TABS).map(tab => {
              const active =
                source === 'consumer' ? consumerStatus === tab.value : outboxStatus === tab.value;
              const chip =
                source === 'consumer'
                  ? tabCountChip({
                      tab: tab.value,
                      activeTab: consumerStatus,
                      hasFilters: consumerHasFilters,
                      listCount: consumerListQuery.data?.count,
                      summaryCounts: consumerSummaryCounts,
                    })
                  : tabCountChip({
                      tab: tab.value,
                      activeTab: outboxStatus,
                      hasFilters: outboxHasFilters,
                      listCount: outboxListQuery.data?.count,
                      summaryCounts: outboxSummaryCounts,
                    });
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    if (active) return;
                    if (source === 'consumer')
                      setConsumerStatus(tab.value as FailedMessageStatusFilter);
                    else setOutboxStatus(tab.value as OutboxStatusFilter);
                    resetPageAndSelection();
                  }}
                  className={`px-[11px] py-[5px] rounded-lg text-[13px] font-medium ${active ? 'bg-base-100 shadow-sm' : 'text-base-content/60'}`}
                >
                  {t(tab.labelKey)}
                  {chip !== undefined && (
                    <span
                      className={`ml-[5px] rounded-full px-1.5 text-[11px] tabular-nums ${active ? 'bg-primary/10 text-primary' : 'bg-base-300 text-base-content/60'}`}
                    >
                      {chip}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 ml-auto">
            {source === 'consumer' && consumerExceptionType && (
              <button
                type="button"
                onClick={() => {
                  setConsumerExceptionType('');
                  resetPageAndSelection();
                }}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 text-primary px-2.5 py-1 text-[12px]"
              >
                {exceptionTypeLabel(t, consumerExceptionType)} ✕
              </button>
            )}
            <input
              type="search"
              value={source === 'consumer' ? consumerSearch.input : outboxSearch.input}
              onChange={e => {
                if (source === 'consumer') consumerSearch.setInput(e.target.value);
                else outboxSearch.setInput(e.target.value);
              }}
              placeholder={
                source === 'consumer'
                  ? t('filters.consumerSearchPlaceholder')
                  : t('filters.outboxSearchPlaceholder')
              }
              aria-label={t('filters.searchLabel')}
              className="w-full sm:w-56 px-3 py-1.5 border border-base-300 rounded-lg text-[13px] bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {source === 'consumer' ? (
              <>
                <select
                  value={consumerQueue}
                  onChange={e => {
                    setConsumerQueue(e.target.value);
                    resetPageAndSelection();
                  }}
                  aria-label={t('filters.queueLabel')}
                  className="px-2.5 py-1.5 border border-base-300 rounded-lg text-[13px] bg-base-100"
                >
                  <option value="">{t('filters.allQueues')}</option>
                  {/* The summary may have moved on (or a queue-row click set a queue the summary no
                      longer lists) — keep the active value selectable rather than silently falling
                      back to a blank/mismatched selection. */}
                  {consumerQueue && !queueOptions.includes(consumerQueue) && (
                    <option value={consumerQueue}>
                      {t('filters.notInSummary', { value: consumerQueue })}
                    </option>
                  )}
                  {queueOptions.map(q => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
                <select
                  value={consumerNode}
                  onChange={e => {
                    setConsumerNode(e.target.value);
                    resetPageAndSelection();
                  }}
                  aria-label={t('filters.nodeLabel')}
                  className="px-2.5 py-1.5 border border-base-300 rounded-lg text-[13px] bg-base-100"
                >
                  <option value="">{t('filters.allNodes')}</option>
                  {consumerNode && !nodeOptions.includes(consumerNode) && (
                    <option value={consumerNode}>
                      {t('filters.notInSummary', { value: consumerNode })}
                    </option>
                  )}
                  {nodeOptions.map(n => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <select
                value={outboxModule}
                onChange={e => {
                  setOutboxModule(e.target.value as OutboxModule | '');
                  resetPageAndSelection();
                }}
                aria-label={t('filters.moduleLabel')}
                className="px-2.5 py-1.5 border border-base-300 rounded-lg text-[13px] bg-base-100"
              >
                <option value="">{t('filters.allModules')}</option>
                {OUTBOX_MODULES.map(m => (
                  <option key={m} value={m}>
                    {moduleLabel(t, m)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {listRefreshFailed && (
          <div className="px-3 py-2 text-[12px] border-b border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            {t('list.refreshFailed')}
          </div>
        )}

        <div
          className={`overflow-x-auto transition-opacity ${isPlaceholderData ? 'opacity-50' : ''}`}
          aria-busy={isPlaceholderData}
        >
          {source === 'consumer' ? (
            <ConsumerFailuresTable
              items={consumerItems}
              isLoading={consumerListQuery.isLoading}
              totalCount={totalCount}
              isError={consumerListQuery.isError && !consumerListQuery.data}
              onRetry={() => void consumerListQuery.refetch()}
              canManage={canManage}
              selection={visibleConsumerSelection}
              onToggleRow={toggleConsumerRow}
              onToggleAll={toggleConsumerAll}
              onOpen={id => setDrawer({ kind: 'consumer', id })}
              isDefaultUnfiltered={isConsumerDefaultUnfiltered}
              selectionDisabled={isPlaceholderData}
              collectorState={collectorState}
            />
          ) : (
            <OutboxFailuresTable
              items={outboxItems}
              isLoading={outboxListQuery.isLoading}
              totalCount={totalCount}
              isError={outboxListQuery.isError && !outboxListQuery.data}
              onRetry={() => void outboxListQuery.refetch()}
              canManage={canManage}
              selection={visibleOutboxSelection}
              onToggleRow={toggleOutboxRow}
              onToggleAll={toggleOutboxAll}
              onOpen={item => setDrawer({ kind: 'outbox', module: item.module, id: item.id })}
              hasFilters={outboxHasFilters}
              failedTab={outboxStatus === 'Failed'}
              selectionDisabled={isPlaceholderData}
              now={now}
              stuckTab={outboxStatus === 'Stuck'}
              outboxFailedCount={summaryQuery.data?.outboxFailedCount}
              outboxStuckCount={summaryQuery.data?.outboxStuckCount}
            />
          )}
        </div>

        {totalCount > 0 && (
          <Pagination
            currentPage={pageNumber - 1}
            totalPages={Math.ceil(totalCount / PAGE_SIZE)}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            showPageSizeSelector={false}
          />
        )}
      </div>

      {canManage && (
        <BulkActionBar
          source={source}
          count={selectionCount}
          // Placeholder rows belong to the previous page/filter — never act on them.
          disabled={listRefreshFailed || isPlaceholderData}
          onRetry={() =>
            // Full selection — ConfirmActionDialog groups it into sendable / waitingToSend / tooSoon.
            openConfirm({
              kind: 'retry',
              items: [...visibleConsumerSelection.values()],
              origin: 'bulk',
            })
          }
          onDiscard={() =>
            openConfirm({
              kind: 'discard',
              items: [...visibleConsumerSelection.values()],
              origin: 'bulk',
            })
          }
          onResend={() =>
            openConfirm({
              kind: 'resend',
              items: [...visibleOutboxSelection.values()],
              origin: 'bulk',
            })
          }
          onClear={clearSelection}
        />
      )}

      <FailedMessageDrawer
        id={drawer?.kind === 'consumer' ? drawer.id : null}
        onClose={() => setDrawer(null)}
        canManage={canManage}
        onRequestRetry={item => openConfirm({ kind: 'retry', items: [item], origin: 'drawer' })}
        onRequestDiscard={item => openConfirm({ kind: 'discard', items: [item], origin: 'drawer' })}
        onOpenSibling={id => setDrawer({ kind: 'consumer', id })}
        now={now}
      />

      <OutboxMessageDrawer
        target={drawer?.kind === 'outbox' ? { module: drawer.module, id: drawer.id } : null}
        onClose={() => setDrawer(null)}
        canManage={canManage}
        onRequestResend={item => openConfirm({ kind: 'resend', items: [item], origin: 'drawer' })}
        now={now}
        stuckTab={outboxStatus === 'Stuck'}
      />

      <ConfirmActionDialog
        request={confirmRequest}
        onClose={handleCloseConfirm}
        onDone={handleConfirmDone}
        now={now}
      />
    </div>
  );
};

export default FailedMessagesPage;
