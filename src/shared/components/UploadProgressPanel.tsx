import { useTranslation } from 'react-i18next';
import { useUploadProgressStore } from '@shared/api/uploadProgress';

/** Bytes as MB (or KB below a megabyte) — the numbers people recognise from a file listing. */
const formatSize = (bytes: number): string => {
  const mb = bytes / 1_000_000;
  return mb < 1 ? `${Math.round(bytes / 1000)} KB` : `${mb.toFixed(1)} MB`;
};

/**
 * Shows every upload currently in flight, wherever it was started from.
 *
 * Mounted once per app shell, next to LoadingOverlay. It reads the store that uploadForm feeds, so
 * a screen gets progress for its uploads without knowing this exists — which is what makes it
 * worth having, since uploads are started from a dozen different places.
 *
 * Deliberately not blocking: an upload runs in the background and the user is free to keep
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
      : visible.every(upload => upload.processing)
        ? t('transfer.processing')
        : visible.some(upload => upload.direction === 'upload')
          ? t('transfer.uploading')
          : t('transfer.downloading');

  return (
    // Rendered even when idle: a live region has to exist before its content changes, or the first
    // announcement — the one that matters — is simply never made. pointer-events-none so an empty
    // panel cannot sit over anything.
    //
    // Above every dialog layer in the app (Modal is z-50, the follow-up dialogs go to z-[70]):
    // four of the five uploads that feed this panel are started from inside a modal, and at z-40
    // it spent the whole transfer behind the dimmed backdrop. Headless UI still marks everything
    // outside the dialog aria-hidden while one is open, so the announcement is suppressed there —
    // visible progress is what can be fixed from here.
    <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-72 flex-col gap-2">
      <span className="sr-only" role="status" aria-live="polite">
        {summary}
      </span>

      {visible.map(upload => {
        const percent =
          upload.total === null
            ? null
            : Math.min(100, Math.max(0, Math.round((upload.loaded / upload.total) * 100)));
        const readout = upload.processing
          ? t('transfer.processing')
          : percent === null || upload.total === null
            ? formatSize(upload.loaded)
            : `${percent}% · ${formatSize(upload.loaded)} / ${formatSize(upload.total)}`;

        return (
          <div
            key={upload.id}
            className="border-base-300 bg-base-100 pointer-events-auto rounded-lg border p-3 shadow-lg"
          >
            {/* No cancel button here, though a transfer without a total deadline would clearly
                benefit from one: Headless UI's Dialog marks every body-level sibling `inert` while
                it is open, and four of the five transfers this panel shows are started from inside
                a modal — the button would paint above the backdrop and then silently ignore every
                click, which is worse than not offering it. The document viewer's own tab has a
                working Cancel because it lives in a window of its own. */}
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
                className={`progress-stripes bg-primary h-full rounded-full ${
                  percent === null ? 'progress-indeterminate' : 'transition-[width] duration-200'
                }`}
                style={percent === null ? undefined : { width: `${percent}%` }}
              />
            </div>

            <p className="text-base-content/60 mt-1 text-xs tabular-nums">{readout}</p>
          </div>
        );
      })}
    </div>
  );
}

export default UploadProgressPanel;
