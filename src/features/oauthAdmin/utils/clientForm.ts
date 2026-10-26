// Mirrors the server bounds in ClientPermissionMapper. Access and identity tokens are bearer
// credentials that cannot be revoked before they expire, so they are capped far shorter than the
// refresh token, which is a reference token checked against the database on every use.
export const MAX_SHORT_LIVED_MINUTES = 24 * 60;
export const MAX_REFRESH_MINUTES = 30 * 24 * 60;

// Upload session lifetime is entered in hours or days and always sent as whole hours (1h-30d).
export const MAX_UPLOAD_SESSION_DAYS = 30;
export const MAX_UPLOAD_SESSION_HOURS = MAX_UPLOAD_SESSION_DAYS * 24;
export type UploadSessionUnit = 'hours' | 'days';

/** The scopes OpenID Connect defines itself: always offered, never registered. */
export const STANDARD_SCOPES = ['openid', 'email', 'profile', 'roles'] as const;

/** Empty means "inherit the server default", so it is sent as null rather than a number. */
export const toOptionalNumber = (value: string): number | null =>
  value.trim() ? Number(value) : null;

/** Empty stays null (server default). Callers validate first, so the product is a whole hour count. */
export const toHours = (value: string, unit: UploadSessionUnit): number | null => {
  const amount = toOptionalNumber(value);
  return amount === null ? null : amount * (unit === 'days' ? 24 : 1);
};

/**
 * Empty is valid (it means "server default"). Anything else must be a whole number within `max`, in
 * whatever unit the field uses. The check matters because the value arrives as free text: without it
 * a malformed entry would be submitted as typed, and a decimal would fail JSON binding server-side
 * and surface as a bare 400 with no message.
 */
export const isLifetimeValid = (value: string, max: number): boolean => {
  const trimmed = value.trim();
  if (trimmed === '') return true;
  // Digits only. Number() would happily accept "1e3" and "+5" and submit 1000 or 5 while the
  // field still displays what was typed.
  if (!/^\d+$/.test(trimmed)) return false;
  const parsed = Number(trimmed);
  return parsed >= 1 && parsed <= max;
};
