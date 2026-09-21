/**
 * The two calls the app makes that carry a file rather than JSON.
 *
 * The shared axios instance caps every request at 10 seconds, which is right for a JSON call and
 * wrong for anything with a file in it: a 50 MB upload needs 5 MB/s sustained to make that
 * deadline, which no branch line provides, and a report has to be generated before its first byte
 * is even sent. Callers used to inherit that cap silently, so a perfectly good transfer was
 * aborted and — because an aborted axios request has no `response` — the error handler fell
 * through to a generic message, usually one blaming the file the server never read.
 *
 * So these transfers have no total deadline at all. What they have instead is a watchdog on
 * *inactivity*, which is the thing that actually distinguishes a slow line from a dead one:
 * every progress event resets it, and only silence ends the transfer.
 */

import type { AxiosProgressEvent, AxiosRequestConfig, AxiosResponse } from 'axios';
import i18n from '@/i18n';
import axios from './axiosInstance';
import { nextUploadId, useUploadProgressStore } from './uploadProgress';

/** No total deadline: see above. Idle time is what gets measured. */
const NO_TOTAL_TIMEOUT = 0;

/**
 * Silence while the server works — before the first byte of a download, or after the last byte of
 * an upload has been handed over. Generating a report or writing 50 MB to the NAS takes a while
 * and looks exactly like a stall from here, so this window is generous: an operational export over
 * a wide date range runs for minutes before it sends anything, and killing it to report "the
 * connection stopped" would be both wrong and unactionable.
 */
export const SERVER_WORKING_TIMEOUT_MS = 600_000;

/**
 * Silence in the middle of a transfer that was already flowing. Closer to a dead connection — but
 * not conclusive either: a streamed export can flush its headers early and then spend a while on
 * the next batch, so this is not as tight as it could be. Nothing the client can see tells the two
 * apart, and aborting a transfer that was about to succeed is the worse mistake of the two.
 */
const IDLE_TIMEOUT_MS = 120_000;

/**
 * Raised when a transfer is stopped on purpose — the panel's Cancel, or a caller's own signal.
 *
 * Without it an abort surfaces as a plain axios cancellation with no `apiError`, and every
 * caller's generic handler says "Failed to upload deed.pdf" about something the user chose to do.
 */
export class TransferCancelledError extends Error {
  readonly apiError: { detail: string };

  constructor(direction: 'upload' | 'download') {
    super(`The ${direction} was cancelled`);
    this.name = 'TransferCancelledError';
    this.apiError = { detail: i18n.t(`common:transfer.${direction}Cancelled`) };
  }
}

/**
 * Raised when the watchdog fires, so a caller can say "the connection stopped" instead of
 * "the file could not be read" — the two need very different things from the user.
 */
export class TransferStalledError extends Error {
  readonly direction: 'upload' | 'download';

  /**
   * Which silence ran out. `waiting` is the server taking too long to produce or store anything —
   * the connection is fine; `streaming` is bytes that were flowing and stopped, which is what a
   * dead line looks like. Telling the user the wrong one sends them after the wrong problem.
   */
  readonly phase: 'waiting' | 'streaming';

  /**
   * Shaped like the `apiError` the response interceptor attaches, because that is what every
   * error handler in the app reaches for. Without it a stalled transfer falls through to whatever
   * generic message the caller has — usually one that blames the file the server never read.
   */
  readonly apiError: { detail: string };

  constructor(direction: 'upload' | 'download', phase: 'waiting' | 'streaming') {
    super(`The ${direction} stalled while ${phase}`);
    this.name = 'TransferStalledError';
    this.direction = direction;
    this.phase = phase;
    this.apiError = {
      detail:
        phase === 'waiting'
          ? i18n.t('common:transfer.serverTooSlow')
          : i18n.t(`common:transfer.${direction}Stalled`),
    };
  }
}

/** `total` is null when the response carries no usable Content-Length — show something indeterminate. */
export type TransferProgress = (loaded: number, total: number | null) => void;

export type TransferOptions = {
  onProgress?: TransferProgress;
  /** Aborts the transfer — a viewer passes the signal it fires when its tab is closed. */
  signal?: AbortSignal;
  params?: Record<string, unknown>;
  /** What the progress panel calls this transfer. Defaults to a generic "uploading"/"downloading". */
  label?: string;
  /**
   * Keep this transfer out of the progress panel. For callers that show their own — the document
   * viewer's tab, the quotation preview — where a second indicator would just be noise.
   */
  silent?: boolean;
};

/**
 * Recover the server's own message from an error response.
 *
 * These requests ask for a Blob, so an error body arrives as one too — and the ProblemDetails the
 * response interceptor normally lifts into `apiError` is never seen, leaving every caller to fall
 * back on a generic message. A 403 that says exactly why is worth more than "the file could not be
 * opened", so read it back and fill `apiError` in ourselves.
 */
const recoverProblemDetails = async (error: unknown): Promise<void> => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  // Not gated on the content type: a gateway that rewrites or strips it would otherwise cost the
  // user the one message worth reading. Gated on size instead, so this never pulls a real payload
  // into a string — an error body that large is not a ProblemDetails anyway.
  if (!(data instanceof Blob) || data.size > 64 * 1024) return;

  try {
    const problem = JSON.parse(await data.text()) as { detail?: string; title?: string };
    const detail = problem?.detail ?? problem?.title;
    if (detail) {
      // Merged, not replaced: the interceptor has already put status, errorCode and the rest in
      // there, and callers branch on them — downloadReportJobPdf's 409/410 handling reads
      // `apiError.status`. `message` is refreshed alongside `detail` because that is what
      // getErrorMessage() shows, and the interceptor could only fill it with a generic line for a
      // Blob body; `title` is left alone unless this one actually carries it.
      const target = error as { apiError?: Record<string, unknown> };
      target.apiError = {
        ...target.apiError,
        detail,
        message: detail,
        ...(problem?.title ? { title: problem.title } : {}),
      };
    }
  } catch {
    // Not JSON after all, or unreadable — the generic message stands.
  }
};

const run = async <T>(
  send: (config: AxiosRequestConfig) => Promise<AxiosResponse<T>>,
  direction: 'upload' | 'download',
  { onProgress, signal, label, silent }: TransferOptions,
): Promise<AxiosResponse<T>> => {
  const controller = new AbortController();

  // Registered here rather than in the two public functions so a download gets the same panel an
  // upload does: without it, "save this document" was a spinner with no progress and — now that
  // there is no total deadline — no way out either.
  const { start, update, finish } = useUploadProgressStore.getState();
  const id = silent ? null : nextUploadId();
  if (id !== null) {
    start(
      id,
      label ?? i18n.t(`common:transfer.${direction === 'upload' ? 'uploading' : 'downloading'}`),
      direction,
      // The panel gets the same handle the caller's own signal pulls. Until now a transfer could
      // only be stopped by whoever started it, and almost nothing passed a signal — so a 20-minute
      // upload of the wrong file had to be waited out.
      () => controller.abort(),
    );
  }
  let stalled = false;
  let phase: 'waiting' | 'streaming' = 'waiting';
  let watchdog: ReturnType<typeof setTimeout> | undefined;

  const arm = (ms: number) => {
    clearTimeout(watchdog);
    phase = ms === SERVER_WORKING_TIMEOUT_MS ? 'waiting' : 'streaming';
    watchdog = setTimeout(() => {
      stalled = true;
      controller.abort();
    }, ms);
  };

  const onTransferProgress = (event: AxiosProgressEvent) => {
    // `loaded` counts decoded bytes while `total` comes from Content-Length, which on a compressed
    // response describes the wire size — different quantities, so `loaded` sails past `total` well
    // before the file has arrived. Once that happens the number is not a total of anything, and
    // calling it unknown shows a moving bar instead of "100% · 41.0 MB / 12.0 MB".
    const reported = event.total && event.total > 0 ? event.total : null;
    const total = reported !== null && event.loaded > reported ? null : reported;

    if (id !== null) {
      update(id, event.loaded, total);
    }
    // Both directions have a phase where silence means "the server has it now", not "the line is
    // dead". For an upload that is everything past the last byte — or the whole transfer when the
    // browser cannot size it, since that moment cannot be spotted.
    //
    // For a download it is only the wait before the first byte, which the initial arm already
    // covers (progress events fire once bytes arrive, so `loaded === 0` is rarely seen here). It
    // is deliberately *not* "the response has no Content-Length": a chunked response is as likely
    // to be a compressing proxy as a report streamed as it is built, and treating every chunk of
    // one as "the server is working" meant a connection dying halfway through a 30 MB download
    // went unreported for ten minutes and then blamed the server for being slow — the wrong
    // diagnosis, which is the one thing `phase` exists to avoid.
    const serverMayBeWorking =
      direction === 'upload' ? total === null || event.loaded >= total : event.loaded === 0;
    arm(serverMayBeWorking ? SERVER_WORKING_TIMEOUT_MS : IDLE_TIMEOUT_MS);
    onProgress?.(event.loaded, total);
  };

  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort);

  arm(SERVER_WORKING_TIMEOUT_MS);
  try {
    return await send({
      signal: controller.signal,
      timeout: NO_TOTAL_TIMEOUT,
      ...(direction === 'download'
        ? { onDownloadProgress: onTransferProgress }
        : { onUploadProgress: onTransferProgress }),
    });
  } catch (error) {
    // The abort surfaces as a plain cancellation, so the reason has to be carried out separately.
    if (stalled) throw new TransferStalledError(direction, phase);
    if (controller.signal.aborted) throw new TransferCancelledError(direction);
    await recoverProblemDetails(error);
    throw error;
  } finally {
    clearTimeout(watchdog);
    signal?.removeEventListener('abort', abort);
    if (id !== null) finish(id);
  }
};

/** GETs a file as a Blob. The full response is returned so callers can read Content-Disposition. */
export const downloadBlob = (
  url: string,
  options: TransferOptions = {},
): Promise<AxiosResponse<Blob>> =>
  run<Blob>(
    config => axios.get<Blob>(url, { ...config, params: options.params, responseType: 'blob' }),
    'download',
    options,
  );

/**
 * POSTs a multipart body, and reports itself to the upload panel for the duration. Registering
 * here rather than in each screen is the point: one choke point, and every upload in the app is
 * visible without its caller doing anything.
 */
export const uploadForm = <T>(
  url: string,
  formData: FormData,
  options: TransferOptions = {},
): Promise<AxiosResponse<T>> =>
  run<T>(
    config =>
      axios.post<T>(url, formData, {
        ...config,
        params: options.params,
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    'upload',
    options,
  );

/**
 * PUTs raw bytes — one piece of a file being sent in chunks.
 *
 * Always `silent`: the caller is a loop sending many of these for a single file, and one panel
 * entry per chunk would replace a progress bar with a stampede. The loop registers the file once
 * and reports the total itself.
 */
export const putBlob = <T>(
  url: string,
  body: Blob,
  options: TransferOptions = {},
): Promise<AxiosResponse<T>> =>
  run<T>(
    config =>
      axios.put<T>(url, body, {
        ...config,
        params: options.params,
        headers: { 'Content-Type': 'application/octet-stream' },
      }),
    'upload',
    { ...options, silent: true },
  );

/**
 * POSTs JSON through the same machinery as a transfer.
 *
 * For the requests that bracket a large upload — opening one, and closing it once the bytes are
 * all there. They carry almost nothing, but the closing one waits while the server hashes a
 * gigabyte, and the shared axios instance would give up on it after ten seconds.
 */
export const postJson = <T>(
  url: string,
  body: unknown,
  options: TransferOptions = {},
): Promise<AxiosResponse<T>> =>
  run<T>(config => axios.post<T>(url, body, { ...config, params: options.params }), 'upload', {
    ...options,
    silent: true,
  });
