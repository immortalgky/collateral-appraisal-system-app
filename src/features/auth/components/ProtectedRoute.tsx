import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store.ts';
import { useCurrentUser } from '../api.ts';
import { getAccessToken } from '@shared/api/axiosInstance';
import type { JSX } from 'react';

export function ProtectedRoute({ component }: { component: JSX.Element }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const hasToken = !!getAccessToken();
  const { isLoading } = useCurrentUser();

  // No token and not authenticated → go to login
  if (!hasToken && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Has token but still validating → show spinner
  if (!isAuthenticated && isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary"
          role="status"
          aria-label="Authenticating"
        />
      </div>
    );
  }

  return component;
}
