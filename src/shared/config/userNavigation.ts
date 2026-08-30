/**
 * Items in the avatar dropdown. Shared by every layout (Layout, TaskLayout,
 * AppraisalLayout) so the list cannot drift apart between them — it previously
 * lived as three verbatim copies and "Your profile" stayed a dead `#` link.
 */
export interface UserNavItem {
  name: string;
  nameKey: string;
  href: string;
  /**
   * Leaves the SPA. Sign out hits the OIDC end-session endpoint on the API
   * origin, so it must be a real navigation rather than a router Link.
   */
  external?: boolean;
}

export const userNavigation: UserNavItem[] = [
  { name: 'Your profile', nameKey: 'userMenu.yourProfile', href: '/profile' },
  {
    name: 'Sign out',
    nameKey: 'userMenu.signOut',
    href: `${import.meta.env.VITE_API_URL}/connect/logout?client_id=spa&post_logout_redirect_uri=${import.meta.env.VITE_APP_URL}/`,
    external: true,
  },
];
