import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import i18n from '@/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/store';
import { useNotificationStore } from '../store';
import { showNotificationToast } from '../components/NotificationToast';
import { followupKeys } from '@/features/document-followup/api/followup';
import type { Notification } from '../types';
import * as appHub from '@shared/realtime/appHub';

const FOLLOWUP_NOTIFICATION_TYPES = new Set([
  'DocumentFollowupRaised',
  'DocumentFollowupResolved',
  'DocumentFollowupCancelled',
  'DocumentLineItemDeclined',
]);

// Notifications that change a user's pending-task set (a task lands in or leaves a
// list/pool). Refresh every task view + counts so the recipient sees it live.
// NOTE: TaskAssigned is delivered per-user via "ReceiveNotification" (handled here).
// TaskCompleted is currently broadcast via "ReceiveGroupNotification" to the
// Appraisal_{correlationId} group, which this hook does not subscribe to — it is
// listed here so it works automatically if/when it's also delivered per-user.
const TASK_NOTIFICATION_TYPES = new Set(['TaskAssigned', 'TaskCompleted']);

export function useNotificationHub() {
  const hasShownConnectErrorToast = useRef(false);
  const addNotification = useNotificationStore(s => s.addNotification);
  const fetchNotifications = useNotificationStore(s => s.fetchNotifications);
  const queryClient = useQueryClient();
  const username = useAuthStore(s => s.user?.username);

  useEffect(() => {
    if (!username) return;

    // Start the shared connection (idempotent — safe if already started by
    // ActivityProgressHubBootstrap or a previous render).
    appHub.start(username).catch(err => {
      console.error('[NotificationHub] SignalR connection failed:', err);
      if (!hasShownConnectErrorToast.current) {
        toast.error(i18n.t('notification:realtimeUnavailable'));
        hasShownConnectErrorToast.current = true;
      }
    });

    const unsub = appHub.on<Notification>('ReceiveNotification', notification => {
      console.log('[NotificationHub] ReceiveNotification fired', notification);
      addNotification(notification);
      try {
        showNotificationToast(notification);
        console.log('[NotificationHub] showNotificationToast called successfully');
      } catch (err) {
        console.error('[NotificationHub] showNotificationToast threw:', err);
      }

      // Invalidate document followup queries when relevant notifications arrive
      if (FOLLOWUP_NOTIFICATION_TYPES.has(notification.type)) {
        const meta = notification.metadata ?? {};
        if (typeof meta.raisingTaskId === 'string') {
          queryClient.invalidateQueries({
            queryKey: followupKeys.byTask(meta.raisingTaskId),
          });
        }
        if (typeof meta.followupId === 'string') {
          queryClient.invalidateQueries({
            queryKey: followupKeys.detail(meta.followupId),
          });
        }
        if (notification.type === 'DocumentFollowupRaised') {
          queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['my-tasks-kanban'] });
          queryClient.invalidateQueries({ queryKey: ['task-counts'] });
        }
      }

      // A task was assigned to / completed by this user: refresh every task list +
      // counts so the affected task appears/disappears without a manual refresh.
      if (TASK_NOTIFICATION_TYPES.has(notification.type)) {
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['my-tasks-kanban'] });
        queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['task-counts'] });
      }
    });

    return unsub;
    // addNotification and queryClient are stable refs; username drives re-subscription
  }, [username, addNotification, queryClient]);

  // Catch up after a reconnect. SignalR does not buffer server→client messages
  // while disconnected, so anything pushed during a network blip / sleep / long
  // outage is lost over the wire. On every RE-connect (the first connect is
  // skipped — NotificationDropdown already fetches on mount), re-fetch the
  // notification list and reconcile task queries so the bell shows what was
  // missed without a manual page refresh.
  useEffect(() => {
    if (!username) return;

    // Skip only a genuine cold first-connect (NotificationDropdown already
    // fetches on mount). Seed from hasEverConnected() — not the current status —
    // so that attaching mid-reconnect (status === 'reconnecting') is still
    // treated as a re-connect and the next 'connected' triggers the catch-up,
    // which is exactly the missed-notification case this guards.
    let primed = appHub.hasEverConnected();
    const unsub = appHub.onConnectionStateChange(status => {
      if (status !== 'connected') return;
      if (!primed) {
        primed = true;
        return;
      }
      fetchNotifications(username);
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['task-counts'] });
    });

    return unsub;
  }, [username, fetchNotifications, queryClient]);
}
