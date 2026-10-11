import { beforeEach, describe, expect, it } from 'vitest';
import { isUploadBusy, useUploadProgressStore } from './uploadProgress';

describe('isUploadBusy', () => {
  beforeEach(() => useUploadProgressStore.setState({ uploads: [], batches: [] }));

  it('is idle with nothing running', () => {
    expect(isUploadBusy('request')).toBe(false);
  });

  it('stays busy for a whole batch, including the gap between its files', () => {
    const end = useUploadProgressStore.getState().beginBatch('request');
    expect(isUploadBusy('request')).toBe(true);
    end();
    end(); // ending twice must not take another batch's hold with it
    expect(isUploadBusy('request')).toBe(false);
  });

  it('counts overlapping batches of one scope separately', () => {
    const { beginBatch } = useUploadProgressStore.getState();
    const first = beginBatch('request');
    const second = beginBatch('request');
    first();
    expect(isUploadBusy('request')).toBe(true);
    second();
    expect(isUploadBusy('request')).toBe(false);
  });

  it('counts only the scope asked about, and ignores plain transfers elsewhere in the app', () => {
    const { beginBatch, start, finish } = useUploadProgressStore.getState();
    start(9, 'elsewhere.pdf', 'upload'); // some other screen's upload
    const other = beginBatch('other-screen');
    expect(isUploadBusy('request')).toBe(false);
    const mine = beginBatch('request');
    expect(isUploadBusy('request')).toBe(true);
    expect(isUploadBusy('other-screen')).toBe(true);
    mine();
    expect(isUploadBusy('request')).toBe(false);
    other();
    finish(9);
  });
});
