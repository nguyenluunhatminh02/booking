// common/helpers/response.helper.ts
import {
  IPaginatedResponse,
  IPaginationMeta,
  IResponse,
} from '../interfaces/response.interface';

/**
 * Helper class for creating standardized API responses
 */
export class ResponseHelper {
  /**
   * Create success response
   * @param data - Response data
   * @param message - Success message
   * @returns Standardized success response
   */
  static success<T>(data: T, message?: string): IResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create error response
   * @param message - Error message
   * @param code - Error code
   * @param details - Error details
   * @returns Standardized error response
   */
  static error(message: string, code?: string, details?: any): IResponse {
    return {
      success: false,
      message,
      code,
      errors: details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create paginated response
   * @param items - Array of items
   * @param total - Total count
   * @param page - Current page
   * @param limit - Items per page
   * @param message - Optional message
   * @returns Paginated response
   */
  static paginated<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
    message?: string,
  ): IPaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const meta: IPaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };

    return {
      success: true,
      data: {
        items,
        meta,
      },
      message,
    };
  }

  /**
   * Create simple message response
   * @param message - Message
   * @param success - Success status (default: true)
   * @returns Message response
   */
  static message(message: string, success = true): IResponse {
    return {
      success,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}
