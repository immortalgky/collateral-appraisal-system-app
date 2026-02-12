import { useCurrentUser } from '../api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useCurrentUser(); // Fetch and initialize user globally
  return <>{children}</>;
}
