/**
 * Thin shim — delegates to the shared appHub singleton.
 *
 * All public exports are preserved so existing callers
 * (useActivityCompletionProgress, ActivityProgressHubBootstrap) compile unchanged.
 */

import * as appHub from '@shared/realtime/appHub';

// Re-export types so import sites don't need to change
export type { ActivityStepDto, ActivityStepProgressEvent } from '@shared/realtime/appHub';

/**
 * Start the shared hub connection.
 * The user group is auto-joined server-side — no explicit JoinUserGroup call needed.
 */
export async function startActivityProgressHub(username: string): Promise<void> {
  return appHub.start(username);
}

/** Stop the shared hub connection (call on logout). */
export async function stopActivityProgressHub(): Promise<void> {
  return appHub.stop();
}

/**
 * Subscribe to ActivityStepProgress events.
 * Returns an unsubscribe function.
 */
export function onActivityStepProgress(
  handler: (event: appHub.ActivityStepProgressEvent) => void,
): () => void {
  return appHub.onActivityStepProgress(handler);
}

/** Whether the shared hub is currently connected. */
export function isActivityProgressHubConnected(): boolean {
  return appHub.isConnected();
}
