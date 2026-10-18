// Tells the other tabs of this browser about sign-in state. Carries no credentials — the session is
// a cookie, so there is nothing to sync, only the instant "you are signed out" / "the signed-in
// user is Y" signals.
export const authChannel =
  typeof globalThis.BroadcastChannel === 'function'
    ? new globalThis.BroadcastChannel('auth')
    : null;
