import { create } from 'zustand';
import type { ReportJobStatus } from '../api/reports';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface TrackedReportJob {
  jobId: string;
  reportTypeKey: string;
  entityId: string;
  /** Current status as known to the client (Pending → Running → Completed/Failed). */
  status: ReportJobStatus | 'Ready';
  /** Original filename from the ReportReady notification metadata, if available. */
  fileName?: string | null;
  /** If true, the PDF should be opened in a new tab when the job completes. */
  autoOpen: boolean;
  /** Set to true the first time this job is resolved (Completed or Failed) so that
   *  the realtime channel and the polling channel cannot both fire the side-effects. */
  resolved: boolean;
  /** Surfaced error message for Failed jobs. */
  error?: string | null;
}

type TrackedJobPatch = Partial<Omit<TrackedReportJob, 'jobId'>>;

interface ReportJobsStore {
  /** jobId → tracked job entry */
  jobs: Map<string, TrackedReportJob>;
  /** Add or replace a job entry. */
  track: (job: Omit<TrackedReportJob, 'resolved'>) => void;
  /** Shallow-patch a tracked job by jobId. No-op if the job is not tracked. */
  update: (jobId: string, patch: TrackedJobPatch) => void;
  /** Remove a job from tracking. */
  remove: (jobId: string) => void;
  /** Return the tracked entry or undefined. */
  get: (jobId: string) => TrackedReportJob | undefined;
}

// ──────────────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────────────

export const useReportJobsStore = create<ReportJobsStore>((set, get) => ({
  jobs: new Map(),

  track: job => {
    set(state => {
      const next = new Map(state.jobs);
      next.set(job.jobId, { ...job, resolved: false });
      return { jobs: next };
    });
  },

  update: (jobId, patch) => {
    set(state => {
      const existing = state.jobs.get(jobId);
      if (!existing) return state;
      const next = new Map(state.jobs);
      next.set(jobId, { ...existing, ...patch });
      return { jobs: next };
    });
  },

  remove: jobId => {
    set(state => {
      const next = new Map(state.jobs);
      next.delete(jobId);
      return { jobs: next };
    });
  },

  get: jobId => get().jobs.get(jobId),
}));
