import type { QueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import type { LiftoffScene, LiftoffVoteOutcome } from '../components/summary/decisionHelpers';

/** Everything the post-submit overlay needs, resolved on the page at the moment of success. Two
 *  callers: completing a workflow activity (the decision page) and submitting a request (the
 *  request page). The overlay plays over the page that submitted, which stays mounted but inert;
 *  the app navigates to `to` only when the card closes (see LiftoffOverlay in App.tsx). */
export interface LiftoffPayload {
  /** Viewport centre of the Submit button's paper-plane icon, read at click time (`originOf`). */
  origin: { x: number; y: number } | null;
  scene: LiftoffScene;
  voteOutcome: LiftoffVoteOutcome | null;
  nextActivityName: string | null;
  nextAssigneeName: string | null;
  /** The next holder's user code, shown beside `nextAssigneeName` (never on its own). */
  nextAssigneeCode?: string | null;
  referenceNumber: string | null;
  /** Where the app goes when the card closes (countdown end, OK, Enter, Escape, backdrop click),
   *  e.g. '/tasks' after an activity, '/requests' after a request submit. */
  to: string;
  /** Called right before the app navigates to `to` (not when the user left some other way). The
   *  page passes its `skipWarning`: the countdown sits between the submit and the navigation, and the
   *  unsaved-changes guard re-arms if the form turns dirty again in that time. */
  beforeLeave?: () => void;
  /** Ids of the submitted item (task, workflow instance, appraisal, request): the keys of its
   *  queries. If the user leaves the page by any other route while the card is up, the app
   *  invalidates those queries so the page they land on shows the item's true state. */
  closedIds?: (string | null | undefined)[];
}

/** Viewport centre of an element, for `LiftoffPayload.origin`; null when it is missing or has no
 *  size (not rendered), so the overlay falls back to a default start point. */
export const originOf = (el: Element | null | undefined): LiftoffPayload['origin'] => {
  const r = el?.getBoundingClientRect();
  return r && r.width > 0 && r.height > 0
    ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    : null;
};

/** Cancels the in-flight queries that belong to the item that was just submitted (any query whose
 *  key holds one of `ids`: its task, workflow instance, appraisal or request id). The page stays on
 *  screen behind the success card while the item is already closed server-side, so a request still
 *  on its way could come back 403 / 404 and replace the page. A cancelled query keeps its last data
 *  and does not refetch by itself (it is not an error); only an explicit trigger would. */
export const cancelQueriesFor = (
  queryClient: QueryClient,
  ids: (string | null | undefined)[],
): Promise<void> => queryClient.cancelQueries({ predicate: keyHoldsAny(ids) });

/** The counterpart for when the user leaves the page some other way (browser Back to a sibling tab
 *  of the closed task): cached data from before the submit would show the old owner's view, so
 *  mark those queries stale and refetch the mounted ones, which then report the true state. */
export const invalidateQueriesFor = (
  queryClient: QueryClient,
  ids: (string | null | undefined)[],
): Promise<void> => queryClient.invalidateQueries({ predicate: keyHoldsAny(ids) });

/** Matches the queries whose key holds one of the ids as a string part. */
function keyHoldsAny(ids: (string | null | undefined)[]) {
  const wanted = ids.filter((id): id is string => !!id);
  return (query: { queryKey: readonly unknown[] }) =>
    query.queryKey.some(part => typeof part === 'string' && wanted.includes(part));
}

interface LiftoffState {
  liftoff: LiftoffPayload | null;
  /** Bumped by every show(), so a second overlay remounts instead of reusing the first one. */
  seq: number;
}

interface LiftoffActions {
  show: (payload: LiftoffPayload) => void;
  clear: () => void;
}

export const useLiftoffStore = create<LiftoffState & LiftoffActions>(set => ({
  liftoff: null,
  seq: 0,
  show: payload => set(state => ({ liftoff: payload, seq: state.seq + 1 })),
  clear: () => set({ liftoff: null }),
}));
