import type { UserRole } from '@shared/config/navigationTypes';

export interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  avatarUrl: string;
  position: string;
  department: string;
  /**
   * Roles held by the user. A user can hold multiple roles simultaneously.
   * Filtered at the API boundary in `useCurrentUser` so only values from the
   * canonical `UserRole` union reach the store — unknown strings are dropped.
   */
  roles: UserRole[];
  permissions: string[];
  /**
   * Company ID for ExtAdmin users. Sourced from `/auth/me`.
   * Only populated when the user belongs to an external company.
   */
  companyId?: string;
  /**
   * When true the user must set a new password before using the app (newly created
   * Local account, or admin password reset). Enforced by ProtectedRoute.
   */
  mustChangePassword?: boolean;
  /**
   * End of the account's access window, in the server's local time with no zone suffix — only
   * temporary-access accounts have one. Sourced from `/auth/me`.
   */
  accessExpiresAt?: string | null;
}
