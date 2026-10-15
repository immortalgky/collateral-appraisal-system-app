import { describe, it, expect } from 'vitest';
import {
  appendQueryToken,
  appendToken,
  canFilterExactMatch,
  extractQueryTokens,
  removeQueryToken,
} from './queryTokens';

describe('extractQueryTokens', () => {
  it('extracts a negated key:value token and ignores a plain word alongside it', () => {
    expect(extractQueryTokens('-user:los timeout')).toEqual([
      { raw: '-user:los', key: 'user', value: 'los', negated: true },
    ]);
  });

  it('never treats a quoted phrase as a key:value token, even one that looks like key:value', () => {
    expect(extractQueryTokens('"Error:timeout occurred"')).toEqual([]);
  });

  it('extracts two distinct tokens instead of matching one inside the other', () => {
    expect(extractQueryTokens('xuser:bob user:bob')).toEqual([
      { raw: 'xuser:bob', key: 'xuser', value: 'bob', negated: false },
      { raw: 'user:bob', key: 'user', value: 'bob', negated: false },
    ]);
  });
});

describe('removeQueryToken', () => {
  it('removes a negated token with no stray dash left behind', () => {
    expect(removeQueryToken('-user:los timeout', '-user:los')).toBe('timeout');
  });

  it('removes the exact token only, never a same-suffix token that merely contains it', () => {
    expect(removeQueryToken('xuser:bob user:bob', 'user:bob')).toBe('xuser:bob');
    expect(removeQueryToken('xuser:bob user:bob', 'xuser:bob')).toBe('user:bob');
  });

  it('leaves a quoted phrase alone unless it is the exact token being removed', () => {
    expect(removeQueryToken('"Error:timeout occurred" other', '"Error:timeout occurred"')).toBe(
      'other',
    );
  });
});

describe('appendQueryToken', () => {
  it('drops the key and appends a plain quoted phrase for a value containing whitespace, since the BE cannot parse key:"a b"', () => {
    expect(appendQueryToken('', 'corr', 'has space')).toBe('"has space"');
  });

  it('does not append the same quoted phrase twice', () => {
    expect(appendQueryToken('"has space"', 'corr', 'has space')).toBe('"has space"');
  });

  it('skips appending a duplicate non-negated token', () => {
    expect(appendQueryToken('user:bob', 'user', 'bob')).toBe('user:bob');
  });

  it('still appends when the only existing match is negated', () => {
    expect(appendQueryToken('-user:bob', 'user', 'bob')).toBe('-user:bob user:bob');
  });
});

describe('appendToken', () => {
  it('appends a whole token (a phrase or bare GUID) as-is', () => {
    expect(appendToken('timeout', '"failed to send email"')).toBe('timeout "failed to send email"');
    expect(appendToken('', '3f9a8b2e-1234-4abc-9def-abcdef123456')).toBe(
      '3f9a8b2e-1234-4abc-9def-abcdef123456',
    );
  });

  it('does nothing for an empty piece', () => {
    expect(appendToken('timeout', '')).toBe('timeout');
  });

  it('skips re-adding an identical token already present', () => {
    expect(appendToken('"failed to send email"', '"failed to send email"')).toBe(
      '"failed to send email"',
    );
  });
});

describe('canFilterExactMatch', () => {
  it('rejects a whitespace-containing value for an exact-match key (user/corr/request/appraisal)', () => {
    expect(canFilterExactMatch('user', 'john doe')).toBe(false);
    expect(canFilterExactMatch('corr', 'a b')).toBe(false);
    expect(canFilterExactMatch('request', 'a b')).toBe(false);
    expect(canFilterExactMatch('appraisal', 'a b')).toBe(false);
  });

  it('allows a space-free value for an exact-match key', () => {
    expect(canFilterExactMatch('user', 'john.doe')).toBe(true);
  });

  it('allows whitespace for any other key (e.g. path, which is a contains-match, not exact)', () => {
    expect(canFilterExactMatch('path', '/api/v1 something')).toBe(true);
  });

  it('rejects an empty value for an exact-match key', () => {
    expect(canFilterExactMatch('user', '')).toBe(false);
  });

  it('rejects a whitespace-only value for an exact-match key', () => {
    expect(canFilterExactMatch('corr', '   ')).toBe(false);
  });
});
