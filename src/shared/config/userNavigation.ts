/**
 * Items in the avatar dropdown. Shared by every layout (Layout, TaskLayout,
 * AppraisalLayout) so the list cannot drift apart between them — it previously
 * lived as three verbatim copies and "Your profile" stayed a dead `#` link.
 */
interface UserNavItemBase {
  name: string;
  nameKey: string;
}

export type UserNavItem =
  | (UserNavItemBase & { href: string; signOut?: false })
  // Ends the session instead of routing: signing out is a POST to the API followed by a
  // full navigation through the identity provider, not a router Link.
  | (UserNavItemBase & { signOut: true; href?: never });

export const userNavigation: UserNavItem[] = [
  { name: 'Your profile', nameKey: 'userMenu.yourProfile', href: '/profile' },
  {
    name: 'Sign out',
    nameKey: 'userMenu.signOut',
    signOut: true,
  },
];
