import { useEffect, useRef } from 'react';
import { HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { signalrLogger } from '@shared/utils/signalrLogger';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@shared/api/axiosInstance';
import { useNotificationStore } from '../store';
import { showNotificationToast } from '../components/NotificationToast';
import { followupKeys } from '@/features/document-followup/api/followup';
import type { Notification } from '../types';

const FOLLOWUP_NOTIFICATION_TYPES = new Set([
  'DocumentFollowupRaised',
  'DocumentFollowupResolved',
  'DocumentFollowupCancelled',
  'DocumentLineItemDeclined',
]);

const getHubUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '') + '/notificationHub';
};

export function useNotificationHub() {
  const connectionRef = useRef<ReturnType<typeof HubConnectionBuilder.prototype.build> | null>(null);
  const addNotification = useNotificationStore(s => s.addNotification);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const connection = new HubConnectionBuilder()
      .withUrl(getHubUrl(), {
        accessTokenFactory: () => getAccessToken() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalrLogger)
      .build();

    connectionRef.current = connection;

    connection.on('ReceiveNotification', (notification: Notification) => {
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
        // Narrow followup query invalidation when IDs are present in metadata
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
        // Refresh the request maker's task inbox only when a NEW followup task
        // is raised (DocumentFollowupRaised). The other three types (Resolved,
        // Cancelled, LineItemDeclined) are directed at the checker and only
        // need the followup queries above to update the banner.
        if (notification.type === 'DocumentFollowupRaised') {
          queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['my-tasks-kanban'] });
        }
      }
    });

    let cancelled = false;

    connection.start()
      .then(() => {
        if (!cancelled) console.log('[NotificationHub] SignalR connected');
      })
      .catch(err => {
        if (!cancelled) console.error('[NotificationHub] SignalR connection failed:', err);
      });

    return () => {
      cancelled = true;
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.stop();
      }
    };
  }, [addNotification, queryClient]);
}
