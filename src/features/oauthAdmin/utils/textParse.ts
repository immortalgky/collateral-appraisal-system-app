/** Splits a space-or-comma separated string into a trimmed, non-empty list (scopes, resources). */
export const splitList = (value: string): string[] =>
  value
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean);

/** Splits a newline-separated string into a trimmed, non-empty list (redirect URIs). */
export const splitLines = (value: string): string[] =>
  value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
