import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Pagination from '@shared/components/Pagination';
import Icon from '@shared/components/Icon';
import Avatar from '@shared/components/Avatar';
import useBreadcrumbExtras from '@shared/hooks/useBreadcrumbExtras';

import { useMonitoredTasks } from '../api/taskMonitor';
import TaskMonitorTable from '../components/TaskMonitorTable';
import ReassignTaskModal from '../components/ReassignTaskModal';
import PersonTasksFilter from '../components/PersonTasksFilter';
import type { PersonTasksFilterValues } from '../components/PersonTasksFilter';
import type { GetMonitoredTasksParams, MonitoredTask, SortDir } from '../types';

function PersonTasksPage() {
  const { username = '' } = useParams<{ username: string }>();
  const location = useLocation();
  const { t } = useTranslation(['taskMonitor', 'nav']);

  // Initial display name preference: location.state (set by PeopleMonitorTable link),
  // falling back to the username from the URL. We then upgrade this when task rows
  // arrive — but never downgrade it back to the bare username, so an active filter
  // returning 0 rows can't flip the header/breadcrumb to the user code.
  const initialDisplayName =
    (location.state as { displayName?: string } | null)?.displayName ?? username;
  const [stableDisplayName, setStableDisplayName] = useState<string>(initialDisplayName);

  const [filters, setFilters] = useState<PersonTasksFilterValues>({});
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<SortDir | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<MonitoredTask | null>(null);
  const [isReassignOpen, setIsReassignOpen] = useState(false);

  const handleSortChange = (key: string | undefined, dir: SortDir | undefined) => {
    setSortBy(key);
    setSortDir(dir);
    setPageNumber(0);
  };

  const queryParams: GetMonitoredTasksParams = {
    assigneeUsername: username,
    ...filters,
    sortBy,
    sortDir,
    page: pageNumber,
    pageSize,
  };

  const { data, isLoading, isError, error } = useMonitoredTasks(queryParams);

  const tasks = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Upgrade the stable display name once a real one arrives from the task rows.
  // Never downgrade back to the username — keeps the header/breadcrumb stable
  // when filters return zero rows.
  const fromRowDisplayName = tasks[0]?.assignedToDisplayName;
  useEffect(() => {
    if (fromRowDisplayName && fromRowDisplayName !== stableDisplayName) {
      setStableDisplayName(fromRowDisplayName);
    }
  }, [fromRowDisplayName, stableDisplayName]);

  const displayName = stableDisplayName;

  // Provide both the parent ("Task Monitor") and the leaf (person's name) crumbs
  // ourselves. The layout's breadcrumb seeding walks the DB-driven menu for ancestors
  // and `/task-monitor` is not always present there, so on a fresh load / refresh the
  // parent crumb would otherwise be missing. Layout dedupes adjacent same-label crumbs,
  // so soft-nav from `/task-monitor` doesn't double-render.
  useBreadcrumbExtras(
    [
      { label: t('nav:taskMonitor.title'), href: '/task-monitor', icon: 'people-arrows' },
      { label: displayName, href: location.pathname, icon: 'user' },
    ],
    [displayName, location.pathname],
  );

  const handleFiltersChange = (next: PersonTasksFilterValues) => {
    setFilters(next);
    setPageNumber(0);
  };

  const handleReassign = (task: MonitoredTask) => {
    setSelectedTask(task);
    setIsReassignOpen(true);
  };

  const handleReassignClose = () => {
    setIsReassignOpen(false);
    setSelectedTask(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* ── Header ── */}
      <div className="shrink-0 mb-3 flex items-center gap-3">
        <Avatar name={displayName} size="md" />
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{displayName}</h2>
          <p className="text-xs text-gray-500 font-mono">{username}</p>
        </div>
        {!isLoading && totalCount > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full tabular-nums">
            {totalCount}
          </span>
        )}
      </div>

      {/* ── Filter ── */}
      <div className="shrink-0 mb-3">
        <PersonTasksFilter value={filters} onChange={handleFiltersChange} />
      </div>

      {/* ── Error state ── */}
      {isError && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
            <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">{t('errors.loadTasksFailed')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{(error as Error)?.message}</p>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {!isError && (
        <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <TaskMonitorTable
            tasks={tasks}
            isLoading={isLoading}
            onReassign={handleReassign}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={handleSortChange}
          />

          <Pagination
            currentPage={pageNumber}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPageNumber}
            onPageSizeChange={size => {
              setPageSize(size);
              setPageNumber(0);
            }}
          />
        </div>
      )}

      {/* ── Reassign modal ── */}
      <ReassignTaskModal
        task={selectedTask}
        isOpen={isReassignOpen}
        onClose={handleReassignClose}
      />
    </div>
  );
}

export default PersonTasksPage;
