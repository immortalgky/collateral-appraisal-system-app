import { useFormContext, useWatch } from 'react-hook-form';
import { useUploadProgressStore } from '@/shared/api/uploadProgress';
import { REQUEST_DOCUMENT_UPLOADS } from '../types/document';
import { hasUploadingRows } from '../utils/carryForward';

// A module constant: an inline array is a new object every render, and useWatch re-subscribes on it
const WATCHED = ['documents', 'titles'] as const;

/**
 * A file of this request is still uploading: a row of the form marked uploading, or a batch started
 * from the request's document card (uploads elsewhere in the app are not this request's business).
 * The one definition of "busy" for the screens that must not move rows or save meanwhile.
 *
 * It watches documents and titles through `compute`, so a component using it re-renders only when
 * the answer flips, not on every keystroke in a title or document field.
 */
export const useRequestUploadBusy = () => {
  const { control } = useFormContext();
  const rowsBusy = useWatch({
    control,
    name: WATCHED,
    compute: ([documents, titles]) => hasUploadingRows(documents, titles),
  });
  const storeBusy = useUploadProgressStore(state =>
    state.batches.includes(REQUEST_DOCUMENT_UPLOADS),
  );
  return storeBusy || rowsBusy;
};
