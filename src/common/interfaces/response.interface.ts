// common/interfaces/response.interface.ts

/**
 * Standard API response interface
 */
export interface IResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
  path?: string;
  code?: number | string;
  timestamp?: string;
  requestId?: string;
}

/**
 * Paginated response interface
 */
export interface IPaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    meta: IPaginationMeta;
  };
  message?: string;
}

/**
 * Pagination metadata interface
 */
export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Error response interface
 */
export interface IErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  path: string;
  method?: string;
  timestamp: string;
  requestId?: string;
}
