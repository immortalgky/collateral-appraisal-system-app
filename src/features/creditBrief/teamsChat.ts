/**
 * A Teams chat deep link for a bank staff member.
 *
 * Keyed on the address in `mail`, which is what LdapAuthenticationService copies out of AD
 * (`Attributes.Email = "mail"`). That is the primary SMTP address; Teams resolves a chat by it as
 * long as the tenant's UPN matches the mail attribute, which is the usual setup but not a
 * guarantee — if the bank's UPN differs, this link opens Teams with nobody resolved. Worth a
 * check against a real account before UAT.
 *
 * The https:// form rather than msteams:// so it also works for someone without the desktop
 * client — teams.microsoft.com hands off to the app when it is installed and falls back to the
 * web client when it is not.
 *
 * Its own module because both the holder card and the appraisal-desk list need it; a second copy
 * would be a second place to fix if the UPN assumption turns out to be wrong.
 */
export const teamsChatUrl = (email: string) =>
  `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`;
