/**
 * Common response shape for API requests
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

/**
 * Parameters for paginated requests
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * RFC 7807 Problem Details for HTTP APIs
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ProblemDetails {
  /** A URI reference that identifies the problem type */
  type?: string | null;
  /** A short, human-readable summary of the problem type */
  title?: string | null;
  /** The HTTP status code */
  status?: number | null;
  /** A human-readable explanation specific to this occurrence of the problem */
  detail?: string | null;
  /** A URI reference that identifies the specific occurrence of the problem */
  instance?: string | null;
}

/**
 * Extended ApiError that includes both legacy format and ProblemDetails
 * Maintains backwards compatibility while supporting RFC 7807
 */
export interface ApiError extends ProblemDetails {
  /** @deprecated Use 'status' from ProblemDetails instead */
  statusCode: number;
  /** @deprecated Use 'detail' or 'title' from ProblemDetails instead */
  message: string;
  /** Validation errors map (field -> error messages) */
  errors?: Record<string, string[]>;
}

export interface Parameter {
  group: string;
  country: string;
  language: string;
  code: string;
  description: string;
  isActive: boolean;
  seqNo: number;
}
