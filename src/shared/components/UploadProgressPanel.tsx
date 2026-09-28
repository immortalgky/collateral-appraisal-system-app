import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useUploadProgressStore } from '@shared/api/uploadProgress';
import type { UploadEntry } from '@shared/api/uploadProgress';
import Icon from '@shared/components/Icon';

/** Bytes as MB (or KB below a megabyte) — the numbers people recognise from a file listing. */
const formatSize = (bytes: number): string => {
  const mb = bytes / 1_000_000;
  return mb < 1 ? `${Math.round(bytes / 1000)} KB` : `${mb.toFixed(1)} MB`;
};

/**
 * Below this there is nothing worth estimating from: the first chunk of a transfer moves at
 * whatever the connection happens to be doing in that instant, and a figure derived from it swings
 * wildly enough to be worse than no figure at all.
 */
const ESTIMATE_AFTER_MS = 3_000;

/**
 * Time left, from what has actually moved so far. Null while it would be guesswork.
 */
const secondsRemaining = (upload: UploadEntry): number | null => {
  const { loaded, total, startedAt, baseLoaded } = upload;
  const elapsed = Date.now() - startedAt;

  // The rate comes from this run alone — bytes since it (re)started, over how long it has been
  // going. A transfer that was parked for ten minutes waiting for an answer would otherwise count
  // that as transfer time and report a figure several times too long for the rest of it.
  const movedThisRun = loaded - baseLoaded;
  if (total === null || movedThisRun <= 0 || elapsed < ESTIMATE_AFTER_MS) return null;

  const bytesPerMs = movedThisRun / elapsed;
  if (bytesPerMs <= 0) return null;

  // What is left is measured against the whole file, not against this run.
  return Math.round((total - loaded) / bytesPerMs / 1000);
};

/**
 * Shows every transfer currently in flight, wherever it was started from.
 *
 * Mounted once per app shell, next to LoadingOverlay. It reads the store that blobTransfer feeds,
 * so a screen gets progress for its transfers without knowing this exists — which is what makes it
 * worth having, since files are moved from a dozen different places.
 *
 * Deliberately not blocking: a transfer runs in the background and the user is free to keep
 * working, so this sits in the corner rather than over the page.
 */
function UploadProgressPanel() {
  const uploads = useUploadProgressStore(state => state.uploads);
  const { t } = useTranslation('common');

  const visible = uploads.filter(upload => upload.visible);

  // One announcement for the batch, and only when the state behind it changes — a live region
  // carrying the percentages would talk over everything else for the length of the transfer.
  const summary =
    visible.length === 0
      ? ''
      : visible.some(upload => upload.resume)
        ? t('transfer.failed')
        : visible.every(upload => upload.processing)
          ? t('transfer.processing')
          : visible.some(upload => upload.direction === 'upload')
            ? t('transfer.uploading')
            : t('transfer.downloading');

  const panel = (
    // Rendered even when idle: a live region has to exist before its content changes, or the first
    // announcement — the one that matters — is simply never made. pointer-events-none so an empty
    // panel cannot sit over anything.
    //
    // Above every dialog layer in the app (Modal is z-50, the follow-up dialogs go to z-[70]):
    // four of the five uploads that feed this panel are started from inside a modal, and at z-40
    // it spent the whole transfer behind the dimmed backdrop.
    <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-72 flex-col gap-2">
      <span className="sr-only" role="status" aria-live="polite">
        {summary}
      </span>

      {visible.map(upload => {
        const percent =
          upload.total === null
            ? null
            : Math.min(100, Math.max(0, Math.round((upload.loaded / upload.total) * 100)));
        // Nothing to estimate while the server works, and nothing to estimate about a transfer
        // that has stopped and is waiting to be told what to do.
        const remaining = upload.processing || upload.resume ? null : secondsRemaining(upload);
        const readout = upload.resume
          ? t('transfer.failed')
          : upload.processing
            ? t('transfer.processing')
            : percent === null || upload.total === null
              ? formatSize(upload.loaded)
              : `${percent}% · ${formatSize(upload.loaded)} / ${formatSize(upload.total)}`;

        return (
          <div
            key={upload.id}
            className="border-base-300 bg-base-100 pointer-events-auto rounded-lg border p-3 shadow-lg"
          >
            <p className="text-base-content truncate text-sm font-medium" title={upload.label}>
              {upload.label}
            </p>

            {/* A progressbar, not a live region: something to be looked up rather than announced.
                Not aria-hidden either — that would take the readout out of the accessibility tree
                altogether, leaving no way to ask how far along an upload is. */}
            <div
              className="bg-primary-100 mt-2 h-2 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-label={upload.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent ?? undefined}
              aria-valuetext={readout}
            >
              {/* An unknown total slides a short fill back and forth instead of filling the bar:
                  a full bar reads as "done" — and it would then animate *backwards* the moment the
                  first byte arrives and a real percentage appears. */}
              <div
                className={`progress-stripes h-full rounded-full ${
                  upload.resume ? 'bg-error' : 'bg-primary'
                } ${percent === null ? 'progress-indeterminate' : 'transition-[width] duration-200'}`}
                style={percent === null ? undefined : { width: `${percent}%` }}
              />
            </div>

            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="text-base-content/60 text-xs tabular-nums">{readout}</p>
              {remaining !== null && (
                <p className="text-base-content/50 text-xs tabular-nums whitespace-nowrap">
                  {remaining < 60
                    ? t('transfer.secondsLeft', { count: remaining })
                    : t('transfer.minutesLeft', { count: Math.round(remaining / 60) })}
                </p>
              )}
            </div>

            {((upload.cancel && !upload.processing) || upload.resume) && (
              <div className="mt-2 flex gap-2">
                {upload.resume && (
                  <button
                    type="button"
                    className="btn btn-xs btn-primary"
                    onClick={() => upload.resume?.()}
                  >
                    {t('transfer.resume')}
                  </button>
                )}
                {/* Gone once the last byte is in and the server has it: aborting the request from
                    here would not stop the work, it would only hide the result — the file lands,
                    and the screen that asked for it never gets the id to attach it by. */}
                {upload.cancel && !upload.processing && (
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => upload.cancel?.()}
                  >
                    {t('transfer.cancel')}
                  </button>
                )}
                {upload.dismiss && (
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost ml-auto"
                    aria-label={t('transfer.dismiss')}
                    // Not just clearing the card: the upload is waiting on this answer, and
                    // removing the entry without giving it would leave that call pending for good.
                    onClick={() => upload.dismiss?.()}
                  >
                    <Icon name="xmark" style="solid" className="size-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Portalled to the body rather than rendered in place, so its buttons still work while a modal
  // is open.
  //
  // Headless UI's Dialog inerts one element: the `body > *` that contains the main React tree —
  // `disallowed: [mainTreeNode.closest('body > *:not(#headlessui-portal-root)')]` in
  // @headlessui/react 2.2.4. That is the app's own root, so anything rendered *inside* the React
  // tree — as this panel was — is inert whenever a modal is open, and four of the five uploads it
  // shows are started from inside one. Its controls would paint normally and ignore every click.
  // A separate body-level node is outside what Dialog inerts.
  //
  // This leans on a library's internals, and the failure would be silent: buttons that look fine
  // and do nothing. UploadProgressPanel.test.tsx pins the portal target so the mechanism cannot be
  // removed by accident, but it cannot prove the inert behaviour — jsdom does not implement inert.
  // Worth one click in a real browser, from inside a modal, after any Headless UI upgrade.
  return typeof document === 'undefined' ? panel : createPortal(panel, document.body);
}

export default UploadProgressPanel;
