/**
 * Non-rendering component.
 * Starts the ActivityProgressHub singleton once the authenticated user is known,
 * so the SignalR connection is already open when the first task completion fires.
 */

import { useEffect } from 'react';
import { useAuthStore } from '@features/auth/store';
import { startActivityProgressHub } from '../services/activityProgressHub';

export function ActivityProgressHubBootstrap() {
  const username = useAuthStore(s => s.user?.username);

  useEffect(() => {
    if (!username) return;
    startActivityProgressHub(username);
    // Intentionally not stopping on unmount — this is a long-lived singleton
    // that should stay open for the entire authenticated session.
  }, [username]);

  return null;
}
