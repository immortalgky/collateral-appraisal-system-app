/**
 * `auth.AspNetUsers.AuthSource` is a free-form string, and the backend classifies it
 * rather than comparing a literal — see `AuthSources.IsLdap` (Trim + OrdinalIgnoreCase),
 * which exists because legacy/hand-edited rows carry values like "Ldap" or " LDAP".
 * Mirror that here so the UI never disagrees with the server about which account is
 * AD-backed (an editable form whose edits AD overwrites, or a Change Password button
 * whose POST the server rejects).
 */
export const isLdapAuthSource = (source: string | null | undefined): boolean =>
  source?.trim().toUpperCase() === 'LDAP';
