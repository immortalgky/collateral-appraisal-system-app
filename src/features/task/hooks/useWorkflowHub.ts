import { useEffect, useRef } from 'react';
import { HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr';
import { getAccessToken } from '@shared/api/axiosInstance';

export interface PoolTaskUpdateEvent {
  Type: 'PoolTaskLocked' | 'PoolTaskUnlocked' | 'PoolTaskClaimed';
  TaskId: string;
  LockedBy?: string;
  ReleasedBy?: string;
  ClaimedBy?: string;
  PoolGroup: string;
  Timestamp: string;
}

interface UseWorkflowHubOptions {
  poolGroup: string | null;
  onPoolTaskUpdate: (event: PoolTaskUpdateEvent) => void;
}

const getHubUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '') + '/workflowHub';
};

export function useWorkflowHub({ poolGroup, onPoolTaskUpdate }: UseWorkflowHubOptions) {
  const connectionRef = useRef<ReturnType<typeof HubConnectionBuilder.prototype.build> | null>(null);
  // Keep latest callback in a ref so the effect closure stays stable
  const callbackRef = useRef(onPoolTaskUpdate);
  callbackRef.current = onPoolTaskUpdate;

  useEffect(() => {
    if (!poolGroup) return;

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

    connection.on('PoolTaskUpdate', (event: PoolTaskUpdateEvent) => {
      callbackRef.current(event);
    });

    connection
      .start()
      .then(() => {
        console.log('[WorkflowHub] SignalR connected');
        return connection.invoke('JoinPoolGroup', poolGroup);
      })
      .catch(err => {
        console.error('[WorkflowHub] SignalR connection failed:', err);
      });

    return () => {
      if (connection.state !== HubConnectionState.Disconnected) {
        connection
          .invoke('LeavePoolGroup', poolGroup)
          .catch(() => {})
          .finally(() => connection.stop());
      }
    };
  }, [poolGroup]);
}
