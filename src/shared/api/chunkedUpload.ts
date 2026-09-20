/**
 * Sending a file in pieces, for files too large to go in one request.
 *
 * The server keeps the part-file and tells us how much of it has arrived; this side never decides
 * where it is in the file on its own. Every answer — success or the 409 that says "not there, here"
 * — carries the offset to send from next, so a dropped connection costs the chunk that was in
 * flight rather than the transfer.
 */

import { postJson, putBlob, TransferCancelledError } from './blobTransfer';
import type { TransferOptions } from './blobTransfer';
import { nextUploadId, useUploadProgressStore } from './uploadProgress';

/**
 * Small enough to pass IIS and the load balancer on their default settings — which is what lets a
 * gigabyte through without anything being reconfigured on the way — and large enough that a 1 GB
 * file is 128 requests rather than thousands.
 */
export const CHUNK_SIZE_BYTES = 8 * 1024 * 1024;

/** Files at or below this go as a single request; the chunked handshake would only cost more. */
export const CHUNKED_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;

/** Tries per chunk before the upload stops and asks the user what to do. */
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1_000, 3_000];

/**
 * How many times to wait out another writer before treating a held upload as a real failure.
 * Contention is measured in moments — the other request is writing one chunk — so it gets its own
 * budget rather than eating the retries meant for a connection that is actually broken.
 */
const MAX_LOCKED_WAITS = 20;
const LOCKED_WAIT_MS = 1_000;

/** A chunk the server refused because another request holds the upload. */
const LOCKED = 423;
/** "Not at that offset" — the body carries the one to use instead. */
const CONFLICT = 409;

/**
 * 4xx answers a later attempt could still succeed at — the same list `queryClient.ts` retries on.
 * A timeout in front of the API and a rate limit both clear on their own; killing a 900 MB upload
 * at chunk 40 because one of them appeared would throw away everything already sent.
 */
const RETRYABLE_4XX = [408, 425, 429];

/**
 * Answers that will not change however many times the same bytes are sent: the upload has expired
 * and been swept, it belongs to someone else, or the request is wrong. Retrying costs four seconds
 * and offering to carry on is worse — it would park, resume against the same dead upload, and
 * park again, with no way out but giving up.
 *
 * Which statuses count depends on who answered. A 409 from a chunk means "not at that offset" and
 * is how a transfer finds its place again; a 409 from the completion means the upload expired or
 * was already closed, and carrying on cannot fix either.
 */
const isPermanentRefusal = (error: unknown, from: 'chunk' | 'complete') => {
  const status = statusOf(error);
  if (status === undefined || status < 400 || status >= 500) return false;
  if (RETRYABLE_4XX.includes(status) || status === LOCKED) return false;
  return status !== CONFLICT || from === 'complete';
};

const markPermanent = (error: unknown) => Object.assign(error as object, { permanent: true });

export type ChunkedUploadRequest = {
  uploadSessionId: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  documentType: string;
  documentCategory: string;
  description?: string | null;
};

type InitResponse = { uploadId: string };
type ChunkAccepted = { receivedBytes: number };

/**
 * True when the server's answer is a real position: past where this side already was, and not past
 * the end of the file. Both ends matter. A number that is short — or missing, which `undefined >
 * offset` quietly answers false to — would be taken as the new offset and re-send old bytes; a
 * number that is *long*, from something in the middle double-counting a re-sent chunk, would end
 * the loop early and complete a file whose tail was never sent.
 */
const advances = (
  received: unknown,
  offset: number,
  end = Number.POSITIVE_INFINITY,
): received is number =>
  typeof received === 'number' && Number.isFinite(received) && received > offset && received <= end;

const statusOf = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

const receivedBytesOf = (error: unknown): number | undefined =>
  (error as { response?: { data?: { receivedBytes?: number } } })?.response?.data?.receivedBytes;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    // Removed on the way out, both ways: a contended upload waits hundreds of times on one signal,
    // and a listener left behind on each of them is a leak that grows with the size of the file.
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal.addEventListener('abort', onAbort, { once: true });
  });

/**
 * Sends one file in chunks and returns whatever the completion answers with.
 *
 * When a chunk cannot be sent after several tries the upload does not fail outright: it offers to
 * carry on, and waits. Carrying on continues *this* upload from the byte the server has reached —
 * the part-file is still there, for a day — so a file that stopped at 95% resumes at 95%. The
 * promise stays pending across that, which is what keeps the caller's own success handling
 * intact: one call, one result, however many attempts it took to get there.
 */
export const uploadFileInChunks = async <T>(
  file: File,
  request: ChunkedUploadRequest,
  options: TransferOptions = {},
): Promise<T> => {
  // `silent` is deliberately not honoured here, unlike in blobTransfer.run: the panel is the only
  // place a parked upload can be told to carry on, so hiding it would leave a stopped 1 GB upload
  // with no way to answer and no way to clear. A caller drawing its own progress gets the panel
  // too, rather than a transfer it cannot steer.
  const { signal, onProgress, label } = options;

  const { data: init } = await postJson<InitResponse>('/documents/chunked-uploads', request, {
    signal,
  });

  const { start, update, fail, resumed, finish } = useUploadProgressStore.getState();
  const entryId = nextUploadId();
  const controller = new AbortController();
  // Checked as well as listened for: the init POST above removes its own listener when it
  // settles, so an abort landing in the gap between that and this line would reach nothing —
  // and addEventListener on a signal that has already aborted never fires.
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  start(entryId, label ?? file.name, 'upload', () => controller.abort());

  const report = (loaded: number) => {
    update(entryId, loaded, file.size);
    onProgress?.(loaded, file.size);
  };

  let offset = 0;

  /** Sends what is left of the file. Throws when it cannot get any further. */
  const sendRemaining = async () => {
    let attempt = 0;
    let lockedWaits = 0;
    // The furthest a 409 has sent us back to. Anything not past it is the server repeating itself.
    let lastConflictOffset = -1;

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE_BYTES);

      try {
        const { data } = await putBlob<ChunkAccepted>(
          `/documents/chunked-uploads/${init.uploadId}`,
          chunk,
          {
            params: { offset },
            signal: controller.signal,
            onProgress: sent => report(offset + sent),
          },
        );

        // Anything but a real position is not progress, and looping on it would spin without ever
        // backing off.
        if (!advances(data?.receivedBytes, offset, file.size))
          throw new Error('The chunk was accepted but not stored');

        offset = data.receivedBytes;
        attempt = 0;
        lockedWaits = 0;
        report(offset);
        continue;
      } catch (error) {
        if (controller.signal.aborted) throw error;

        // Back to what is actually stored. The bytes of a chunk that died in flight were counted
        // as they went out, and leaving them counted would park the card at "97%" over a server
        // holding less than that — and then, on resume, take the inflated figure as the baseline
        // and run the bar backwards.
        report(offset);

        // The server is the authority on where the file has got to. A mismatch is not a failure:
        // it is the answer to a question this side had got wrong, so take the number and carry on
        // without spending an attempt — but only when it is an answer that moves us on. A 409
        // repeating an offset we have already tried is a loop, not an instruction.
        const resumeAt = statusOf(error) === CONFLICT ? receivedBytesOf(error) : undefined;
        if (resumeAt !== undefined && advances(resumeAt, lastConflictOffset, file.size)) {
          lastConflictOffset = resumeAt;
          offset = resumeAt;
          // A new position is a new chunk: the tries spent on the last one do not carry over, or
          // the next chunk could park after a single failure.
          attempt = 0;
          report(offset);
          continue;
        }

        if (statusOf(error) === LOCKED && lockedWaits < MAX_LOCKED_WAITS) {
          lockedWaits += 1;
          await wait(LOCKED_WAIT_MS, controller.signal);
          continue;
        }

        if (isPermanentRefusal(error, 'chunk')) throw markPermanent(error);

        if (attempt >= MAX_ATTEMPTS - 1) throw error;

        await wait(BACKOFF_MS[attempt], controller.signal);
        attempt += 1;
      }
    }
  };

  try {
    for (;;) {
      try {
        await sendRemaining();

        // Says "all there, server working on it" before the wait for the completion begins. It
        // matters most on a *resumed* upload whose chunks were all already sent: sendRemaining
        // returns without a loop, so this is the only thing that moves the card off a full blue
        // bar reading 100% — which looks finished while the server may still have seconds to go.
        report(file.size);

        // Completion is safe to repeat: the document carries the upload's id, so a second call
        // returns the first one's document rather than making another.
        let completed: T;
        try {
          ({ data: completed } = await postJson<T>(
            `/documents/chunked-uploads/${init.uploadId}/complete`,
            {},
            { signal: controller.signal },
          ));
        } catch (error) {
          throw isPermanentRefusal(error, 'complete') ? markPermanent(error) : error;
        }

        return completed;
      } catch (error) {
        if (controller.signal.aborted) throw new TransferCancelledError('upload');

        // Nothing to offer: carrying on would send the same bytes to the same refusal.
        if ((error as { permanent?: boolean })?.permanent) throw error;

        // Parked, not failed. The entry stays on screen with the file's name and how far it got,
        // and this call waits for the answer — so carrying on resumes the same upload instead of
        // starting a new one, and the caller still receives exactly one result.
        const choice = await new Promise<'resume' | 'dismiss'>(resolve => {
          // Cancelling while parked has to end the wait too, or this call never settles and its
          // entry never clears. Taken off again on the way out, like the one in wait(): an upload
          // that parks and resumes repeatedly would otherwise leave one behind on every round.
          const onAbort = () => resolve('dismiss');
          const answer = (choice: 'resume' | 'dismiss') => {
            controller.signal.removeEventListener('abort', onAbort);
            resolve(choice);
          };

          fail(entryId, { resume: () => answer('resume'), dismiss: () => answer('dismiss') });
          controller.signal.addEventListener('abort', onAbort, { once: true });
        });

        if (choice === 'dismiss') {
          throw controller.signal.aborted ? new TransferCancelledError('upload') : error;
        }

        resumed(entryId, () => controller.abort());
      }
    }
  } finally {
    finish(entryId);
  }
};
