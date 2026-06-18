import { useEffect, useRef } from 'react';
import * as appHub from '@shared/realtime/appHub';

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

export function useWorkflowHub({ poolGroups, onPoolTaskUpdate }: UseWorkflowHubOptions) {
  // Keep latest callback in a ref so the effect closure stays stable
  const callbackRef = useRef(onPoolTaskUpdate);
  callbackRef.current = onPoolTaskUpdate;

  // Stable key so the effect only re-runs when the set of groups actually changes
  const groupKey = poolGroups.slice().sort().join(',');

  useEffect(() => {
    if (poolGroups.length === 0) return;

    // Subscribe to PoolTaskUpdate events on the shared connection
    const unsub = appHub.on<PoolTaskUpdateEvent>('PoolTaskUpdate', event => {
      callbackRef.current(event);
    });

    // Join each pool group on the server — the NEW generic JoinGroup method is used,
    // and the client is responsible for passing the full 'pool-' prefix because the
    // old JoinPoolGroup (which prepended the prefix server-side) has been removed.
    const prefixedGroups = poolGroups.map(g => `pool-${g}`);
    console.log('[WorkflowHub] Joining pool groups:', prefixedGroups);
    prefixedGroups.forEach(g => appHub.joinGroup(g));

    return () => {
      unsub();
      prefixedGroups.forEach(g => appHub.leaveGroup(g));
    };
    // groupKey is a stable derived string — safe to use instead of the array reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey]);
}
