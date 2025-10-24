// common/decorators/api-operation.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

/**
 * Enum để định nghĩa các error responses có thể exclude
 */
export enum ApiResponseType {
  BadRequest = 'BadRequest',
  Unauthorized = 'Unauthorized',
  Forbidden = 'Forbidden',
  NotFound = 'NotFound',
  UnprocessableEntity = 'UnprocessableEntity',
  TooManyRequests = 'TooManyRequests',
  InternalServerError = 'InternalServerError',
}

/**
 * Options cho ApiOperationDecorator
 */
interface ApiOperationDecoratorOptions {
  type?: Type<any>;
  bodyType?: Type<any>;
  summary: string;
  description?: string;
  path?: string;
  exclude?: ApiResponseType[];
  isArray?: boolean;
}

/**
 * Decorator tổng hợp cho Swagger API documentation
 * Giúp giảm boilerplate code khi document API
 *
 * @example
 * @ApiOperationDecorator({
 *   summary: 'Login user',
 *   description: 'Authenticate user with email and password',
 *   bodyType: LoginDto,
 *   type: AuthResponseDto,
 *   path: '/api/auth/login',
 *   exclude: [ApiResponseType.Forbidden]
 * })
 * @Post('login')
 * async login(@Body() dto: LoginDto) { }
 */
export function ApiOperationDecorator({
  type,
  bodyType,
  summary,
  description = '',
  path = '',
  exclude = [],
  isArray = false,
}: ApiOperationDecoratorOptions) {
  const decorators = [
    ApiOperation({ summary, description }),
    ApiOkResponse({
      type,
      description: description || 'Successful response',
      isArray,
    }),
  ];

  // Thêm ApiBody nếu có bodyType
  if (bodyType) {
    decorators.push(
      ApiBody({
        description: 'Request body',
        type: bodyType,
      }),
    );
  }

  // Thêm các error responses nếu không bị exclude
  if (!exclude.includes(ApiResponseType.BadRequest)) {
    decorators.push(
      ApiBadRequestResponse({
        description: 'Invalid request data',
        schema: {
          example: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Dữ liệu không hợp lệ',
              details: [
                {
                  field: 'email',
                  constraints: ['Email không hợp lệ'],
                },
              ],
            },
            path,
            timestamp: new Date().toISOString(),
          },
        },
      }),
    );
  }

  if (!exclude.includes(ApiResponseType.Unauthorized)) {
    decorators.push(
      ApiUnauthorizedResponse({
        description: 'Unauthorized - Token missing or invalid',
        schema: {
          example: {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Vui lòng đăng nhập để tiếp tục',
            },
            path,
            timestamp: new Date().toISOString(),
          },
        },
      }),
    );
  }

  if (!exclude.includes(ApiResponseType.Forbidden)) {
    decorators.push(
      ApiForbiddenResponse({
        description: 'Forbidden - Insufficient permissions',
        schema: {
          example: {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Bạn không có quyền truy cập',
            },
            path,
            timestamp: new Date().toISOString(),
          },
        },
      }),
    );
  }

  if (!exclude.includes(ApiResponseType.NotFound)) {
    decorators.push(
      ApiNotFoundResponse({
        description: 'Resource not found',
        schema: {
          example: {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Không tìm thấy dữ liệu',
            },
            path,
            timestamp: new Date().toISOString(),
          },
        },
      }),
    );
  }

  if (!exclude.includes(ApiResponseType.UnprocessableEntity)) {
    decorators.push(
      ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity',
        schema: {
          example: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Dữ liệu không thể xử lý',
            },
            path,
            timestamp: new Date().toISOString(),
          },
        },
      }),
    );
  }

  if (!exclude.includes(ApiResponseType.TooManyRequests)) {
    decorators.push(
      ApiTooManyRequestsResponse({
        description: 'Too many requests - Rate limit exceeded',
        schema: {
          example: {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
            },
            retryAfter: 30,
            path,
            timestamp: new Date().toISOString(),
          },
        },
      }),
    );
  }

  if (!exclude.includes(ApiResponseType.InternalServerError)) {
    decorators.push(
      ApiInternalServerErrorResponse({
        description: 'Internal server error',
        schema: {
          example: {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Lỗi hệ thống, vui lòng thử lại sau',
            },
            path,
            timestamp: new Date().toISOString(),
          },
        },
      }),
    );
  }

  return applyDecorators(...decorators);
}
