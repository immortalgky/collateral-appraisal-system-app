/** Splits a space-or-comma separated string into a trimmed, non-empty list (pasted resource names). */
export const splitList = (value: string): string[] =>
  value
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean);
