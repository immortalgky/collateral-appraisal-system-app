import { useEffect, useRef } from 'react';
import { HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { signalrLogger } from '@shared/utils/signalrLogger';
import { getAccessToken } from '@shared/api/axiosInstance';

export interface PoolTaskUpdateEvent {
  type: 'PoolTaskLocked' | 'PoolTaskUnlocked' | 'PoolTaskClaimed';
  taskId: string;
  lockedBy?: string;
  releasedBy?: string;
  claimedBy?: string;
  poolGroup: string;
  timestamp: string;
}

interface UseWorkflowHubOptions {
  poolGroups: string[];
  onPoolTaskUpdate: (event: PoolTaskUpdateEvent) => void;
}

const getHubUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '') + '/workflowHub';
};

export function useWorkflowHub({ poolGroups, onPoolTaskUpdate }: UseWorkflowHubOptions) {
  const connectionRef = useRef<ReturnType<typeof HubConnectionBuilder.prototype.build> | null>(
    null,
  );
  // Keep latest callback in a ref so the effect closure stays stable
  const callbackRef = useRef(onPoolTaskUpdate);
  callbackRef.current = onPoolTaskUpdate;

  // Stable key so the effect only re-runs when the set of groups actually changes
  const groupKey = poolGroups.slice().sort().join(',');

  useEffect(() => {
    if (poolGroups.length === 0) return;

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

    connection.on('PoolTaskUpdate', (event: PoolTaskUpdateEvent) => {
      callbackRef.current(event);
    });

    let cancelled = false;

    connection
      .start()
      .then(() => {
        if (cancelled) return;
        console.log('[WorkflowHub] SignalR connected, joining pools:', poolGroups);
        return Promise.all(poolGroups.map(g => connection.invoke('JoinPoolGroup', g)));
      })
      .catch(err => {
        if (!cancelled) console.error('[WorkflowHub] SignalR connection failed:', err);
      });

    return () => {
      cancelled = true;
      if (connection.state !== HubConnectionState.Disconnected) {
        Promise.all(
          poolGroups.map(g => connection.invoke('LeavePoolGroup', g).catch(() => {})),
        ).finally(() => connection.stop());
      }
    };
    // groupKey is a stable derived string — safe to use instead of the array reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey]);
}
