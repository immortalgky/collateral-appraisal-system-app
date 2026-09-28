import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { TransferOptions } from '@shared/api/blobTransfer';
import { openLoadingTab } from '@shared/components/dinoLoader/loadingTab';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';

/** Fetches the bytes to show. Gets the transfer options so progress and cancellation reach it. */
export type BlobFetcher = (options: TransferOptions) => Promise<Blob>;

/**
 * Opens a file in its own tab, whatever produced it.
 *
 * The tab has to be opened inside the click gesture or Safari blocks it, but the blob only exists
 * once the bytes have arrived — so the tab is opened empty, shows the loading page while the
 * fetcher runs, and is pointed at the blob when it resolves. Closing that tab cancels the
 * transfer, and the object URL is released when it goes.
 *
 * Anything that hands back a Blob can use this: a stored document, a report generated on demand.
 */
export const useBlobViewerTab = () => {
  const { t } = useTranslation('common');
  const coarsePointer = useMediaQuery('(hover: none)');

  // Memoised: callers put this (and useViewDocument, which wraps it) in dependency arrays —
  // Appraisal360Page does — and a new closure per render would quietly defeat theirs.
  return useCallback(
    (fetchBlob: BlobFetcher) => {
      // Closing the tab has to stop the transfer: the request belongs to this window, not to the
      // one being closed, so without this a large download would carry on to nowhere.
      const controller = new AbortController();

      const tab = openLoadingTab(
        {
          title: t('documentViewer.title'),
          message: t('documentViewer.opening'),
          hint: coarsePointer ? t('dino.hintTouch') : t('dino.hint'),
          gameOver: `${t('dino.gameOver')} — ${coarsePointer ? t('dino.restartTouch') : t('dino.restart')}`,
          errorTitle: t('documentViewer.errorTitle'),
          downloaded: t('documentViewer.downloaded'),
          close: t('documentViewer.close'),
          cancel: t('documentViewer.cancel'),
        },
        () => controller.abort(),
      );

      if (!tab) {
        toast.error(t('documentViewer.popupBlocked'));
        return;
      }

      fetchBlob({
        onProgress: (loaded, total) => tab.setProgress(loaded, total),
        signal: controller.signal,
        // The tab is the progress indicator for this one; the panel would just repeat it.
        silent: true,
      })
        .then(blob => {
          if (!tab.isOpen()) return; // nothing to show it in, and no blob URL worth holding
          const url = URL.createObjectURL(blob);
          tab.navigate(url);

          // A live object URL pins the whole file in the browser's blob store, so it is released
          // when the tab closes — and only then. Revoking it on a timer while the tab is still open
          // would free nothing the viewer isn't holding anyway, and would break that tab's reload
          // button: the URL it would reload from no longer resolves.
          tab.onceClosed(() => URL.revokeObjectURL(url));
        })
        .catch((error: unknown) => {
          // A tab the user has closed is not a failure, and has nowhere to display one either.
          if (!tab.isOpen()) return;
          // No special case for a stall: TransferStalledError carries its own detail, and it now
          // distinguishes a server that never answered from a connection that died mid-stream —
          // which a fixed "the connection stopped" here would have flattened back into one message.
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          tab.showError(detail || t('documentViewer.failed'));
        });
    },
    [t, coarsePointer],
  );
};
