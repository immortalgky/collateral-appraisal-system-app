import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CHUNK_SIZE_BYTES, uploadFileInChunks } from './chunkedUpload';
import { useUploadProgressStore } from './uploadProgress';

// The transport is stubbed: what is worth testing here is who decides the offset, what a 409 does
// to it, and what is left on screen when the upload gives up — none of which involves axios.
const { postJson, putBlob } = vi.hoisted(() => ({
  postJson: vi.fn(),
  putBlob: vi.fn(),
}));

// TransferCancelledError included deliberately: the module imports it, and a mock that omits an
// import throws on first access — so the cancel path would fail with a mock error rather than an
// assertion, which is the least useful way for a test to fail.
vi.mock('./blobTransfer', () => ({
  postJson,
  putBlob,
  TransferCancelledError: class TransferCancelledError extends Error {
    apiError = { detail: 'cancelled' };
  },
}));

const fileOf = (bytes: number) =>
  new File([new Uint8Array(bytes)], 'deed-scan.pdf', { type: 'application/pdf' });

const request = {
  uploadSessionId: 'session-1',
  fileName: 'deed-scan.pdf',
  fileSizeBytes: 0,
  contentType: 'application/pdf',
  documentType: 'D001',
  documentCategory: 'REQ',
  description: null,
};

/** Every PUT accepts what it was sent, like a server with nothing going wrong. */
const acceptsEverything = () =>
  putBlob.mockImplementation((_url: string, chunk: Blob, options: { params: { offset: number } }) =>
    Promise.resolve({ data: { receivedBytes: options.params.offset + chunk.size } }),
  );

const httpError = (status: number, data?: unknown) => ({ response: { status, data } });

beforeEach(() => {
  vi.clearAllMocks();
  useUploadProgressStore.setState({ uploads: [] });
  postJson.mockImplementation((url: string) =>
    url.endsWith('/complete')
      ? Promise.resolve({ data: { documentId: 'doc-1' } })
      : Promise.resolve({ data: { uploadId: 'upload-1' } }),
  );
});

describe('uploadFileInChunks', () => {
  it('sends the file one chunk at a time and completes', async () => {
    acceptsEverything();
    const size = CHUNK_SIZE_BYTES * 2 + 1024;

    const result = await uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });

    expect(result).toEqual({ documentId: 'doc-1' });
    expect(putBlob.mock.calls.map(call => call[2].params.offset)).toEqual([
      0,
      CHUNK_SIZE_BYTES,
      CHUNK_SIZE_BYTES * 2,
    ]);
    expect(postJson).toHaveBeenLastCalledWith(
      '/documents/chunked-uploads/upload-1/complete',
      {},
      expect.anything(),
    );
  });

  it('takes the offset from the server when a chunk lands in the wrong place', async () => {
    const size = CHUNK_SIZE_BYTES * 2;
    let first = true;

    putBlob.mockImplementation(
      (_url: string, chunk: Blob, options: { params: { offset: number } }) => {
        if (first) {
          first = false;
          // The server already has half a chunk more than this side thought.
          return Promise.reject(httpError(409, { receivedBytes: CHUNK_SIZE_BYTES / 2 }));
        }
        return Promise.resolve({ data: { receivedBytes: options.params.offset + chunk.size } });
      },
    );

    await uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });

    // Resumed from where the server said it was, not from where this side had got to.
    expect(putBlob.mock.calls.map(call => call[2].params.offset)).toEqual([
      0,
      CHUNK_SIZE_BYTES / 2,
      CHUNK_SIZE_BYTES + CHUNK_SIZE_BYTES / 2,
    ]);
  });

  it('stops after three tries and waits for an answer rather than failing', async () => {
    vi.useFakeTimers();
    const size = CHUNK_SIZE_BYTES;
    putBlob.mockRejectedValue(new Error('network gone'));

    const pending = uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });
    await vi.runAllTimersAsync();

    expect(putBlob).toHaveBeenCalledTimes(3);

    // Not settled: the upload is holding its result until the user says what to do with it.
    const [entry] = useUploadProgressStore.getState().uploads;
    expect(entry.resume).toBeTypeOf('function');
    expect(entry.dismiss).toBeTypeOf('function');

    const settled = expect(pending).rejects.toThrow('network gone');
    entry.dismiss?.();
    await vi.runAllTimersAsync();
    await settled;

    expect(useUploadProgressStore.getState().uploads).toHaveLength(0);
    vi.useRealTimers();
  });

  it('carries on from where the server got to, in the same upload', async () => {
    vi.useFakeTimers();
    const size = CHUNK_SIZE_BYTES * 2;

    // The first chunk lands, then the connection dies for the rest of this attempt.
    let sent = 0;
    putBlob.mockImplementation(
      (_url: string, chunk: Blob, options: { params: { offset: number } }) => {
        sent += 1;
        if (sent === 1) {
          return Promise.resolve({ data: { receivedBytes: options.params.offset + chunk.size } });
        }
        if (sent <= 4) return Promise.reject(new Error('network gone'));
        return Promise.resolve({ data: { receivedBytes: options.params.offset + chunk.size } });
      },
    );

    const pending = uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });
    await vi.runAllTimersAsync();

    const [entry] = useUploadProgressStore.getState().uploads;
    entry.resume?.();
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual({ documentId: 'doc-1' });

    // One init for the whole thing: carrying on continued the upload rather than starting another.
    expect(
      postJson.mock.calls.filter(call => call[0] === '/documents/chunked-uploads'),
    ).toHaveLength(1);
    // And it picked up at the second chunk, not back at the beginning.
    expect(putBlob.mock.calls.at(-1)?.[2].params.offset).toBe(CHUNK_SIZE_BYTES);

    vi.useRealTimers();
  });

  it('does not spin when a chunk is accepted without being stored', async () => {
    vi.useFakeTimers();
    const size = CHUNK_SIZE_BYTES;
    // Something between here and the server swallows the body and answers cheerfully.
    putBlob.mockResolvedValue({ data: { receivedBytes: 0 } });

    const pending = uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });
    await vi.runAllTimersAsync();

    expect(putBlob).toHaveBeenCalledTimes(3);
    const [entry] = useUploadProgressStore.getState().uploads;
    const settled = expect(pending).rejects.toThrow('not stored');
    entry.dismiss?.();
    await vi.runAllTimersAsync();
    await settled;

    vi.useRealTimers();
  });

  it('waits and retries when another request holds the upload', async () => {
    vi.useFakeTimers();
    const size = CHUNK_SIZE_BYTES;
    putBlob
      .mockRejectedValueOnce(httpError(423))
      .mockImplementation((_url: string, chunk: Blob, options: { params: { offset: number } }) =>
        Promise.resolve({ data: { receivedBytes: options.params.offset + chunk.size } }),
      );

    const pending = uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual({ documentId: 'doc-1' });
    expect(putBlob).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('reports a cancellation as cancelled, not as a failure', async () => {
    const size = CHUNK_SIZE_BYTES;
    const controller = new AbortController();

    putBlob.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });

    // The type is the assertion, not the wording: callers branch on it to say "cancelled" rather
    // than "failed", and the wording itself comes from the locale files.
    await expect(
      uploadFileInChunks(
        fileOf(size),
        { ...request, fileSizeBytes: size },
        { signal: controller.signal },
      ),
    ).rejects.toSatisfy((error: Error) => error.constructor.name === 'TransferCancelledError');

    expect(useUploadProgressStore.getState().uploads).toHaveLength(0);
  });

  it('falls back to what the server holds when a chunk dies in flight', async () => {
    vi.useFakeTimers();
    const size = CHUNK_SIZE_BYTES * 2;

    putBlob.mockImplementation(
      (
        _url: string,
        chunk: Blob,
        options: { params: { offset: number }; onProgress?: (sent: number) => void },
      ) => {
        if (options.params.offset === 0) {
          return Promise.resolve({ data: { receivedBytes: chunk.size } });
        }
        // The second chunk reports progress and then dies partway.
        options.onProgress?.(3_000_000);
        return Promise.reject(new Error('network gone'));
      },
    );

    const pending = uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });
    await vi.runAllTimersAsync();

    // Parked at what the server actually has — not at the bytes that went out and were lost.
    const [entry] = useUploadProgressStore.getState().uploads;
    expect(entry.loaded).toBe(CHUNK_SIZE_BYTES);

    const settled = expect(pending).rejects.toThrow('network gone');
    entry.dismiss?.();
    await vi.runAllTimersAsync();
    await settled;
    vi.useRealTimers();
  });

  it('gives up at once on a refusal that will not change', async () => {
    vi.useFakeTimers();
    const size = CHUNK_SIZE_BYTES;
    // The upload expired and was swept: the same bytes will be refused forever.
    putBlob.mockRejectedValue(httpError(404));

    const pending = uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });
    const settled = expect(pending).rejects.toBeDefined();
    await vi.runAllTimersAsync();
    await settled;

    // One try, not three, and nothing left offering to carry on.
    expect(putBlob).toHaveBeenCalledTimes(1);
    expect(useUploadProgressStore.getState().uploads).toHaveLength(0);
    vi.useRealTimers();
  });

  it('refuses an offset past the end of the file', async () => {
    vi.useFakeTimers();
    const size = CHUNK_SIZE_BYTES * 2;
    // Something in the middle counted a re-sent chunk twice. Believing it would end the loop with
    // the file's tail never sent, and then ask the server to complete it.
    putBlob.mockResolvedValue({ data: { receivedBytes: size + 1 } });

    const pending = uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });
    const settled = expect(pending).rejects.toThrow('not stored');
    await vi.runAllTimersAsync();
    const [entry] = useUploadProgressStore.getState().uploads;
    entry.dismiss?.();
    await vi.runAllTimersAsync();
    await settled;

    expect(postJson.mock.calls.some(call => String(call[0]).endsWith('/complete'))).toBe(false);
    vi.useRealTimers();
  });

  it('waits out a rate limit rather than throwing the transfer away', async () => {
    vi.useFakeTimers();
    const size = CHUNK_SIZE_BYTES;
    // Something in front of the API is shedding load. It clears; the bytes already sent should not
    // be lost over it.
    putBlob
      .mockRejectedValueOnce(httpError(429))
      .mockImplementation((_url: string, chunk: Blob, options: { params: { offset: number } }) =>
        Promise.resolve({ data: { receivedBytes: options.params.offset + chunk.size } }),
      );

    const pending = uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual({ documentId: 'doc-1' });
    expect(putBlob).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('does not offer to carry on when the completion says the upload is gone', async () => {
    vi.useFakeTimers();
    acceptsEverything();
    const size = CHUNK_SIZE_BYTES;
    // Every chunk arrived, but the upload was swept before the completion reached it. Resuming
    // would re-send nothing and ask the same dead upload to finish, forever.
    postJson.mockImplementation((url: string) =>
      url.endsWith('/complete')
        ? Promise.reject(httpError(409))
        : Promise.resolve({ data: { uploadId: 'upload-1' } }),
    );

    const pending = uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });
    const settled = expect(pending).rejects.toBeDefined();
    await vi.runAllTimersAsync();
    await settled;

    expect(useUploadProgressStore.getState().uploads).toHaveLength(0);
    vi.useRealTimers();
  });

  it('clears its progress entry once the upload is done', async () => {
    acceptsEverything();
    const size = CHUNK_SIZE_BYTES;

    await uploadFileInChunks(fileOf(size), { ...request, fileSizeBytes: size });

    expect(useUploadProgressStore.getState().uploads).toHaveLength(0);
  });
});
