/**
 * Whether a request was caused by the user or by a timer.
 *
 * The API ends a session after 30 minutes without user activity, and it can only count requests the
 * SPA marks. Marking each polling query by hand drifts (every new refetchInterval has to remember),
 * so one rule decides instead: a request is user-driven when there was a user input event, or the
 * page loaded, within the last USER_DRIVEN_WINDOW_MS. Anything else — a poll, a heartbeat, a
 * reconnect check on an unattended tab — is background.
 */
export const USER_DRIVEN_WINDOW_MS = 10_000;

/** How long the user can be busy without any request before the API is told they are still here. */
export const KEEP_ALIVE_MS = 5 * 60 * 1000;

const INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

// Counts as the page load: opening or reloading the SPA is itself user activity.
let lastActivityAt = Date.now();
// The last time the API heard from us on the user's behalf (page load counts: the session cookie
// was just used).
let lastUserRequestAt = Date.now();

// Set by the signed-in app shell; null while nobody is signed in. See startKeepAlive.
let keepAlivePing: (() => void) | null = null;
let keepAliveUsers = 0;

if (typeof window !== 'undefined') {
  // The one place input is observed, so the activity clock is always updated before anything that
  // reacts to it (the keep-alive ping goes out as a user-driven request because of that order).
  const onInput = () => {
    lastActivityAt = Date.now();
    if (keepAlivePing && lastActivityAt - lastUserRequestAt >= KEEP_ALIVE_MS) {
      lastUserRequestAt = lastActivityAt;
      keepAlivePing();
    }
  };
  for (const type of INPUT_EVENTS) {
    // Capture phase so a handler that stops propagation cannot hide the input from us.
    window.addEventListener(type, onInput, { capture: true, passive: true });
  }
}

export const isUserDriven = (): boolean => Date.now() - lastActivityAt <= USER_DRIVEN_WINDOW_MS;

/** Called for every request that goes out as user-driven. */
export const recordUserRequest = () => {
  lastUserRequestAt = Date.now();
};

/**
 * Real activity that makes no requests — typing a long form — would otherwise let the API's idle
 * timer run out and lose the user's work on Save. So on user input, if the API has not heard a
 * user-driven request for KEEP_ALIVE_MS, call `ping` (which must be a plain user-driven request).
 * Event-driven, so an idle tab sends nothing. Reference-counted: however many components start it
 * (nested routes), there is one ping and it stops with the last of them. Returns the stop function.
 */
export function startKeepAlive(ping: () => void): () => void {
  keepAlivePing = ping;
  keepAliveUsers++;
  return () => {
    if (--keepAliveUsers === 0) keepAlivePing = null;
  };
}
