import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useGetLogs } from '../api/useGetLogs';
import { useGetLogSummary } from '../api/useGetLogSummary';
import LogSearchBar from '../components/LogSearchBar';
import FilterChips from '../components/FilterChips';
import LogHistogram from '../components/LogHistogram';
import LogTable from '../components/LogTable';
import TopProblemsPanel from '../components/TopProblemsPanel';
import SavedSearchesPanel from '../components/SavedSearchesPanel';
import LogDetailDrawer from '../components/LogDetailDrawer';
import SearchGuideDrawer from '../components/SearchGuideDrawer';
import MetricsStrip from '../components/MetricsStrip';
import MachineHealthView from '../components/MachineHealthView';
import { useGetCurrentSystemMetrics, useGetSystemMetrics } from '../api/useGetSystemMetrics';
import { useLogFilterState } from '../hooks/useLogFilterState';
import { useLiveTail } from '../hooks/useLiveTail';
import {
  appendQueryToken,
  appendToken,
  extractQueryTokens,
  removeQueryToken,
} from '../utils/queryTokens';
import { bucketWindow, formatTimeRange } from '../utils/formatBucketWindow';
import { unionMachineNames } from '../utils/machineColors';
import { copyToClipboard } from '../utils/clipboard';
import {
  clampToNow,
  isPresetHours,
  isWideRange,
  LIVE_WINDOW_HOURS,
  popZoomEntry,
  pushZoomEntry,
  resolveAroundRange,
  resolveRange,
  toApiDateTime,
  validateRange,
  validOrAroundNow,
  type RangePresetHours,
  type RangeState,
} from '../utils/range';
import {
  addSavedSearch,
  loadSavedSearches,
  removeSavedSearch,
  type SavedLogSearch,
} from '../utils/savedSearches';
import { LOG_LEVELS, type LogListItem } from '../types';

const LogViewerPage = () => {
  const { t } = useTranslation('logAdmin');
  const { appliedQuery, setAppliedQuery, levels, setLevels, range, setRange, view, setView } =
    useLogFilterState();

  const [draftQuery, setDraftQuery] = useState(appliedQuery);
  const [live, setLive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LogListItem | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedLogSearch[]>(() => loadSavedSearches());
  // Stack of ranges to return to on "zoom out" — pushed on a bucket-click zoom, cleared on a new
  // starting point (preset pick, custom range apply, or clearing the chip).
  const [zoomHistory, setZoomHistory] = useState<RangeState[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDirty = draftQuery !== appliedQuery;
  // Read inside callbacks that must stay referentially stable (so memo(LogTable) actually skips
  // renders) instead of taking `draftQuery` as a dependency, which would change identity on
  // every keystroke.
  const draftQueryRef = useRef(draftQuery);
  draftQueryRef.current = draftQuery;

  const resolvedRange = useMemo(() => resolveRange(range), [range]);
  const levelsList = useMemo(() => [...levels], [levels]);

  // Applies a query immediately (tag/recipe/top-problem/saved-search clicks all search on click,
  // unlike typing — see plan section D) and drops live mode, since those are all "look at this
  // specific thing" actions rather than "keep watching".
  const runSearch = (query: string) => {
    setDraftQuery(query);
    setAppliedQuery(query);
    setLive(false);
  };

  // Refreshes the main search to a fresh "now" — a preset re-resolves by bumping its nonce, which
  // changes every dependent query's key and refetches automatically; a custom range has no such
  // "now" to bump, so it keeps its own from/to and just refetches directly (but only when nothing
  // ELSE is already about to change the query key — see handleSearch, which skips this when the
  // query text itself just changed, or it would double-fetch). Also used by turning Live off (the
  // rows Live just streamed in must be folded into the persisted list before that buffer clears,
  // or they'd vanish — round-4 review item 1).
  const refreshToNow = (options: { skipCustomRefetch?: boolean } = {}) => {
    if (range.kind === 'preset') {
      setRange({ kind: 'preset', hours: range.hours, nonce: Date.now() });
    } else if (!options.skipCustomRefetch) {
      refetch();
      refetchSummary();
      refetchSystemMetrics();
    }
  };

  const handleSearch = () => {
    // A custom range with unchanged text has no other way to get a fresh fetch — but if the text
    // DID just change, setAppliedQuery below already changes the query key and fetches on its
    // own, so the explicit refetch in refreshToNow would double-fetch.
    const textChanged = draftQuery !== appliedQuery;
    setAppliedQuery(draftQuery);
    refreshToNow({ skipCustomRefetch: textChanged });
  };

  const handleSelectPreset = (hours: RangePresetHours) => {
    setRange({ kind: 'preset', hours, nonce: Date.now() });
    setLive(false);
    setZoomHistory([]);
  };

  const handleApplyCustomRange = (from: Date, to: Date) => {
    setRange({ kind: 'custom', from, to });
    setLive(false);
    setZoomHistory([]);
    if (isWideRange({ from, to }) && appliedQuery) {
      toast(t('search.wideRangeWarning'));
    }
  };

  const handleToggleLive = () => {
    const next = !live;
    setLive(next);
    if (next) {
      setLiveOffAt(null);
      setStickyTailItems([]);
      setRange({ kind: 'preset', hours: LIVE_WINDOW_HOURS, nonce: Date.now() });
      setZoomHistory([]);
    } else {
      // Snapshot what was streaming and remember the list's current dataUpdatedAt as the "before"
      // mark — the effect below keeps showing this snapshot until a NEWER, real (non-placeholder)
      // fetch lands, so the rows Live just streamed in don't flash away before refreshToNow()'s
      // refetch has actually arrived (round-6 item: Live button off keeps rows visible).
      setStickyTailItems(liveTailItemsRef.current);
      setLiveOffAt(dataUpdatedAt);
      refreshToNow();
    }
  };

  // Stable forever (empty deps, reads the box through a ref) — a tag click builds from whatever
  // is actually in the box right now, dirty or not, since draftQuery already IS that value (it's
  // only ever behind appliedQuery, never ahead of it).
  const handleTagClick = useCallback((key: string, value: string) => {
    runSearch(appendQueryToken(draftQueryRef.current, key, value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemoveToken = (raw: string) => {
    runSearch(removeQueryToken(draftQuery, raw));
  };

  // Top problems are also an appending action — the phrase describes ONE additional thing to
  // look for, not a whole new search, so it's added onto the box rather than replacing it.
  // appendToken no-ops for an empty phrase (e.g. a top problem with nothing usable to search —
  // see topProblemToQuery) and dedupes an identical phrase already in the box.
  const handleTopProblemSelect = (query: string) => {
    runSearch(appendToken(draftQuery, query));
  };

  const handleBucketClick = (bucketStart: string, bucketSeconds: number) => {
    // The BE divides the range into a fixed 48 buckets of ceil(span/48)s each — on a short range
    // that doesn't divide evenly, a trailing bucket can start at/after `resolvedRange.to`.
    // Ignore that click rather than zoom into an empty or invalid range.
    if (new Date(bucketStart).getTime() >= resolvedRange.to.getTime()) return;
    // Exactly the clicked bucket's window — same clamp as the tooltip (formatBucketWindow), so
    // the resulting range chip always shows the same times the tooltip just showed.
    const { from, to } = bucketWindow(bucketStart, bucketSeconds, resolvedRange.to);
    if (validateRange(from, to)) return;
    setZoomHistory(prev => pushZoomEntry(prev, range));
    setRange({ kind: 'custom', from, to });
    setLive(false);
  };

  const handleZoomOut = () => {
    const { entry, rest } = popZoomEntry(zoomHistory);
    if (!entry) return;
    setZoomHistory(rest);
    setRange(entry);
    setLive(false);
  };

  const handleAroundLog = (timeStamp: string) => {
    // resolveAroundRange already clamps `to` to now, but a timestamp that's itself after now
    // (clock skew) can leave `from` after now too, which clamping `to` alone never catches —
    // validOrAroundNow runs the full check and falls back to a sane window rather than ever
    // setting an inverted from > to range.
    const zoomed = validOrAroundNow(resolveAroundRange(new Date(timeStamp), 2), 2);
    setRange({ kind: 'custom', from: zoomed.from, to: zoomed.to });
    setZoomHistory([]);
    setSelectedItem(null);
    runSearch('');
  };

  // Never called with key === 'corr' — the drawer's correlationId filter link now goes straight
  // to onViewFullTrace instead (replace the query + zoom to the ±60min trace window around the
  // row, same as the trace tab's "view all"), rather than appending onto whatever was there.
  const handleFilterFromDrawer = (key: string, value: string) => {
    handleTagClick(key, value);
    setSelectedItem(null);
  };

  // entityId/workflowInstanceId/collateralId/documentId have no `key:` in the search language —
  // a bare GUID already searches every id column at once, so this appends the value itself
  // rather than building a key:value token. appendToken no-ops for an empty id and dedupes one
  // already in the box.
  const handleFilterIdFromDrawer = (id: string) => {
    runSearch(appendToken(draftQuery, id));
    setSelectedItem(null);
  };

  const handleTryQuery = (query: string) => {
    setRange({ kind: 'preset', hours: 168, nonce: Date.now() });
    setZoomHistory([]);
    runSearch(query);
    setGuideOpen(false);
  };

  const handleApplySavedSearch = (search: SavedLogSearch) => {
    setRange({
      kind: 'preset',
      hours: isPresetHours(search.hours) ? search.hours : 24,
      nonce: Date.now(),
    });
    setZoomHistory([]);
    setLevels(new Set(LOG_LEVELS));
    runSearch(search.q);
  };

  const handleSaveSearch = (label: string) => {
    const hours = range.kind === 'preset' ? range.hours : 24;
    setSavedSearches(addSavedSearch(label, appliedQuery, hours));
  };

  const handleDeleteSavedSearch = (id: string) => {
    setSavedSearches(removeSavedSearch(id));
  };

  // From the health tab's charts/events — jumps to the Logs view showing that exact window,
  // with the query and level filters cleared (mirrors the mock's casGoLogs). The window comes
  // from a bucket/event timestamp that can itself be very recent, so it's clamped to now and,
  // in case that alone isn't enough (clock skew — see handleAroundLog), validated with a
  // sane fallback rather than ever setting an inverted range.
  const handleGoToLogsWithRange = (from: string, to: string) => {
    const clamped = validOrAroundNow(clampToNow({ from: new Date(from), to: new Date(to) }), 2);
    setRange({ kind: 'custom', ...clamped });
    setZoomHistory([]);
    setLevels(new Set(LOG_LEVELS));
    runSearch('');
    setView('logs');
  };

  // "View all" from the trace drawer's hasMore banner — same idea as handleGoToLogsWithRange:
  // a full context switch to the exact trace window, filtered to just this correlation id, with
  // every level shown.
  const handleViewFullTrace = (correlationId: string, from: string, to: string) => {
    const clamped = validOrAroundNow(clampToNow({ from: new Date(from), to: new Date(to) }), 2);
    setRange({ kind: 'custom', ...clamped });
    setZoomHistory([]);
    setLevels(new Set(LOG_LEVELS));
    setSelectedItem(null);
    runSearch(`corr:${correlationId}`);
  };

  const handleCopyLink = useCallback(() => {
    copyToClipboard(
      window.location.href,
      () => toast.success(t('table.copyLinkToast')),
      () => toast.error(t('table.copyLinkFailed')),
    );
  }, [t]);

  // "/" focuses the search box, unless the user is already typing somewhere else (any editable
  // element, not just the search box itself) or the search box isn't even on screen (health view).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || view === 'health') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target?.isContentEditable;
      if (isEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [view]);

  const summaryParams = {
    q: appliedQuery,
    from: toApiDateTime(resolvedRange.from),
    to: toApiDateTime(resolvedRange.to),
  };
  const { data: summary, refetch: refetchSummary } = useGetLogSummary(summaryParams, {
    enabled: view === 'logs',
  });

  // Same from/to as the histogram, per plan section F — a fixed 48 buckets regardless of range.
  const { data: systemMetrics, refetch: refetchSystemMetrics } = useGetSystemMetrics(
    { from: summaryParams.from, to: summaryParams.to, buckets: 48 },
    { enabled: view === 'logs' },
  );
  // Same query the health tab's cards use (shared cache, same query key) — gives the strip's
  // colour registry the freshest known machine set, not just whichever ones happened to log
  // something inside this particular window. See machineColors.unionMachineNames.
  const { data: currentMetrics } = useGetCurrentSystemMetrics({ enabled: view === 'logs' });
  const stripMachineNames = useMemo(
    () =>
      unionMachineNames(
        (currentMetrics ?? []).map(m => m.machineName),
        (systemMetrics?.machines ?? []).map(m => m.machineName),
      ),
    [currentMetrics, systemMetrics],
  );

  // The main list always tracks resolvedRange.to, same as the histogram/summary — Live sliding
  // the window used to be done here by overriding `to`, which also (wrongly) re-fetched
  // summary/metrics every 5s; that's now entirely useLiveTail's own concern, isolated from this
  // query.
  const listParams = { ...summaryParams, levels: levelsList };
  const {
    data,
    isLoading,
    isError,
    isPlaceholderData,
    dataUpdatedAt,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetLogs(listParams, { enabled: view === 'logs' });
  const mainItems = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);
  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  // Owns every piece of Live-tail state (buffer, cursor, quiet-window seed, bounded drain) —
  // see useLiveTail for why this one hook replaced ~5 pieces of state and 4 effects here.
  const { items: liveTailItems } = useLiveTail({
    enabled: live && view === 'logs',
    q: appliedQuery,
    levels: levelsList,
    listIsReady: !isPlaceholderData,
  });
  const liveTailItemsRef = useRef<LogListItem[]>(liveTailItems);
  liveTailItemsRef.current = liveTailItems;

  // Live button off keeps showing what was streaming until the refresh it triggers has actually
  // landed (real, non-placeholder data newer than the moment it was clicked) — every OTHER way
  // Live can turn off (a tag click, a preset, a zoom, ...) leaves this untouched, so it stays
  // empty and the tail clears immediately along with useLiveTail's own buffer.
  const [liveOffAt, setLiveOffAt] = useState<number | null>(null);
  const [stickyTailItems, setStickyTailItems] = useState<LogListItem[]>([]);
  useEffect(() => {
    if (liveOffAt == null) return;
    if (isPlaceholderData || dataUpdatedAt <= liveOffAt) return;
    setLiveOffAt(null);
    setStickyTailItems([]);
  }, [liveOffAt, isPlaceholderData, dataUpdatedAt]);
  const effectiveLiveItems = live ? liveTailItems : stickyTailItems;

  const mainIds = useMemo(() => new Set(mainItems.map(i => i.id)), [mainItems]);
  const items = useMemo(
    () => [...effectiveLiveItems.filter(i => !mainIds.has(i.id)), ...mainItems],
    [effectiveLiveItems, mainItems, mainIds],
  );

  const activeTokens = useMemo(() => extractQueryTokens(appliedQuery), [appliedQuery]);
  const rangeChipLabel =
    range.kind === 'custom' ? formatTimeRange(resolvedRange.from, resolvedRange.to, true) : null;
  const previousRangeState = zoomHistory.length > 0 ? zoomHistory[zoomHistory.length - 1] : null;
  const zoomOutTooltip = previousRangeState
    ? (() => {
        const previousResolved = resolveRange(previousRangeState);
        return formatTimeRange(previousResolved.from, previousResolved.to, true);
      })()
    : null;
  const wideAxis = resolvedRange.to.getTime() - resolvedRange.from.getTime() > 2 * 24 * 3600_000;
  // Same >24h convention MachineEventsList uses for its own showDate — a bare "14:32" is
  // ambiguous once the range covers more than one day.
  const rangeOverADay = resolvedRange.to.getTime() - resolvedRange.from.getTime() > 24 * 3600_000;

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {view !== 'health' && (
        <div className="shrink-0 mb-3">
          <h2 className="text-sm font-semibold text-gray-900">{t('page.title')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('page.subtitle')}</p>
        </div>
      )}

      {view === 'health' ? (
        <MachineHealthView onGoToLogs={handleGoToLogsWithRange} onBack={() => setView('logs')} />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
            <LogSearchBar
              inputRef={inputRef}
              draftQuery={draftQuery}
              onDraftChange={setDraftQuery}
              onSearch={handleSearch}
              isDirty={isDirty}
              rangeHours={range.kind === 'preset' ? range.hours : null}
              onSelectPreset={handleSelectPreset}
              customFrom={resolvedRange.from}
              customTo={resolvedRange.to}
              onApplyCustomRange={handleApplyCustomRange}
              live={live}
              onToggleLive={handleToggleLive}
              onOpenGuide={() => setGuideOpen(true)}
            />

            <FilterChips
              levels={levels}
              onToggleLevel={level =>
                setLevels(prev => {
                  const next = new Set(prev);
                  if (next.has(level)) next.delete(level);
                  else next.add(level);
                  return next.size === 0 ? new Set([level]) : next;
                })
              }
              levelCounts={summary?.levelCounts}
              activeTokens={activeTokens}
              onRemoveToken={handleRemoveToken}
              rangeChipLabel={rangeChipLabel}
              onClearRange={() => handleSelectPreset(24)}
              zoomOutTooltip={zoomOutTooltip}
              onZoomOut={handleZoomOut}
            />

            {summary && (
              <LogHistogram
                buckets={summary.buckets}
                bucketSeconds={summary.bucketSeconds}
                rangeTo={resolvedRange.to}
                onBucketClick={handleBucketClick}
                wideAxis={wideAxis}
              />
            )}

            <MetricsStrip
              systemMetrics={systemMetrics}
              rangeTo={resolvedRange.to}
              onPointClick={handleBucketClick}
              wideAxis={wideAxis}
              onViewHealth={() => setView('health')}
              machineNames={stripMachineNames}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start mt-4">
            <LogTable
              items={items}
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={handleLoadMore}
              onSelectRow={setSelectedItem}
              selectedId={selectedItem?.id ?? null}
              onTagClick={handleTagClick}
              onCopyLink={handleCopyLink}
            />

            <div className="flex flex-col gap-4">
              <TopProblemsPanel
                topProblems={summary?.topProblems ?? []}
                onSelect={handleTopProblemSelect}
                showDate={rangeOverADay}
              />
              <SavedSearchesPanel
                savedSearches={savedSearches}
                currentQuery={appliedQuery}
                currentHours={range.kind === 'preset' ? range.hours : null}
                onApply={handleApplySavedSearch}
                onSave={handleSaveSearch}
                onDelete={handleDeleteSavedSearch}
              />
            </div>
          </div>

          <LogDetailDrawer
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onFilter={handleFilterFromDrawer}
            onFilterId={handleFilterIdFromDrawer}
            onAroundLog={handleAroundLog}
            onViewFullTrace={handleViewFullTrace}
          />

          <SearchGuideDrawer
            isOpen={guideOpen}
            onClose={() => setGuideOpen(false)}
            onTryQuery={handleTryQuery}
          />
        </>
      )}
    </div>
  );
};

export default LogViewerPage;
