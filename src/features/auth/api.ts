import { queryOptions, replaceEqualDeep, useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';
import { queryClient } from '@app/queryClient';
import axios from '@shared/api/axiosInstance';
import { allRoles } from '@features/userManagement/roleMeta';
import type { UserRole } from '@shared/config/navigationTypes';
import type { User } from './types';
import { useAuthStore } from './store';
import { goHomeAsNewUser } from './utils/auth';

// Narrow backend-provided role strings to our canonical UserRole union.
// Unknown roles are silently dropped so a typo or stale backend value can't
// accidentally grant nav access.
const KNOWN_ROLES = new Set<string>(allRoles);
const normalizeRoles = (roles: unknown): UserRole[] => {
  if (!Array.isArray(roles)) return [];
  return roles.filter((r): r is UserRole => typeof r === 'string' && KNOWN_ROLES.has(r));
};

// GET /auth/me and publish the result to the auth store (unless it is identical to what it holds).
export const fetchCurrentUser = async (config?: AxiosRequestConfig): Promise<User> => {
  const { data } = await axios.get('/auth/me', config);
  const fetched: User = {
    ...data,
    name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.username || '',
    roles: normalizeRoles(data.roles),
  };
  // The browser has one session cookie: if another tab signed in as someone else, this tab's next
  // request would run as them. Start over at the home page as the user the cookie really belongs
  // to. Never publish the other user here: the throw below makes this call fail, and if the
  // navigation silently did not happen the store keeps the user this tab was built for, so the next
  // check refuses (and navigates) again.
  const { user: current, isAuthenticated, setUser } = useAuthStore.getState();
  if (current && fetched.id !== current.id) {
    goHomeAsNewUser();
    throw new Error('The session now belongs to a different user');
  }
  // Keep the current object when nothing changed: a keep-alive or access-window check every few
  // minutes must not hand every `useAuthStore(s => s.user)` subscriber a new reference to re-render.
  const user = replaceEqualDeep(current, fetched);
  if (user !== current || !isAuthenticated) setUser(user);
  return user;
};

// Everything that reads the signed-in user through the query cache shares these options, so the
// cache, the store and the boot/keep-alive/access-window checks can never disagree on the key.
export const currentUserQueryOptions = queryOptions({
  queryKey: ['currentUser'],
  queryFn: () => fetchCurrentUser(),
});

// Re-read /auth/me now, bypassing the cache (a keep-alive, an access-window check, a gate that
// changed mid-session). TanStack dedupes concurrent calls, so a burst makes one request.
export const refreshCurrentUser = () =>
  queryClient.fetchQuery({ ...currentUserQueryOptions, staleTime: 0, retry: false });

// Function to get the current user profile
export const useCurrentUser = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  // Only run if we have an authenticated session
  return useQuery({ ...currentUserQueryOptions, enabled: isAuthenticated });
};
