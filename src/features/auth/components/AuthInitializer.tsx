import { useEffect, useState } from 'react';
import { setAccessToken, refreshClient } from '@shared/api/axiosInstance';
import { useAuthStore } from '../store';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    refreshClient
      .post('/auth/refresh')
      .then(({ data }) => {
        if (data?.accessToken) {
          setAccessToken(data.accessToken);
          useAuthStore.setState({ isAuthenticated: true });
          return;
        }
        // Refresh succeeded (2xx) but no token in the body — treat as unauthenticated.
        setAccessToken(null);
        useAuthStore.setState({ isAuthenticated: false });
      })
      .catch(() => {
        // No valid refresh cookie — clear state; ProtectedRoute will redirect to /login.
        setAccessToken(null);
        useAuthStore.setState({ isAuthenticated: false });
      })
      .finally(() => {
        setIsInitialized(true);
      });
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary"
          role="status"
          aria-label="Initializing"
        />
      </div>
    );
  }

  return <>{children}</>;
}
