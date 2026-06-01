/**
 * Singleton SignalR connection for ActivityStepProgress events.
 *
 * Separate from useWorkflowHub (which handles per-task pool groups and is
 * recreated per component mount). This connection is long-lived, started once
 * after login, and used exclusively for the completion-progress overlay.
 */

import { HubConnectionBuilder, HubConnectionState, type HubConnection } from '@microsoft/signalr';
import { getAccessToken } from '@shared/api/axiosInstance';
import { signalrLogger } from '@shared/utils/signalrLogger';

// ──────────────────────────────────────────────────────────────────────────────
// Hub URL (mirrors the pattern in useWorkflowHub)
// ──────────────────────────────────────────────────────────────────────────────

function getHubUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '') + '/workflowHub';
}

// ──────────────────────────────────────────────────────────────────────────────
// Singleton state
// ──────────────────────────────────────────────────────────────────────────────

let _connection: HubConnection | null = null;
let _userGroup: string | null = null;
let _startPromise: Promise<void> | null = null;

/** Subscriber set keyed by their handler function */
const _subscribers = new Set<(event: ActivityStepProgressEvent) => void>();

// ──────────────────────────────────────────────────────────────────────────────
// Public event types
// ──────────────────────────────────────────────────────────────────────────────

export interface ActivityStepDto {
  stepName: string;
  displayName: string;
  sortOrder: number;
  kind: string;
}

export type ActivityStepProgressEvent =
  | {
      phase: 'PipelineStarted';
      workflowActivityExecutionId: string;
      activityName: string;
      steps: ActivityStepDto[];
    }
  | {
      phase: 'StepStarted';
      workflowActivityExecutionId: string;
      step: ActivityStepDto;
    }
  | {
      phase: 'StepFinished';
      workflowActivityExecutionId: string;
      step: ActivityStepDto;
      outcome: string;
      durationMs: number;
    }
  | {
      phase: 'PipelineFinished';
      workflowActivityExecutionId: string;
      result: string;
    };

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

function buildConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(getHubUrl(), {
      accessTokenFactory: () => getAccessToken() ?? '',
      withCredentials: true,
    })
    .withAutomaticReconnect()
    .configureLogging(signalrLogger)
    .build();
}

function attachHandlers(conn: HubConnection): void {
  conn.on('ActivityStepProgress', (event: ActivityStepProgressEvent) => {
    for (const sub of _subscribers) {
      sub(event);
    }
  });

  // Re-join user group after automatic reconnect
  conn.onreconnected(async () => {
    if (_userGroup) {
      try {
        await conn.invoke('JoinUserGroup', _userGroup);
      } catch (err) {
        console.warn('[ActivityProgressHub] Failed to re-join user group after reconnect:', err);
      }
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Start the singleton connection and join the user's personal group.
 * Safe to call multiple times — subsequent calls are no-ops if already connecting/connected.
 *
 * @param username  The current user's username (= "name" claim = backend `completedBy`).
 */
export async function startActivityProgressHub(username: string): Promise<void> {
  if (_startPromise) return _startPromise;
  if (_connection && _connection.state !== HubConnectionState.Disconnected) {
    return;
  }

  _connection = buildConnection();
  attachHandlers(_connection);
  // Store the bare username — the backend JoinUserGroup handler prepends "user-" itself
  _userGroup = username;

  const promise = _connection
    .start()
    .then(async () => {
      if (_connection && _userGroup) {
        await _connection.invoke('JoinUserGroup', _userGroup);
        console.log('[ActivityProgressHub] Connected and joined user group for', _userGroup);
      }
    })
    .catch(err => {
      console.warn('[ActivityProgressHub] Connection failed (progress overlay degraded):', err);
      // Don't re-throw — this is non-critical; completion still works without it
    })
    .finally(() => {
      _startPromise = null;
    });

  _startPromise = promise;
  return promise;
}

/** Stop and discard the singleton connection (call on logout). */
export async function stopActivityProgressHub(): Promise<void> {
  _userGroup = null;
  if (_connection && _connection.state !== HubConnectionState.Disconnected) {
    await _connection.stop();
  }
  _connection = null;
  _startPromise = null;
}

/**
 * Subscribe to ActivityStepProgress events.
 * Returns an unsubscribe function.
 */
export function onActivityStepProgress(
  handler: (event: ActivityStepProgressEvent) => void,
): () => void {
  _subscribers.add(handler);
  return () => {
    _subscribers.delete(handler);
  };
}

/** Whether the hub is currently connected. */
export function isActivityProgressHubConnected(): boolean {
  return _connection?.state === HubConnectionState.Connected;
}
