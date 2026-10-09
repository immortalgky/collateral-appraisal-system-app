/**
 * Client-side mirror of the `key:value` shape the backend's LogQueryParser understands
 * (appraisal:, request:, corr:, user:, path:, source:, level:), including its negation prefix
 * (`-key:value` excludes instead of matching) and quoted-phrase tokens. Used only to render/remove
 * filter chips and to append a tag click into the search box — the actual parsing happens
 * server-side; this never needs to be a full re-implementation of it.
 */
export interface QueryToken {
  /** Exact token text as it appears in the query, including any leading '-' — so it can be
   * found-and-removed as a whole token, never as a substring inside another token. */
  raw: string;
  key: string;
  value: string;
  negated: boolean;
}

/** Same shape as the BE parser's own tokenizer: a quoted phrase or a run of non-space characters,
 * either optionally prefixed with '-' to negate it — never split on whitespace inside quotes. */
const TOKEN_SPLIT_RE = /-?"[^"]*"|-?\S+/g;
const KEY_VALUE_RE = /^(-)?(\w+):(.+)$/;

export function tokenizeQuery(q: string): string[] {
  return q.match(TOKEN_SPLIT_RE) ?? [];
}

/** Only unquoted `key:value` tokens become chips — a quoted token (`"phrase"`, negated or not) is
 * always a literal phrase search, never parsed as key:value, matching the BE parser. */
export function extractQueryTokens(q: string): QueryToken[] {
  const tokens: QueryToken[] = [];
  for (const raw of tokenizeQuery(q)) {
    if (raw.includes('"')) continue;
    const match = KEY_VALUE_RE.exec(raw);
    if (!match) continue;
    const [, neg, key, value] = match;
    tokens.push({ raw, key: key.toLowerCase(), value, negated: neg === '-' });
  }
  return tokens;
}

/**
 * Removes the exact token — matched whole via the same tokenizer used to extract it, never as a
 * substring search — so removing `user:bob` can't also strip it out of `xuser:bob`, and a negated
 * token's leading '-' is removed along with it rather than left stranded. Rebuilding from the
 * remaining tokens also normalizes whitespace for free.
 */
export function removeQueryToken(q: string, raw: string): string {
  return tokenizeQuery(q)
    .filter(token => token !== raw)
    .join(' ');
}

/**
 * Appends `key:value` to the query, skipping it when an identical, non-negated token is already
 * present. A value containing whitespace can never be a `key:value` token at all — the BE parser
 * can't read `key:"a b"` — so that case drops the key entirely and appends a plain quoted phrase
 * instead; values here are almost always space-free codes/paths, so this only matters rarely.
 */
export function appendQueryToken(q: string, key: string, value: string): string {
  if (/\s/.test(value)) {
    const raw = `"${value}"`;
    if (tokenizeQuery(q).includes(raw)) return q;
    return q ? `${q} ${raw}` : raw;
  }
  const raw = `${key}:${value}`;
  const already = extractQueryTokens(q).some(
    t => !t.negated && t.key === key.toLowerCase() && t.value === value,
  );
  if (already) return q;
  return q ? `${q} ${raw}` : raw;
}

/**
 * Appends a whole token that's already a complete piece of query syntax — a quoted phrase (from
 * a top-problem) or a bare GUID (an id field with no `key:` of its own) — rather than a key:value
 * pair. Does nothing for an empty piece, and skips re-adding an identical token already present,
 * the same dedupe `appendQueryToken` does for key:value.
 */
export function appendToken(q: string, token: string): string {
  if (!token) return q;
  if (tokenizeQuery(q).includes(token)) return q;
  return q ? `${q} ${token}` : token;
}

/**
 * Keys whose BE clause is an exact equals match (LogQueryParser: appraisal/request/corr/user —
 * never a text scan, unlike path/source). A value containing whitespace can never be sent as
 * `key:value` at all (the BE parser can't read `key:"a b"`), so `appendQueryToken`'s only
 * fallback is a free-text phrase — which would silently search the wrong column for one of these.
 * An empty or whitespace-only value is rejected too — there's nothing meaningful to filter by.
 * Callers check this BEFORE offering a filter link/chip at all, rather than offering one that
 * does the wrong thing (or nothing at all) when clicked. Values here are normally space-free
 * codes/GUIDs, so this only ever matters for odd data.
 */
const EXACT_MATCH_KEYS = new Set(['user', 'corr', 'request', 'appraisal']);

export function canFilterExactMatch(key: string, value: string): boolean {
  if (!EXACT_MATCH_KEYS.has(key)) return true;
  return value.trim().length > 0 && !/\s/.test(value);
}
