import { create } from 'zustand';
import {
  downloadReportJobPdf,
  enqueueReportJob,
  getReportJob,
} from '@features/reportGeneration/api/reports';

const REPORT_TYPE_KEY = 'appraisal-book';
const POLL_INTERVAL_MS = 2500;

export type ReportPreviewStatus = 'idle' | 'generating' | 'ready' | 'error';

export interface ReportPreviewEntry {
  status: ReportPreviewStatus;
  /** Object URL of the rendered PDF blob when status === 'ready'. */
  objectUrl: string | null;
}

// Per-appraisal poll timers, module-level so they survive component unmounts — the render keeps
// being polled across navigation, which is the whole point. Used to cancel a stale poll when a
// regenerate is triggered for the same appraisal.
const pollTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface ReportPreviewStore {
  /** appraisalId → preview entry */
  previews: Map<string, ReportPreviewEntry>;
  /**
   * Fire-and-forget generation of the appraisal-book preview via the ASYNC report job
   * (enqueue → poll → download). The Hangfire job renders in the background with no HTTP timeout;
   * the poll loop lives here in the store module (not in any component), so the render is tracked
   * to completion and the result lands here even if the user navigates away and back.
   * (This uses the standard job path, so the completion bell notification still fires — accepted.)
   */
  generate: (appraisalId: string) => void;
}

function setEntry(
  previews: Map<string, ReportPreviewEntry>,
  appraisalId: string,
  entry: ReportPreviewEntry,
): Map<string, ReportPreviewEntry> {
  const next = new Map(previews);
  next.set(appraisalId, entry);
  return next;
}

export const useReportPreviewStore = create<ReportPreviewStore>((set, get) => {
  const setStatus = (appraisalId: string, entry: ReportPreviewEntry) =>
    set(state => ({ previews: setEntry(state.previews, appraisalId, entry) }));

  const poll = (appraisalId: string, jobId: string) => {
    const timer = setTimeout(async () => {
      try {
        const job = await getReportJob(jobId);
        if (job.status === 'Completed') {
          pollTimers.delete(appraisalId);
          const blob = await downloadReportJobPdf(jobId);
          setStatus(appraisalId, { status: 'ready', objectUrl: URL.createObjectURL(blob) });
        } else if (job.status === 'Failed') {
          pollTimers.delete(appraisalId);
          setStatus(appraisalId, { status: 'error', objectUrl: null });
        } else {
          poll(appraisalId, jobId); // still Pending/Running — keep polling
        }
      } catch {
        pollTimers.delete(appraisalId);
        setStatus(appraisalId, { status: 'error', objectUrl: null });
      }
    }, POLL_INTERVAL_MS);
    pollTimers.set(appraisalId, timer);
  };

  return {
    previews: new Map(),

    generate: appraisalId => {
      if (!appraisalId) return;
      // Don't launch a second render while one is already in flight for this appraisal.
      if (get().previews.get(appraisalId)?.status === 'generating') return;

      // Cancel any stale poll and revoke the previous PDF before regenerating.
      const existingTimer = pollTimers.get(appraisalId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        pollTimers.delete(appraisalId);
      }
      const prevUrl = get().previews.get(appraisalId)?.objectUrl;
      if (prevUrl) URL.revokeObjectURL(prevUrl);

      setStatus(appraisalId, { status: 'generating', objectUrl: null });

      void (async () => {
        try {
          const { jobId } = await enqueueReportJob(REPORT_TYPE_KEY, appraisalId);
          poll(appraisalId, jobId);
        } catch {
          setStatus(appraisalId, { status: 'error', objectUrl: null });
        }
      })();
    },
  };
});
