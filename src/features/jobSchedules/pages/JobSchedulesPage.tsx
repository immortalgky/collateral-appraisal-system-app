import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import CountTabs from '@shared/components/CountTabs';
import DataErrorState from '@shared/components/DataErrorState';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';
import Dropdown from '@shared/components/inputs/Dropdown';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import { useNow } from '@shared/hooks/useNow';
import {
  useListJobSchedules,
  useUpdateJobSchedule,
  type JobScheduleDto,
  type UpdateJobScheduleBody,
} from '../api/jobSchedules';
import JobScheduleEditor from '../components/JobScheduleEditor';
import { describeCron } from '../utils/cron';
import { formatJobTime, formatTimeUntil } from '../utils/jobTimes';

const ALL = 'all';
const COLUMN_COUNT = 5;

type JobTab = typeof ALL | 'overridden' | 'disabled' | 'failed';

const TABLE_SKELETON_COLUMNS = [
  { width: 'w-56' },
  { width: 'w-40' },
  { width: 'w-28' },
  { width: 'w-28' },
  { width: 'w-6' },
];

const thClass = 'px-4 py-2.5 text-left text-xs font-semibold text-(--palette-gray-600)';

// Hangfire job states we have a word for; any other state is shown as it comes, with a grey dot.
const STATE_LABEL_KEYS = {
  Failed: 'lastRun.failed',
  Processing: 'lastRun.processing',
  Scheduled: 'lastRun.scheduled',
  Enqueued: 'lastRun.enqueued',
  Awaiting: 'lastRun.awaiting',
  Deleted: 'lastRun.deleted',
} as const;
const STATE_DOT: Record<keyof typeof STATE_LABEL_KEYS, string> = {
  Failed: 'bg-red-500',
  Processing: 'bg-amber-500',
  Scheduled: 'bg-gray-300',
  Enqueued: 'bg-gray-300',
  Awaiting: 'bg-gray-300',
  Deleted: 'bg-gray-300',
};

/**
 * The application's own zone: the effective zone of a job with no override of its own. Undefined when
 * every job has an override — the default is then unknown, and every row names its zone.
 */
const appTimeZone = (jobs: JobScheduleDto[]): string | undefined =>
  jobs.find(j => !j.timeZoneId)?.effectiveTimeZoneId;

const matchesTab = (job: JobScheduleDto, tab: JobTab) =>
  tab === ALL ||
  (tab === 'overridden' && job.isOverridden) ||
  (tab === 'disabled' && !job.isEnabled) ||
  (tab === 'failed' && job.lastJobState === 'Failed');

const JobSchedulesPage = () => {
  const { t, i18n } = useTranslation('jobSchedules');
  const [tab, setTab] = useState<JobTab>(ALL);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState(ALL);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useListJobSchedules(editingId === null);
  const jobs = data ?? [];
  const update = useUpdateJobSchedule();
  const now = useNow();

  const term = search.trim().toLowerCase();
  const inScope = jobs.filter(
    job =>
      (module === ALL || job.module === module) &&
      (!term ||
        job.jobId.toLowerCase().includes(term) ||
        (job.description ?? '').toLowerCase().includes(term)),
  );
  // The row being edited stays whatever the filters say (tab, search, module), so its editor never
  // unmounts mid-edit.
  const visible = jobs.filter(
    job => job.jobId === editingId || (inScope.includes(job) && matchesTab(job, tab)),
  );
  // Counts need a list to count; a failed background refresh keeps the last one.
  const countsKnown = data !== undefined;
  // Only a failed Hangfire read sets this false: the run info (and so the failed count) is then unknown.
  const runInfoUnavailable = jobs.some(job => !job.runInfoAvailable);
  // The job being edited is gone after a refetch: stop "editing" it, so polling resumes.
  if (editingId && data && !jobs.some(job => job.jobId === editingId)) setEditingId(null);
  const countOf = (value: JobTab) => inScope.filter(job => matchesTab(job, value)).length;

  const byModule = new Map<string, JobScheduleDto[]>();
  for (const job of visible) byModule.set(job.module, [...(byModule.get(job.module) ?? []), job]);
  const defaultZone = appTimeZone(jobs);
  const groups = [...byModule.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const moduleOptions = [
    { value: ALL, label: t('filters.allModules') },
    ...[...new Set(jobs.map(job => job.module))].sort().map(name => ({ value: name, label: name })),
  ];

  const tabs = [
    { value: ALL, label: t('tabs.all'), count: countsKnown ? countOf(ALL) : undefined },
    {
      value: 'overridden',
      label: t('tabs.overridden'),
      count: countsKnown ? countOf('overridden') : undefined,
    },
    {
      value: 'disabled',
      label: t('tabs.disabled'),
      count: countsKnown ? countOf('disabled') : undefined,
    },
    {
      value: 'failed',
      label: t('tabs.failed'),
      count: countsKnown && !runInfoUnavailable ? countOf('failed') : undefined,
      tone: 'red',
    },
  ] as const;

  const handleSave = (jobId: string, body: UpdateJobScheduleBody) => {
    update.mutate(
      { jobId, body },
      {
        onSuccess: () => {
          toast.success(t('toasts.updated'));
          setEditingId(null);
        },
        onError: (err: unknown) => {
          // The endpoint returns the Hangfire cron-parse message verbatim — show it.
          const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.saveFailed'));
        },
      },
    );
  };

  // When there is nothing to read in the last-run cell, why: one "—" carrying this as its title.
  const lastRunDashTitle = (job: JobScheduleDto) =>
    // Hangfire could not be read: nothing about the run is known.
    !job.runInfoAvailable
      ? t('lastRun.unavailable')
      : // A disabled job is removed from Hangfire, so there is no record to read — not "never run".
        !job.isEnabled && !job.lastExecution
        ? t('lastRun.disabledHint')
        : null;

  const lastRunLine = (job: JobScheduleDto) => {
    if (!job.lastExecution)
      return { dot: 'bg-gray-300', text: t('lastRun.never'), title: undefined };
    switch (job.lastJobState) {
      case 'Succeeded':
        return {
          dot: 'bg-green-600',
          text:
            job.lastDurationMs != null
              ? t('lastRun.succeededIn', { s: (job.lastDurationMs / 1000).toFixed(2) })
              : t('lastRun.succeeded'),
          title: undefined,
        };
      case null:
        return { dot: 'bg-gray-300', text: t('lastRun.expired'), title: t('lastRun.expiredHint') };
      default: {
        const known = job.lastJobState in STATE_LABEL_KEYS;
        const state = job.lastJobState as keyof typeof STATE_LABEL_KEYS;
        return {
          dot: known ? STATE_DOT[state] : 'bg-gray-300',
          text: known ? t(STATE_LABEL_KEYS[state]) : job.lastJobState,
          title: undefined,
        };
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-64 flex-1">
          <h2 className="text-base font-semibold text-(--palette-ink)">{t('page.title')}</h2>
          <p className="mt-0.5 text-xs text-(--palette-gray-500)">{t('page.subtitle')}</p>
        </div>
        <Link
          to="/admin/hangfire"
          className="inline-flex items-center gap-1.5 rounded-md border border-(--palette-line-strong) px-3 py-1.5 text-xs font-medium text-(--palette-ink) hover:bg-(--palette-surface-2)"
        >
          {t('page.hangfireLink')}
          <Icon name="arrow-up-right-from-square" style="regular" className="text-xs" />
        </Link>
      </div>

      {runInfoUnavailable && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-amber-200 bg-(--palette-warn-wash) px-3 py-1.5 text-xs text-(--palette-ink)"
        >
          <span className="font-semibold text-amber-700 dark:text-amber-300">
            {t('page.runInfoUnavailable')}
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-(--palette-line) bg-(--palette-surface)">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-(--palette-line-soft) px-4 py-2.5">
          <CountTabs tabs={tabs} value={tab} onChange={setTab} label={t('tabs.label')} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="w-60">
              <Input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('filters.searchPlaceholder')}
                aria-label={t('filters.searchPlaceholder')}
                leftIcon={<Icon name="magnifying-glass" style="regular" className="text-sm" />}
              />
            </div>
            <div className="w-40">
              <Dropdown
                options={moduleOptions}
                value={module}
                onChange={(value: string) => setModule(value)}
                showPlaceholderOption={false}
                showValuePrefix={false}
                aria-label={t('filters.moduleLabel')}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-table">
            <thead className="bg-(--palette-surface-2)">
              <tr className="border-b border-(--palette-line)">
                <th className={thClass}>{t('table.job')}</th>
                <th className={`${thClass} w-60`}>{t('table.schedule')}</th>
                <th className={`${thClass} w-52`}>{t('table.lastRun')}</th>
                <th className={`${thClass} w-48`}>{t('table.nextRun')}</th>
                <th className="w-14 px-4 py-2.5">
                  <span className="sr-only">{t('actions.edit')}</span>
                </th>
              </tr>
            </thead>
            {isLoading ? (
              <tbody>
                <TableRowSkeleton columns={TABLE_SKELETON_COLUMNS} rows={6} />
              </tbody>
            ) : isError && !data ? (
              <tbody>
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-4">
                    <DataErrorState
                      variant="inline"
                      title={t('page.loadFailed')}
                      onRetry={refetch}
                    />
                  </td>
                </tr>
              </tbody>
            ) : visible.length === 0 ? (
              <tbody>
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="py-12 text-center text-sm text-(--palette-gray-400)"
                  >
                    {jobs.length === 0
                      ? t('page.empty')
                      : tab === 'failed' && runInfoUnavailable
                        ? t('page.failedUnknown')
                        : t('page.emptyFiltered')}
                  </td>
                </tr>
              </tbody>
            ) : (
              groups.map(([name, rows]) => (
                <tbody key={name} className="divide-y divide-(--palette-line-soft)">
                  <tr className="border-b border-(--palette-line-soft)">
                    <th
                      colSpan={COLUMN_COUNT}
                      scope="colgroup"
                      className="px-4 pt-3.5 pb-1.5 text-left text-sm font-semibold text-(--palette-gray-600)"
                    >
                      {name}
                      <span className="ml-2 text-xs font-normal text-(--palette-gray-400)">
                        {t('table.jobCount', { count: rows.length })}
                      </span>
                    </th>
                  </tr>
                  {rows.map(job => {
                    const editing = editingId === job.jobId;
                    const dashTitle = lastRunDashTitle(job);
                    const run = lastRunLine(job);
                    const reading = describeCron(job.effectiveCron, t);
                    // The zone is named only where it is not the application's own.
                    const zone =
                      job.effectiveTimeZoneId !== defaultZone
                        ? ` · ${job.effectiveTimeZoneId}`
                        : '';
                    return (
                      <Fragment key={job.jobId}>
                        <tr
                          className={clsx(
                            'align-top',
                            editing
                              ? 'border-b border-primary-100 bg-primary-50'
                              : job.isEnabled
                                ? 'hover:bg-(--palette-surface-2)'
                                : 'bg-(--palette-surface-2)/60',
                          )}
                        >
                          <td className="max-w-0 px-4 py-2.5">
                            <div className="font-mono text-xs font-medium text-(--palette-ink)">
                              {job.jobId}
                            </div>
                            {job.description && (
                              <div
                                className="truncate text-xs text-(--palette-gray-500)"
                                title={job.description}
                              >
                                {job.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="whitespace-nowrap">
                              {reading ?? (
                                <span className="font-mono text-xs">
                                  {job.effectiveCron}
                                  {zone}
                                </span>
                              )}
                              {job.isOverridden && (
                                <span
                                  className="ml-1.5 rounded bg-blue-50 dark:bg-blue-500/10 px-1.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                                  title={t('table.defaultWas', { cron: job.defaultCron })}
                                >
                                  {t('table.overridden')}
                                </span>
                              )}
                            </div>
                            {reading && (
                              <div className="font-mono text-xs text-(--palette-gray-500)">
                                {job.effectiveCron}
                                {zone}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {dashTitle ? (
                              <span className="text-(--palette-gray-400)" title={dashTitle}>
                                —
                              </span>
                            ) : (
                              <>
                                <div className="whitespace-nowrap tabular-nums">
                                  {job.lastExecution
                                    ? formatJobTime(job.lastExecution, now, t, i18n.language)
                                    : '—'}
                                </div>
                                <div
                                  className="whitespace-nowrap text-xs text-(--palette-gray-500)"
                                  title={run.title}
                                >
                                  {run.dot && (
                                    <span
                                      className={clsx(
                                        'mr-1.5 inline-block size-1.5 rounded-full align-middle',
                                        run.dot,
                                      )}
                                    />
                                  )}
                                  {run.text}
                                </div>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {!job.isEnabled ? (
                              <span className="text-(--palette-gray-400)">
                                {t('table.disabled')}
                              </span>
                            ) : !job.runInfoAvailable ? (
                              <span
                                className="text-(--palette-gray-400)"
                                title={t('lastRun.unavailable')}
                              >
                                —
                              </span>
                            ) : job.nextExecution ? (
                              <>
                                <div className="whitespace-nowrap tabular-nums">
                                  {formatJobTime(job.nextExecution, now, t, i18n.language)}
                                </div>
                                <div className="whitespace-nowrap text-xs text-(--palette-gray-500)">
                                  {formatTimeUntil(job.nextExecution, now, t)}
                                </div>
                              </>
                            ) : (
                              // Hangfire was read, and it has no next run for this enabled job.
                              <span
                                className="text-(--palette-gray-400)"
                                title={t('table.noNextRun')}
                              >
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-1.5 text-right">
                            <button
                              type="button"
                              onClick={() => setEditingId(editing ? null : job.jobId)}
                              // Not while a save is in flight: the editor must not close or move on mid-save.
                              disabled={update.isPending}
                              aria-expanded={editing}
                              aria-label={t('actions.edit')}
                              title={t('actions.edit')}
                              className={clsx(
                                'inline-flex size-7 items-center justify-center rounded-md hover:bg-primary/10 hover:text-(--palette-primary-text)',
                                editing
                                  ? 'bg-primary/10 text-(--palette-primary-text)'
                                  : 'text-(--palette-gray-400)',
                              )}
                            >
                              <Icon name="pen" style="regular" className="text-sm" />
                            </button>
                          </td>
                        </tr>
                        {editing && (
                          <tr>
                            <td colSpan={COLUMN_COUNT} className="p-0">
                              <JobScheduleEditor
                                key={job.jobId}
                                job={job}
                                onCancel={() => setEditingId(null)}
                                onSave={body => handleSave(job.jobId, body)}
                                isSaving={update.isPending}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              ))
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default JobSchedulesPage;
