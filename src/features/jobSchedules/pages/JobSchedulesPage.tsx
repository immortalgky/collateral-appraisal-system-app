import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import {
  useListJobSchedules,
  useUpdateJobSchedule,
  type JobScheduleDto,
  type UpdateJobScheduleBody,
} from '../api/jobSchedules';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none';

// A standard 5-field cron. The server is the authority — Hangfire parses the expression and the
// endpoint rejects a bad one — so this only catches the obvious shape mistake before a round trip.
const FIELD_COUNT_OK = (cron: string) => {
  const fields = cron.trim().split(/\s+/).filter(Boolean).length;
  return fields === 5 || fields === 6;
};

// ──────────────────────────────────────────────────────────────────────────────
// Edit modal
// ──────────────────────────────────────────────────────────────────────────────

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobScheduleDto | null;
  onSave: (jobId: string, body: UpdateJobScheduleBody) => void;
  isSaving: boolean;
}

function EditModal({ isOpen, onClose, job, onSave, isSaving }: EditModalProps) {
  const { t } = useTranslation('jobSchedules');
  const [cronExpression, setCronExpression] = useState('');
  const [timeZoneId, setTimeZoneId] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    setCronExpression(job?.effectiveCron ?? '');
    setTimeZoneId(job?.timeZoneId ?? '');
    setIsEnabled(job?.isEnabled ?? true);
  }, [job, isOpen]);

  if (!job) return null;

  const handleSave = () => {
    const cron = cronExpression.trim();
    if (!cron) {
      toast.error(t('validation.cronRequired'));
      return;
    }
    if (!FIELD_COUNT_OK(cron)) {
      toast.error(t('validation.cronShape'));
      return;
    }
    onSave(job.jobId, {
      cronExpression: cron,
      // Empty means "use the application timezone" — send null, not "".
      timeZoneId: timeZoneId.trim() || null,
      isEnabled,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('modal.title')} size="md">
      <div className="space-y-4 p-6">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">{t('fields.jobId')}</p>
          <p className="font-mono text-sm text-gray-900">{job.jobId}</p>
          {job.description && <p className="mt-1 text-xs text-gray-500">{job.description}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('fields.cronExpression')}
          </label>
          <input
            type="text"
            value={cronExpression}
            onChange={e => setCronExpression(e.target.value)}
            className={inputClass + ' font-mono'}
          />
          <p className="mt-1 text-xs text-gray-400">
            {t('hints.default')} <span className="font-mono">{job.defaultCron}</span>
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('fields.timeZoneId')}
          </label>
          <input
            type="text"
            value={timeZoneId}
            onChange={e => setTimeZoneId(e.target.value)}
            placeholder={t('fields.timeZonePlaceholder', { timeZone: job.effectiveTimeZoneId })}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">{t('hints.timeZone')}</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={e => setIsEnabled(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary/20"
          />
          {t('fields.isEnabled')}
        </label>
        <p className="text-xs text-gray-400">{t('hints.isEnabled')}</p>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('common:actions.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type="button" onClick={handleSave} isLoading={isSaving}>
            {t('common:actions.save', { defaultValue: 'Save' })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

const JobSchedulesPage = () => {
  const { t } = useTranslation('jobSchedules');
  const [editing, setEditing] = useState<JobScheduleDto | null>(null);
  const modal = useDisclosure();

  const { data: jobs = [], isLoading } = useListJobSchedules();
  const update = useUpdateJobSchedule();

  const byModule = useMemo(() => {
    const map = new Map<string, JobScheduleDto[]>();
    for (const job of jobs) {
      const bucket = map.get(job.module);
      if (bucket) bucket.push(job);
      else map.set(job.module, [job]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [jobs]);

  const handleEdit = (job: JobScheduleDto) => {
    setEditing(job);
    modal.onOpen();
  };

  const handleSave = (jobId: string, body: UpdateJobScheduleBody) => {
    update.mutate(
      { jobId, body },
      {
        onSuccess: () => {
          toast.success(t('toasts.updated'));
          modal.onClose();
        },
        onError: (err: unknown) => {
          // The endpoint returns the Hangfire cron-parse message verbatim — show it.
          const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.saveFailed'));
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{t('page.title')}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{t('page.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : jobs.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">{t('page.empty')}</p>
      ) : (
        byModule.map(([module, rows]) => (
          <div key={module} className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <p className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-500">
              {module}
            </p>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr>
                  {[
                    t('table.job'),
                    t('table.schedule'),
                    t('table.timeZone'),
                    t('table.status'),
                    '',
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400 last:w-16"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map(job => (
                  <tr
                    key={job.jobId}
                    className={job.isEnabled ? 'hover:bg-gray-50' : 'bg-gray-50/60'}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-xs font-medium text-gray-900">{job.jobId}</p>
                      {job.description && (
                        <p className="mt-0.5 max-w-md text-xs text-gray-500">{job.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="font-mono text-sm text-gray-800">{job.effectiveCron}</span>
                      {job.isOverridden && (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
                          {t('table.overridden')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600">
                      {job.effectiveTimeZoneId}
                      {!job.timeZoneId && (
                        <span className="ml-1 text-gray-400">({t('table.appDefault')})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          job.isEnabled
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {job.isEnabled ? t('status.enabled') : t('status.disabled')}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => handleEdit(job)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        aria-label={t('actions.edit')}
                      >
                        <Icon name="pen" style="solid" className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <EditModal
        isOpen={modal.isOpen}
        onClose={modal.onClose}
        job={editing}
        onSave={handleSave}
        isSaving={update.isPending}
      />
    </div>
  );
};

export default JobSchedulesPage;
