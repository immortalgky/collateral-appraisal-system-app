import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Icon from '@shared/components/Icon';
import Avatar from '@shared/components/Avatar';
import SortableTh from './SortableTh';
import type { MonitoredPerson, SortDir } from '../types';

interface PeopleMonitorTableProps {
  people: MonitoredPerson[];
  isLoading: boolean;
  sortBy?: string;
  sortDir?: SortDir;
  onSortChange?: (sortKey: string | undefined, sortDir: SortDir | undefined) => void;
}

function PeopleMonitorTable({
  people,
  isLoading,
  sortBy,
  sortDir,
  onSortChange,
}: PeopleMonitorTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('taskMonitor');

  const COLUMNS: { key: string; label: string; sortKey?: string; numeric?: boolean }[] = [
    { key: 'userName', label: t('peopleColumns.userCode'), sortKey: 'UserName' },
    { key: 'displayName', label: t('peopleColumns.userName'), sortKey: 'DisplayName' },
    { key: 'openTasks', label: t('peopleColumns.openTasks'), sortKey: 'OpenTasks', numeric: true },
    {
      key: 'availableTasks',
      label: t('peopleColumns.availableTasks'),
      sortKey: 'AvailableTasks',
      numeric: true,
    },
    {
      key: 'totalTasks',
      label: t('peopleColumns.totalTasks'),
      sortKey: 'TotalTasks',
      numeric: true,
    },
  ];

  if (!isLoading && people.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-24 gap-4">
        <div className="size-16 rounded-2xl bg-(--palette-surface-2) border border-(--palette-line-soft) flex items-center justify-center">
          <Icon style="regular" name="users" className="size-7 text-(--palette-gray-300)" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-(--palette-ink)">{t('empty.peopleTitle')}</p>
          <p className="text-xs text-(--palette-gray-400) mt-1">{t('empty.peopleDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full min-w-max text-table">
        <thead className="sticky top-0 z-20">
          <tr className="bg-(--palette-surface-2) border-b border-(--palette-line)">
            {COLUMNS.map(col => (
              <SortableTh
                key={col.key}
                label={col.label}
                sortKey={col.sortKey}
                activeSortKey={sortBy}
                activeSortDir={sortDir}
                onSortChange={onSortChange}
                className={col.numeric ? 'text-right' : 'text-left'}
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-(--palette-line-soft)">
          {isLoading ? (
            <TableRowSkeleton columns={COLUMNS.map(() => ({ width: 'w-24' }))} rows={8} />
          ) : (
            people.map(person => {
              const to = `/task-monitor/${encodeURIComponent(person.userName)}`;
              const linkState = { displayName: person.displayName ?? person.userName };
              return (
                <tr
                  key={person.userName}
                  onClick={() => navigate(to, { state: linkState })}
                  className="group hover:bg-(--palette-surface-2) transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-xs text-(--palette-gray-500) font-mono">
                    {person.userName}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={to}
                      state={linkState}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-2 group-hover:text-(--palette-primary-text)"
                    >
                      <Avatar name={person.displayName || person.userName} size="sm" />
                      <span className="text-table font-medium text-(--palette-ink) truncate max-w-[220px]">
                        {person.displayName || person.userName}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-table text-(--palette-ink)">
                    {person.openTasks}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-table text-(--palette-ink)">
                    {person.availableTasks}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-table text-(--palette-ink) font-semibold">
                    {person.totalTasks}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default PeopleMonitorTable;
