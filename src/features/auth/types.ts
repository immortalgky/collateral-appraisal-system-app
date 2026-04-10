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
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}
