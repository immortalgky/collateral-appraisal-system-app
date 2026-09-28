/**
 * Live state for file transfers in flight, in both directions.
 *
 * Every multipart upload and every blob download in the app goes through blobTransfer, so
 * registering here is done once at that choke point rather than in each of the dozen screens that
 * move a file — a screen only has to render UploadProgressPanel, and it gets progress for
 * transfers it does not even know about. A caller that shows its own progress (the document viewer
 * tab, the quotation preview) opts out with `silent`.
 */

import { create } from 'zustand';

/**
 * An upload shorter than this never reaches the panel. Most uploads on a LAN finish in a few
 * hundred milliseconds, and a bar that flashes up and vanishes reads as a glitch rather than as
 * information.
 */
const VISIBLE_AFTER_MS = 400;

export type UploadEntry = {
  id: number;
  label: string;
  direction: 'upload' | 'download';
  loaded: number;
  /** Null when the browser cannot compute it — show something indeterminate. */
  total: number | null;
  /** Upload only: the bytes are all sent and the server is working on the file. */
  processing: boolean;
  /** False until the upload has lasted long enough to be worth showing. */
  visible: boolean;
  /** When this run started, so the time remaining can be worked out from what has moved since. */
  startedAt: number;
  /**
   * How much had already arrived when this run started — zero, or whatever the server had when a
   * stopped transfer was resumed. Subtracting it is what keeps a resumed upload's estimate honest.
   */
  baseLoaded: number;
  /** Stops the transfer. Absent once it has stopped for any other reason. */
  cancel?: () => void;
  /**
   * Set when a transfer failed in a way it can be picked up from — a chunked upload knows how far
   * the server got. The entry stays on screen with this offered, instead of vanishing and leaving
   * the user to find the file again.
   */
  resume?: () => void;
  /** Gives up on a failed transfer. The upload's own call settles as failed when this is taken. */
  dismiss?: () => void;
};

type UploadProgressStore = {
  uploads: UploadEntry[];
  start: (id: number, label: string, direction: 'upload' | 'download', cancel?: () => void) => void;
  update: (id: number, loaded: number, total: number | null) => void;
  /**
   * Keeps the entry, offering the two things that can be done with a stopped transfer. Exactly one
   * of them is taken: the upload is waiting on the answer.
   */
  fail: (id: number, actions: { resume: () => void; dismiss: () => void }) => void;
  /** Back to running after a resume, with a fresh way to stop it. */
  resumed: (id: number, cancel: () => void) => void;
  finish: (id: number) => void;
};

export const useUploadProgressStore = create<UploadProgressStore>((set, get) => ({
  uploads: [],

  start: (id, label, direction, cancel) => {
    set(state => ({
      uploads: [
        ...state.uploads,
        {
          id,
          label,
          direction,
          loaded: 0,
          total: null,
          processing: false,
          visible: false,
          startedAt: Date.now(),
          baseLoaded: 0,
          cancel,
        },
      ],
    }));

    // No polling: a transfer that finishes first has already removed its entry, and this becomes a
    // no-op rather than a timer anyone has to clean up.
    setTimeout(() => {
      set(state => {
        // Returning the same state matters: map() would hand back a new array either way and
        // re-render the panel 400ms after every fast transfer it exists to keep hidden.
        if (!state.uploads.some(upload => upload.id === id)) return state;
        return {
          uploads: state.uploads.map(upload =>
            upload.id === id ? { ...upload, visible: true } : upload,
          ),
        };
      });
    }, VISIBLE_AFTER_MS);
  },

  update: (id, loaded, total) =>
    set(state => ({
      uploads: state.uploads.map(upload =>
        upload.id === id
          ? {
              ...upload,
              // The clock starts at the first byte, not at the request. A download that waits
              // minutes for the server to build a report would otherwise charge all of that to the
              // transfer and report "8 min left" on something that finishes in four seconds.
              startedAt: upload.loaded === upload.baseLoaded ? Date.now() : upload.startedAt,
              loaded,
              total,
              // A download's last byte means it is finished, not that anyone is working on it.
              processing: upload.direction === 'upload' && total !== null && loaded >= total,
            }
          : upload,
      ),
    })),

  fail: (id, actions) =>
    set(state => ({
      uploads: state.uploads.map(upload =>
        upload.id === id
          ? // Visible whatever its age: a failure is worth showing even when the transfer was too
            // short to have earned a progress bar.
            {
              ...upload,
              visible: true,
              processing: false,
              cancel: undefined,
              resume: actions.resume,
              dismiss: actions.dismiss,
            }
          : upload,
      ),
    })),

  resumed: (id, cancel) =>
    set(state => ({
      uploads: state.uploads.map(upload =>
        // The buttons go while it is running again: one answer per failure, and the upload is no
        // longer waiting for another. The clock restarts from here, with what already arrived
        // taken as the new baseline — time spent parked is not time spent transferring.
        upload.id === id
          ? {
              ...upload,
              resume: undefined,
              dismiss: undefined,
              cancel,
              startedAt: Date.now(),
              baseLoaded: upload.loaded,
            }
          : upload,
      ),
    })),

  finish: id => {
    if (!get().uploads.some(upload => upload.id === id)) return;
    set(state => ({ uploads: state.uploads.filter(upload => upload.id !== id) }));
  },
}));

let lastId = 0;
export const nextUploadId = () => (lastId += 1);
