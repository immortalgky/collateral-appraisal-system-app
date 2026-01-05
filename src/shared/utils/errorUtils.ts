import type { AxiosError } from 'axios';
import type { ApiError, ProblemDetails } from '../types/api';

/**
 * Default error messages by HTTP status code
 */
const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad Request - Please check your input',
  401: 'Unauthorized - Please log in again',
  403: 'Forbidden - You do not have permission to perform this action',
  404: 'Resource not found',
  409: 'Conflict - The resource has been modified',
  422: 'Validation failed - Please check your input',
  500: 'Internal server error - Please try again later',
  502: 'Service temporarily unavailable',
  503: 'Service unavailable - Please try again later',
};

/**
 * Extracts ProblemDetails from an Axios error response
 * Falls back to constructing ApiError from available data
 */
export function extractApiError(error: AxiosError<ProblemDetails | unknown>): ApiError {
  const response = error.response;
  const status = response?.status ?? 0;
  const data = response?.data;

  // Check if response follows ProblemDetails format
  if (data && typeof data === 'object') {
    const problemDetails = data as ProblemDetails & { errors?: Record<string, string[]> };

    return {
      // ProblemDetails fields
      type: problemDetails.type ?? null,
      title: problemDetails.title ?? null,
      status: problemDetails.status ?? status,
      detail: problemDetails.detail ?? null,
      instance: problemDetails.instance ?? null,
      // Legacy fields for backwards compatibility
      statusCode: problemDetails.status ?? status,
      message:
        problemDetails.detail ??
        problemDetails.title ??
        DEFAULT_ERROR_MESSAGES[status] ??
        'An unexpected error occurred',
      errors: problemDetails.errors,
    };
  }

  // Fallback for non-ProblemDetails responses
  return {
    type: null,
    title: null,
    status,
    detail: null,
    instance: null,
    statusCode: status,
    message: DEFAULT_ERROR_MESSAGES[status] ?? error.message ?? 'An unexpected error occurred',
  };
}

/**
 * Extracts a user-friendly error message from an Axios error
 * Priority: detail > title > default message
 */
export function getErrorMessage(error: AxiosError<ProblemDetails | unknown>): string {
  const apiError = extractApiError(error);
  return apiError.message;
}

/**
 * Type guard to check if an error is an AxiosError
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}
