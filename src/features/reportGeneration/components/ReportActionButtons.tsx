import { Fragment } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { fetchReportPdf } from '../api/reports';
import { useReportDefinitions } from '../hooks/useReportDefinitions';
import { useAsyncReportJob, JobPoller } from '../hooks/useAsyncReportJob';
import { useReportJobsStore } from '../store/reportJobsStore';
import type { TrackedReportJob } from '../store/reportJobsStore';

// ──────────────────────────────────────────────────────────────────────────────
// Status chip — non-blocking inline indicator
// ──────────────────────────────────────────────────────────────────────────────

function StatusChip({ job }: { job: TrackedReportJob }) {
  const status = job.status;

  if (status === 'Pending' || status === 'Running') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
        <svg className="animate-spin size-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Generating…
      </span>
    );
  }

  if (status === 'Ready') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
        <Icon name="circle-check" style="solid" className="size-3" />
        Ready
      </span>
    );
  }

  if (status === 'Failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600 border border-red-200">
        <Icon name="circle-xmark" style="solid" className="size-3" />
        Failed
      </span>
    );
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

interface ReportActionButtonsProps {
  reportTypeKey: string;
  entityId: string;
  /** Forwarded to the View button so callers can hook in additional side-effects. */
  onSyncBlobReady?: (blob: Blob, url: string) => void;
  className?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function ReportActionButtons({
  reportTypeKey,
  entityId,
  onSyncBlobReady,
  className,
}: ReportActionButtonsProps) {
  const { modeByKey, isLoading: isLoadingDefs } = useReportDefinitions();
  const { trigger, jobsForEntity } = useAsyncReportJob();
  const jobs = useReportJobsStore(s => s.jobs);

  // Pick the most recent job for this entity+type as the chip source
  const entityJobs = jobsForEntity(entityId).filter(
    j => j.reportTypeKey === reportTypeKey,
  );
  const latestJob = entityJobs.length > 0 ? entityJobs[entityJobs.length - 1] : null;

  const generationMode = modeByKey.get(reportTypeKey) ?? 'Sync';
  const isAsync = generationMode === 'Async';

  // Derive whether there is an in-progress job so we can disable the button
  const isEnqueuing =
    latestJob != null &&
    (latestJob.status === 'Pending' || latestJob.status === 'Running');

  async function handleView() {
    if (!entityId.trim()) {
      toast.error('Entity ID is required.');
      return;
    }
    if (isAsync) {
      await trigger(reportTypeKey, entityId, { autoOpen: true });
    } else {
      try {
        const blob = await fetchReportPdf(reportTypeKey, entityId);
        const url = URL.createObjectURL(blob);
        if (onSyncBlobReady) {
          onSyncBlobReady(blob, url);
        } else {
          window.open(url, '_blank', 'noopener');
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
      } catch {
        toast.error('Failed to load PDF. Check the ID and try again.');
      }
    }
  }

  async function handleGenerate() {
    if (!entityId.trim()) {
      toast.error('Entity ID is required.');
      return;
    }
    await trigger(reportTypeKey, entityId, { autoOpen: false });
  }

  return (
    <div className={clsx('flex items-center gap-2 flex-wrap', className)}>
      <Button
        variant="primary"
        size="sm"
        disabled={isLoadingDefs || isEnqueuing}
        onClick={handleView}
        leftIcon={<Icon name="eye" style="regular" className="size-3.5" />}
      >
        View
      </Button>

      {isAsync && (
        <Button
          variant="outline"
          size="sm"
          disabled={isEnqueuing}
          onClick={handleGenerate}
          leftIcon={<Icon name="arrow-down-to-line" style="regular" className="size-3.5" />}
        >
          Generate
        </Button>
      )}

      {latestJob != null && (
        <Fragment>
          <StatusChip job={latestJob} />
          {/* Mount a zero-output poller for every unresolved tracked job */}
          {Array.from(jobs.values())
            .filter(j => j.entityId === entityId && j.reportTypeKey === reportTypeKey && !j.resolved)
            .map(j => (
              <JobPoller key={j.jobId} jobId={j.jobId} job={j} />
            ))}
        </Fragment>
      )}
    </div>
  );
}

export default ReportActionButtons;
