import type { UseQueryOptions } from '@tanstack/react-query';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { LoginCredentials, LoginResponse, User } from './types';
import { useAuthStore } from './store';

// Function to get the current user profile
export const useCurrentUser = () => {
  const { setUser } = useAuthStore();

  return useQuery<User, Error, User, string[]>({
    queryKey: ['currentUser'],
    queryFn: async (): Promise<User> => {
      const { data } = await axios.get('/auth/me');
      return data;
    },
    select: (data: User) => {
      setUser(data);
      return data;
    },
    onError: () => {
      // If we can't get the user, they're not authenticated
      localStorage.removeItem('auth_token');
      setUser(null);
    },
    // Only run if we have a token
    enabled: !!localStorage.getItem('auth_token'),
  } as UseQueryOptions<User, Error, User, string[]>);
};

// Function to log in
export const useLogin = () => {
  const { login, setLoading, setError } = useAuthStore();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResponse> => {
      setLoading(true);
      setError(null);
      const { data } = await axios.post('/auth/login', credentials);
      return data;
    },
    onSuccess: data => {
      login(data.user, data.token);
      setLoading(false);
    },
    onError: (error: any) => {
      setLoading(false);
      setError(error.response?.data?.message || 'Login failed');
    },
  });
};
