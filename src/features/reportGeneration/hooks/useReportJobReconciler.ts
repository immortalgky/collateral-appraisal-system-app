import { useEffect } from 'react';
import { useAuthStore } from '@features/auth/store';
import * as appHub from '@shared/realtime/appHub';
import { listReportJobs } from '../api/reports';
import { useReportJobsStore } from '../store/reportJobsStore';
import { resolveJob, isTerminalJobStatus } from './useAsyncReportJob';
import type { Notification } from '@features/notification/types';

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────

/**
 * App-level hook — mount once near the app shell alongside useNotificationHub.
 *
 * Responsibilities:
 * 1. Realtime: subscribes to ReceiveNotification and resolves any tracked job
 *    when type === 'ReportReady' | 'ReportFailed'.
 * 2. Reconcile on reconnect: on every re-connect (not cold first connect),
 *    fetches /reports/jobs and resolves any tracked jobs that completed while
 *    the SignalR connection was down.
 * 3. Reconcile on mount: same reconcile pass so that jobs enqueued before a
 *    full page reload are resolved from the server's current state.
 */
export function useReportJobReconciler() {
  const username = useAuthStore(s => s.user?.username);

  // ── Realtime channel ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!username) return;

    const unsub = appHub.on<Notification>('ReceiveNotification', notification => {
      if (
        notification.type !== 'ReportReady' &&
        notification.type !== 'ReportFailed'
      ) {
        return;
      }

      const meta = notification.metadata ?? {};
      const jobId = typeof meta.jobId === 'string' ? meta.jobId : null;
      if (!jobId) return;

      const store = useReportJobsStore.getState();
      const job = store.get(jobId);
      if (!job) return;

      // Update fileName from notification metadata if available
      const fileName =
        typeof meta.fileName === 'string' ? meta.fileName : undefined;
      if (fileName) {
        store.update(jobId, { fileName });
      }

      resolveJob(
        jobId,
        notification.type === 'ReportReady' ? 'Completed' : 'Failed',
        { autoOpen: job.autoOpen },
      );
    });

    return unsub;
  }, [username]);

  // ── Reconcile on mount + reconnect ─────────────────────────────────────────
  useEffect(() => {
    if (!username) return;

    async function reconcile() {
      try {
        const serverJobs = await listReportJobs();
        const store = useReportJobsStore.getState();

        for (const serverJob of serverJobs) {
          const tracked = store.get(serverJob.jobId);
          if (!tracked) continue;
          if (!isTerminalJobStatus(serverJob.status)) continue;

          resolveJob(
            serverJob.jobId,
            serverJob.status as 'Completed' | 'Failed',
            {
              autoOpen: tracked.autoOpen,
              error: serverJob.errorMessage,
            },
          );
        }
      } catch {
        // Reconcile failures are non-fatal — polling will catch terminal state
      }
    }

    // Reconcile immediately on mount so jobs enqueued before page reload are resolved
    void reconcile();

    // Reconcile again every time the SignalR connection is restored after a blip.
    // Mirror the pattern in useNotificationHub: skip cold first connect (primed flag).
    let primed = appHub.hasEverConnected();
    const unsub = appHub.onConnectionStateChange(status => {
      if (status !== 'connected') return;
      if (!primed) {
        primed = true;
        return;
      }
      void reconcile();
    });

    return unsub;
  }, [username]);
}
