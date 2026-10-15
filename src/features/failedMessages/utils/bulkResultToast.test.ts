import { describe, it, expect, vi } from 'vitest';
import en from '@/i18n/locales/en/failedMessages.json';
import { CONSUMER_SKIP_REASON_KEY, OUTBOX_SKIP_REASON_KEY } from './bulkResultToast';

// react-hot-toast's import has side effects (mounts a portal); stub it so this test only exercises
// the pure key-lookup logic.
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Resolves a dotted path ("skipReason.NotFound") against the imported locale JSON.
function resolveKey(dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, en);
}

// Mirrors the contract's `skipped[].reason` unions (api-contract.md).
const RETRY_REASONS = ['NotFound', 'NotPending', 'TooSoon'] as const;
const DISCARD_REASONS = ['NotFound', 'NotPending', 'Publishing'] as const;
const OUTBOX_RESEND_REASONS = ['NotFound', 'NotFailed', 'UnknownModule'] as const;

describe('CONSUMER_SKIP_REASON_KEY', () => {
  it.each(RETRY_REASONS)('has a key for retry reason %s, present in en locale', reason => {
    const key = CONSUMER_SKIP_REASON_KEY[reason];
    expect(key).toBeDefined();
    expect(typeof resolveKey(key)).toBe('string');
  });

  it.each(DISCARD_REASONS)('has a key for discard reason %s, present in en locale', reason => {
    const key = CONSUMER_SKIP_REASON_KEY[reason];
    expect(key).toBeDefined();
    expect(typeof resolveKey(key)).toBe('string');
  });
});

describe('OUTBOX_SKIP_REASON_KEY', () => {
  it.each(OUTBOX_RESEND_REASONS)('has a key for resend reason %s, present in en locale', reason => {
    const key = OUTBOX_SKIP_REASON_KEY[reason];
    expect(key).toBeDefined();
    expect(typeof resolveKey(key)).toBe('string');
  });
});

describe('skipReason.other', () => {
  it('exists in the en locale for an unrecognised future reason', () => {
    expect(typeof resolveKey('skipReason.other')).toBe('string');
  });
});
