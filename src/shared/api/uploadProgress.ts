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
};

type UploadProgressStore = {
  uploads: UploadEntry[];
  start: (id: number, label: string, direction: 'upload' | 'download') => void;
  update: (id: number, loaded: number, total: number | null) => void;
  finish: (id: number) => void;
};

export const useUploadProgressStore = create<UploadProgressStore>((set, get) => ({
  uploads: [],

  start: (id, label, direction) => {
    set(state => ({
      uploads: [
        ...state.uploads,
        { id, label, direction, loaded: 0, total: null, processing: false, visible: false },
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
              loaded,
              total,
              // A download's last byte means it is finished, not that anyone is working on it.
              processing: upload.direction === 'upload' && total !== null && loaded >= total,
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
