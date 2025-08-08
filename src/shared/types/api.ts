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
 * Common error response from API
 */
export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface Parameter {
  parId: number;
  group: string;
  country: string;
  language: string;
  code: string;
  description: string;
  active: string;
  seqNo: string;
}

export type ParameterParams = Partial<Parameter>;

export type ParametersResponse = Parameter[];
