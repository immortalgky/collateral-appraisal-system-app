import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Dropdown from '@shared/components/inputs/Dropdown';
import Switch from '@shared/components/inputs/Switch';
import type { JobScheduleDto, UpdateJobScheduleBody } from '../api/jobSchedules';
import { describeCron } from '../utils/cron';

// A standard 5-field cron. The server is the authority — Hangfire parses the expression and the
// endpoint rejects a bad one — so this only catches the obvious shape mistake before a round trip.
const FIELD_COUNT_OK = (cron: string) => {
  const fields = cron.trim().split(/\s+/).filter(Boolean).length;
  return fields === 5 || fields === 6;
};

// The Dropdown has no "empty" option value, so the application default travels as this and is sent as null.
const APP_DEFAULT = '__app-default__';

/**
 * Every zone the browser knows, and always UTC (Chromium's list leaves it out); older engines get
 * Bangkok as well. Read once, not on each render.
 */
const TIME_ZONES: string[] = (() => {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: 'timeZone') => string[] }
  ).supportedValuesOf?.('timeZone') ?? ['Asia/Bangkok'];
  return supported.includes('UTC') ? supported : [...supported, 'UTC'];
})();

interface JobScheduleEditorProps {
  job: JobScheduleDto;
  onCancel: () => void;
  onSave: (body: UpdateJobScheduleBody) => void;
  isSaving: boolean;
}

/**
 * The edit form a job row expands into. Mounted fresh for each job it opens on (the page keys it by
 * job id), so its fields start from that job's values with no reset effect.
 */
const JobScheduleEditor = ({ job, onCancel, onSave, isSaving }: JobScheduleEditorProps) => {
  const { t } = useTranslation('jobSchedules');
  const [cronExpression, setCronExpression] = useState(job.effectiveCron);
  const [timeZoneId, setTimeZoneId] = useState(job.timeZoneId ?? APP_DEFAULT);
  const [isEnabled, setIsEnabled] = useState(job.isEnabled);

  const reading = describeCron(cronExpression, t);
  const defaultReading = describeCron(job.defaultCron, t);
  const timeZoneOptions = useMemo(
    () => [
      {
        value: APP_DEFAULT,
        // With no override of its own, the job runs in the application zone: name it.
        label: job.timeZoneId
          ? t('fields.timeZoneDefault')
          : t('fields.timeZoneDefaultWith', { timeZone: job.effectiveTimeZoneId }),
      },
      // The job's own zone may be one this browser does not list (a Windows id, say).
      ...(job.timeZoneId && !TIME_ZONES.includes(job.timeZoneId) ? [job.timeZoneId] : [])
        .concat(TIME_ZONES)
        .map(id => ({ value: id, label: id })),
    ],
    [job.timeZoneId, job.effectiveTimeZoneId, t],
  );

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
    onSave({
      cronExpression: cron,
      // The application timezone is sent as null, not "".
      timeZoneId: timeZoneId === APP_DEFAULT ? null : timeZoneId,
      isEnabled,
    });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 border-b border-primary-100 bg-primary-50 px-4 pt-3.5 pb-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]">
      <div>
        <Input
          label={t('fields.cronExpression')}
          value={cronExpression}
          onChange={e => setCronExpression(e.target.value)}
          className="font-mono"
          disabled={isSaving}
        />
        <p className="mt-1.5 min-h-[1.5rem] text-xs text-primary-700">
          {reading && (
            <>
              {t('hints.reads')} <b className="font-semibold">{reading}</b>
            </>
          )}
        </p>
        <p className="text-xs text-gray-500">
          {t('hints.default')} <span className="font-mono">{job.defaultCron}</span>
          {defaultReading && ` (${defaultReading})`}
          {cronExpression.trim() !== job.defaultCron && (
            <>
              {' · '}
              <button
                type="button"
                onClick={() => setCronExpression(job.defaultCron)}
                disabled={isSaving}
                className="font-medium text-primary hover:underline disabled:opacity-50"
              >
                {t('actions.resetDefault')}
              </button>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <Dropdown
          label={t('fields.timeZoneId')}
          options={timeZoneOptions}
          value={timeZoneId}
          onChange={(value: string) => setTimeZoneId(value)}
          disabled={isSaving}
          showPlaceholderOption={false}
          showValuePrefix={false}
        />
        <div>
          <Switch
            variant="primary"
            size="sm"
            label={t('fields.isEnabled')}
            checked={isEnabled}
            onChange={setIsEnabled}
            disabled={isSaving}
          />
          <p className="mt-0.5 text-xs text-gray-500">{t('hints.isEnabled')}</p>
        </div>
      </div>

      <div className="flex gap-2 lg:pt-5">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          {t('common:actions.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button onClick={handleSave} isLoading={isSaving}>
          {t('common:actions.save', { defaultValue: 'Save' })}
        </Button>
      </div>
    </div>
  );
};

export default JobScheduleEditor;
