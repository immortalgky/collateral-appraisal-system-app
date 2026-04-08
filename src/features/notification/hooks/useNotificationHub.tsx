import { useEffect, useRef } from 'react';
import { HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr';
import { getAccessToken } from '@shared/api/axiosInstance';
import { useNotificationStore } from '../store';
import { showNotificationToast } from '../components/NotificationToast';
import type { Notification } from '../types';

const getHubUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '') + '/notificationHub';
};

export function useNotificationHub() {
  const connectionRef = useRef<ReturnType<typeof HubConnectionBuilder.prototype.build> | null>(null);
  const addNotification = useNotificationStore(s => s.addNotification);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const connection = new HubConnectionBuilder()
      .withUrl(getHubUrl(), {
        accessTokenFactory: () => getAccessToken() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on('ReceiveNotification', (notification: Notification) => {
      addNotification(notification);
      showNotificationToast(notification);
    });

    connection.start().catch(err => {
      console.error('SignalR connection failed:', err);
    });

    return () => {
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.stop();
      }
    };
  }, [addNotification]);
}
