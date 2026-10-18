// How long to wait before concluding a navigation did not happen (it silently failed) and letting
// later genuine leaves prompt again. Forced navigations raise no prompt, so no cancelled prompt
// can hold the page here; the user's own sign-out can, and uses this window too.
export const REDIRECT_SETTLE_MS = 3000;

let leaving = false;
let resetTimer: ReturnType<typeof setTimeout> | undefined;

// Both of these are required. `capture: true` is what makes the guard run first on WebKit (per spec,
// capture listeners at the target go before the rest). Chromium ignores that and runs same-target
// listeners in registration order even for capture: a probe with the guard registered AFTER the
// dirty handler (capture: true) still showed the dialog there. So it must also be registered at
// module load, before any page mounts its "unsaved changes" handler.
// While the app is forcing the navigation itself, stopping the event keeps those handlers from
// raising the prompt: it cannot save anything once the session is gone (a save would 401), and a
// tab that belongs to another user must not be kept by "Stay", or it would save as that user.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', event => leaving && event.stopImmediatePropagation(), {
    capture: true,
  });
}

/** Run `go` (a location assignment/replace/reload) with no "Leave site?" prompt. */
export function leaveWithoutPrompt(go: () => void) {
  leaving = true;
  clearTimeout(resetTimer);
  try {
    go();
  } finally {
    resetTimer = setTimeout(() => {
      leaving = false;
    }, REDIRECT_SETTLE_MS);
  }
}
