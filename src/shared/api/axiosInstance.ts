import axios, { type AxiosError } from 'axios';
import { extractApiError } from '../utils/errorUtils';
import type { ProblemDetails } from '../types/api';

// Development delay for seeing loading states (in milliseconds)
const DEV_API_DELAY = Number(import.meta.env.VITE_API_DELAY) || 0;

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Create axios instance with base URL and default headers
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 1000 * 10,
});

// Add request interceptor for authentication
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Add response interceptor for error handling and dev delay
axiosInstance.interceptors.response.use(
  async response => {
    // Add delay for development to see loading states
    if (DEV_API_DELAY > 0) {
      await delay(DEV_API_DELAY);
    }
    return response;
  },
  (error: AxiosError<ProblemDetails>) => {
    const { response } = error;

    // Handle authentication errors
    if (response && response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Extract ProblemDetails and attach to error for consumers
    const apiError = extractApiError(error);
    (error as AxiosError & { apiError: typeof apiError }).apiError = apiError;

    return Promise.reject(error);
  },
);

export default axiosInstance;
