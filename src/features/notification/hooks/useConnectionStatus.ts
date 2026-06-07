import { useEffect, useState } from 'react';
import * as appHub from '@shared/realtime/appHub';

/**
 * Reactive view of the shared SignalR connection status
 * (connected / reconnecting / disconnected). Seeds from the current value and
 * stays in sync via appHub.onConnectionStateChange.
 */
export function useConnectionStatus(): appHub.AppHubStatus {
  const [status, setStatus] = useState<appHub.AppHubStatus>(() => appHub.getStatus());

  useEffect(() => {
    // Re-sync in case the status changed between the initial render and effect.
    setStatus(appHub.getStatus());
    return appHub.onConnectionStateChange(setStatus);
  }, []);

  return status;
}
