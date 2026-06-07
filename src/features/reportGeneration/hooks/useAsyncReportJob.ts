import { useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  enqueueReportJob,
  getReportJob,
  downloadReportJobPdf,
  reportKeys,
} from '../api/reports';
import type { ReportJobDetail } from '../api/reports';
import { useReportJobsStore } from '../store/reportJobsStore';
import type { TrackedReportJob } from '../store/reportJobsStore';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers (exported so the reconciler can reuse them)
// ──────────────────────────────────────────────────────────────────────────────

export function isTerminalJobStatus(status: string | undefined): boolean {
  return status === 'Completed' || status === 'Failed';
}

/**
 * Open a completed job's PDF in a new tab.
 * Revokes the object URL after 60 s to avoid memory leaks.
 */
export async function openJobPdf(jobId: string): Promise<void> {
  const blob = await downloadReportJobPdf(jobId);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Idempotent resolution — first-channel-wins.
 *
 * Both the polling channel (useJobPoller) and the realtime channel
 * (useReportJobReconciler) call this. The `resolved` flag in the store is a
 * one-way latch: whichever channel sets it first wins and fires the side-effect;
 * the second caller finds `resolved === true` and returns immediately.
 *
 * The update is intentionally written to the Zustand store via getState() so
 * it works outside of React render cycles (e.g. from a SignalR handler).
 */
export function resolveJob(
  jobId: string,
  status: 'Completed' | 'Failed',
  opts: { autoOpen: boolean; error?: string | null },
): void {
  const store = useReportJobsStore.getState();
  const job = store.get(jobId);
  if (!job || job.resolved) return;

  // Claim the resolution slot before firing async side-effects so the second
  // concurrent call sees resolved=true even if the first is still in the
  // download await.
  store.update(jobId, { status: status === 'Completed' ? 'Ready' : 'Failed', resolved: true });

  if (status === 'Completed') {
    if (opts.autoOpen) {
      openJobPdf(jobId).catch(() => {
        toast.error('Report ready but failed to open. Check the notification bell.');
      });
    } else {
      toast.success('Report is ready. Click the notification bell to download.');
    }
  } else {
    const msg = opts.error ?? 'Report generation failed.';
    store.update(jobId, { error: msg });
    toast.error(msg);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Per-job polling component (mounted inside ReportActionButtons)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Polls a single job until it reaches a terminal status, then calls resolveJob.
 * Designed to be rendered as a zero-output component so polling starts as soon
 * as the job is tracked without requiring a parent re-render.
 */
export function JobPoller({ jobId, job }: { jobId: string; job: TrackedReportJob }) {
  const { data } = useQuery<ReportJobDetail>({
    queryKey: reportKeys.job(jobId),
    queryFn: () => getReportJob(jobId),
    enabled: !job.resolved && !isTerminalJobStatus(job.status),
    refetchInterval: query => {
      const status = (query.state.data as ReportJobDetail | undefined)?.status;
      return isTerminalJobStatus(status) ? false : 2500;
    },
    retry: 1,
  });

  // Track the last-seen jobId so the effect only fires when the terminal data
  // arrives, not on every render.
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (!data || !isTerminalJobStatus(data.status) || resolvedRef.current) return;
    resolvedRef.current = true;
    resolveJob(data.jobId, data.status as 'Completed' | 'Failed', {
      autoOpen: job.autoOpen,
      error: data.errorMessage,
    });
  }, [data, job.autoOpen]);

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public hook
// ──────────────────────────────────────────────────────────────────────────────

export interface UseAsyncReportJobReturn {
  trigger: (
    reportTypeKey: string,
    entityId: string,
    opts: { autoOpen: boolean },
  ) => Promise<void>;
  /** Returns all tracked jobs for the given entityId. */
  jobsForEntity: (entityId: string) => TrackedReportJob[];
}

export function useAsyncReportJob(): UseAsyncReportJobReturn {
  const track = useReportJobsStore(s => s.track);
  const jobs = useReportJobsStore(s => s.jobs);

  const trigger = useCallback(
    async (
      reportTypeKey: string,
      entityId: string,
      opts: { autoOpen: boolean },
    ): Promise<void> => {
      try {
        const { jobId } = await enqueueReportJob(reportTypeKey, entityId);
        track({ jobId, reportTypeKey, entityId, status: 'Pending', autoOpen: opts.autoOpen });
        toast('Generating report…', { icon: '⏳' });
      } catch {
        toast.error('Failed to queue report generation.');
      }
    },
    [track],
  );

  const jobsForEntity = useCallback(
    (entityId: string): TrackedReportJob[] => {
      const result: TrackedReportJob[] = [];
      for (const job of jobs.values()) {
        if (job.entityId === entityId) result.push(job);
      }
      return result;
    },
    [jobs],
  );

  return { trigger, jobsForEntity };
}
