import { describe, expect, it } from 'vitest';
import { createTestQueryClient } from '@/test/test-utils';
import { feePreviewKeys, invalidateFeePreviews } from './feePreview';

/** invalidateFeePreviews: only the named appraisals' previews when they are known, else all of them. */
describe('invalidateFeePreviews', () => {
  const setup = () => {
    const client = createTestQueryClient();
    const previews = {
      a1: feePreviewKeys.detail('A1', {}),
      a1Typed: feePreviewKeys.detail('A1', { assignmentType: 'external' }),
      a2: feePreviewKeys.detail('A2', {}),
      a3: feePreviewKeys.detail('A3', {}),
    };
    const fees = ['appraisal', 'A1', 'fees'];
    for (const key of [...Object.values(previews), fees]) client.setQueryData(key, {});
    const stale = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated;
    return { client, previews, fees, stale };
  };

  it('touches only the named appraisals (every preview of each), and nothing else', () => {
    const { client, previews, fees, stale } = setup();

    invalidateFeePreviews(client, ['A1', 'A2']);

    expect(stale(previews.a1)).toBe(true);
    expect(stale(previews.a1Typed)).toBe(true);
    expect(stale(previews.a2)).toBe(true);
    expect(stale(previews.a3)).toBe(false);
    expect(stale(fees)).toBe(false);
  });

  it('marks every appraisal when none is named, or the list is empty', () => {
    for (const ids of [undefined, []] as const) {
      const { client, previews, fees, stale } = setup();

      invalidateFeePreviews(client, ids);

      for (const key of Object.values(previews)) expect(stale(key)).toBe(true);
      expect(stale(fees)).toBe(false);
    }
  });
});
