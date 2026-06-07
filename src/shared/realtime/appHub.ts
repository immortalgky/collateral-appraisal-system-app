/**
 * Shared singleton SignalR connection for the entire app.
 *
 * All real-time events (ReceiveNotification, ActivityStepProgress, PoolTaskUpdate)
 * are delivered over a single /notificationHub connection.
 *
 * Group rules (server-side):
 * - Every authenticated connection auto-joins `user-{username}` on connect —
 *   no client-side join call needed for user-level events.
 * - Pool task groups: client calls joinGroup('pool-'+g) / leaveGroup('pool-'+g).
 */

import { HubConnectionBuilder, HubConnectionState, type HubConnection } from '@microsoft/signalr';
import { getFreshAccessToken } from '@shared/api/axiosInstance';
import { signalrLogger } from '@shared/utils/signalrLogger';

// ──────────────────────────────────────────────────────────────────────────────
// Hub URL
// ──────────────────────────────────────────────────────────────────────────────

function getHubUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '') + '/notificationHub';
}

// ──────────────────────────────────────────────────────────────────────────────
// Types — re-exported so consumers don't need to import from the old locations
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
// Connection status
// ──────────────────────────────────────────────────────────────────────────────

/** High-level connection status surfaced to the UI. */
export type AppHubStatus = 'connected' | 'reconnecting' | 'disconnected';

// ──────────────────────────────────────────────────────────────────────────────
// Singleton state
// ──────────────────────────────────────────────────────────────────────────────

let _connection: HubConnection | null = null;
let _startPromise: Promise<void> | null = null;

/** Last username passed to start() — used by wake/close handlers to reconnect. */
let _lastUsername: string | null = null;

/** Set during stop() so the onclose handler doesn't auto-restart on logout. */
let _intentionalStop = false;

/** Pending auto-restart timer (after an unexpected close). */
let _restartTimer: ReturnType<typeof setTimeout> | null = null;

/** Whether the window-level wake listeners have been attached (once only). */
let _wakeListenersAttached = false;

/** Current high-level status. */
let _status: AppHubStatus = 'disconnected';

/** True once the connection has reached 'connected' at least once this session.
 * Lets consumers distinguish a cold first-connect from a re-connect even when
 * they attach mid-reconnect. */
let _hasEverConnected = false;

/** Generic groups the client has joined (e.g. 'pool-ROLE_A'). */
const _activeGroups = new Set<string>();

/** Per-event subscriber sets — fans out to multiple consumers. */
const _subscribers = new Map<string, Set<(payload: unknown) => void>>();

/** Event names with a live connection-level handler on the CURRENT connection.
 * Cleared whenever a new connection is built so each connection is bound once. */
const _boundEvents = new Set<string>();

/** Listeners notified whenever the high-level status changes. */
const _statusListeners = new Set<(status: AppHubStatus) => void>();

function setStatus(status: AppHubStatus): void {
  if (_status === status) return;
  _status = status;
  if (status === 'connected') _hasEverConnected = true;
  for (const listener of _statusListeners) {
    try {
      listener(status);
    } catch (err) {
      console.warn('[AppHub] status listener threw:', err);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

function buildConnection(): HubConnection {
  return (
    new HubConnectionBuilder()
      .withUrl(getHubUrl(), {
        // Refresh the token before (re)connecting so reconnects after idle/sleep
        // don't negotiate with an expired token and 401-loop.
        // On refresh failure getFreshAccessToken() returns null → ''. We do NOT
        // force a logout here: a null result also covers a transient network
        // outage (offline), which is exactly when we want to keep retrying.
        // A genuinely dead session is caught by the axios 401 interceptor on the
        // next API call, which forces the logout/redirect.
        accessTokenFactory: async () => (await getFreshAccessToken()) ?? '',
        withCredentials: true,
      })
      // Never give up: capped exponential backoff that always returns a delay
      // (the default policy stops after ~40s, killing real-time for the session).
      // 0s, 2s, 4s, 8s, 16s, then 30s forever.
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: ctx =>
          ctx.previousRetryCount === 0
            ? 0
            : Math.min(30000, 1000 * 2 ** Math.min(ctx.previousRetryCount, 5)),
      })
      .configureLogging(signalrLogger)
      .build()
  );
}

/** Register the fan-out handler for `event` on `conn` at most once per
 * connection. Idempotent — guarded by _boundEvents (cleared on each new
 * connection) so the two call sites can't double-register on one connection. */
function bindEvent(conn: HubConnection, event: string): void {
  if (_boundEvents.has(event)) return;
  _boundEvents.add(event);
  conn.on(event, (payload: unknown) => {
    for (const sub of _subscribers.get(event) ?? []) {
      sub(payload);
    }
  });
}

function getOrCreateSubscriberSet(event: string): Set<(payload: unknown) => void> {
  let set = _subscribers.get(event);
  if (!set) {
    set = new Set();
    _subscribers.set(event, set);
  }
  // Register the connection handler the first time anyone subscribes to this
  // event. Safe to call even before start() — SignalR queues on() calls.
  if (_connection) {
    bindEvent(_connection, event);
  }
  return set;
}

function attachConnectionHandlers(conn: HubConnection): void {
  // Fresh connection — re-register handlers for every known event.
  _boundEvents.clear();
  // Register a handler for every event that already has subscribers (e.g. if
  // on() was called before start() was invoked with a connection instance).
  for (const [event] of _subscribers) {
    bindEvent(conn, event);
  }

  // Connection dropped — automatic reconnection is now in progress.
  conn.onreconnecting(() => {
    setStatus('reconnecting');
  });

  // After reconnect: re-join all tracked generic groups, then signal connected.
  // The user-level group (user-{username}) is auto-joined by the server, so we
  // only need to restore the explicit pool/generic groups here.
  // Status flips to 'connected' last so subscribers (e.g. the notification hook)
  // re-fetch only once groups are restored — catching up anything missed while
  // disconnected (SignalR does not buffer server→client messages).
  conn.onreconnected(async () => {
    for (const group of _activeGroups) {
      try {
        await conn.invoke('JoinGroup', group);
      } catch (err) {
        console.warn('[AppHub] Failed to re-join group after reconnect:', group, err);
      }
    }
    setStatus('connected');
  });

  // Permanent close (retry policy exhausted — shouldn't happen with the
  // never-give-up policy above, but also covers post-negotiation failures).
  // Schedule a fresh start unless the close was an intentional stop().
  conn.onclose(() => {
    setStatus('disconnected');
    if (_intentionalStop) return;
    _connection = null;
    scheduleRestart();
  });
}

/** Schedule a reconnect attempt after an unexpected close. */
function scheduleRestart(): void {
  if (_restartTimer || _intentionalStop || !_lastUsername) return;
  _restartTimer = setTimeout(() => {
    _restartTimer = null;
    if (!_lastUsername) return;
    start(_lastUsername).catch(err => {
      console.warn('[AppHub] auto-restart failed, will retry:', err);
      scheduleRestart();
    });
  }, 5000);
}

/** Attach window/document wake listeners once — reconnect on network/focus.
 * Gated on 'disconnected' (not !== 'connected') so a wake event during an
 * in-progress 'reconnecting' window doesn't race a second connection against
 * the automatic-reconnect machinery. */
function attachWakeListeners(): void {
  if (_wakeListenersAttached || typeof window === 'undefined') return;
  _wakeListenersAttached = true;

  window.addEventListener('online', () => {
    if (_lastUsername && _status === 'disconnected') {
      start(_lastUsername).catch(() => {});
    }
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && _lastUsername && _status === 'disconnected') {
        start(_lastUsername).catch(() => {});
      }
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Start the shared connection.
 * Safe to call multiple times — subsequent calls are no-ops while connecting/connected.
 *
 * The server auto-joins `user-{username}` on connect; no client join needed.
 */
export async function start(_username: string): Promise<void> {
  _lastUsername = _username;
  _intentionalStop = false;
  attachWakeListeners();

  if (_startPromise) return _startPromise;
  if (_connection && _connection.state !== HubConnectionState.Disconnected) {
    return;
  }

  _connection = buildConnection();
  attachConnectionHandlers(_connection);

  const promise = _connection
    .start()
    .then(() => {
      console.log('[AppHub] Connected');
      setStatus('connected');
    })
    .catch(err => {
      console.warn('[AppHub] Connection failed:', err);
      setStatus('disconnected');
      // The initial start() isn't covered by the reconnect policy, so retry it
      // ourselves — otherwise a transient failure at login means no real-time
      // until a full page reload.
      _connection = null;
      scheduleRestart();
      throw err; // re-throw so callers (useNotificationHub) can show a toast
    })
    .finally(() => {
      _startPromise = null;
    });

  _startPromise = promise;
  return promise;
}

/** Stop and discard the shared connection (call on logout). */
export async function stop(): Promise<void> {
  _intentionalStop = true;
  _lastUsername = null;
  if (_restartTimer) {
    clearTimeout(_restartTimer);
    _restartTimer = null;
  }
  _activeGroups.clear();
  _boundEvents.clear();
  _hasEverConnected = false;
  if (_connection && _connection.state !== HubConnectionState.Disconnected) {
    await _connection.stop();
  }
  _connection = null;
  _startPromise = null;
  setStatus('disconnected');
}

/**
 * Subscribe to a hub event.
 * Returns an unsubscribe function.
 *
 * @param event   The SignalR method name (e.g. 'ReceiveNotification').
 * @param handler Called with the raw payload for each event.
 */
export function on<T>(event: string, handler: (payload: T) => void): () => void {
  // getOrCreateSubscriberSet registers the connection.on() handler the first
  // time a subscriber is added for this event (if _connection already exists).
  const set = getOrCreateSubscriberSet(event);
  set.add(handler as (payload: unknown) => void);
  return () => {
    set.delete(handler as (payload: unknown) => void);
  };
}

/** Join a named SignalR group on the server. */
export async function joinGroup(name: string): Promise<void> {
  _activeGroups.add(name);
  if (_connection && _connection.state === HubConnectionState.Connected) {
    try {
      await _connection.invoke('JoinGroup', name);
    } catch (err) {
      console.warn('[AppHub] joinGroup failed:', name, err);
    }
  }
}

/** Leave a named SignalR group on the server. */
export async function leaveGroup(name: string): Promise<void> {
  _activeGroups.delete(name);
  if (_connection && _connection.state === HubConnectionState.Connected) {
    try {
      await _connection.invoke('LeaveGroup', name);
    } catch (err) {
      console.warn('[AppHub] leaveGroup failed:', name, err);
    }
  }
}

/** Whether the shared connection is currently connected. */
export function isConnected(): boolean {
  return _connection?.state === HubConnectionState.Connected;
}

/** Current high-level connection status. */
export function getStatus(): AppHubStatus {
  return _status;
}

/** Whether the connection has reached 'connected' at least once this session.
 * Used to tell a cold first-connect apart from a re-connect (e.g. for
 * catch-up refetch) regardless of when the caller started observing. */
export function hasEverConnected(): boolean {
  return _hasEverConnected;
}

/**
 * Subscribe to connection status changes (connected / reconnecting /
 * disconnected). Returns an unsubscribe function. The listener is NOT called
 * immediately — read getStatus() for the current value when subscribing.
 */
export function onConnectionStateChange(listener: (status: AppHubStatus) => void): () => void {
  _statusListeners.add(listener);
  return () => {
    _statusListeners.delete(listener);
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Typed convenience wrapper for ActivityStepProgress
// (keeps useActivityCompletionProgress.ts import path working)
// ──────────────────────────────────────────────────────────────────────────────

export function onActivityStepProgress(
  handler: (event: ActivityStepProgressEvent) => void,
): () => void {
  return on<ActivityStepProgressEvent>('ActivityStepProgress', handler);
}
