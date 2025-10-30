import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { ThrottlerException } from '@nestjs/throttler';

type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    requestId?: string;
    meta?: Record<string, any>;
  };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<any>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log errors (excluding client errors 4xx)
    if (errorResponse.error.statusCode >= 500) {
      this.log.error(
        `[${errorResponse.error.code}] ${errorResponse.error.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      // TODO: Send to Sentry here
      // Sentry.captureException(exception);
    } else if (errorResponse.error.statusCode >= 400) {
      this.log.warn(
        `[${errorResponse.error.code}] ${errorResponse.error.message}`,
      );
    }

    // Send response
    response.status(errorResponse.error.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: any): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const requestId = request.id || request.headers['x-request-id'];

    // 1. HttpException (NestJS standard)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message = exception.message;
      let code = this.getErrorCode(status);
      let meta: Record<string, any> | undefined;

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        code = resp.code || code;
        meta = resp.meta;

        // Handle validation errors
        if (Array.isArray(resp.message)) {
          message = 'Validation failed';
          meta = { errors: resp.message };
        }
      }

      return {
        success: false,
        error: {
          code,
          message,
          statusCode: status,
          timestamp,
          path,
          requestId,
          meta,
        },
      };
    }

    // 2. Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, timestamp, path, requestId);
    }

    // 3. Throttler (rate limit)
    if (exception instanceof ThrottlerException) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          timestamp,
          path,
          requestId,
        },
      };
    }

    // 4. Unknown errors
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message:
          process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp,
        path,
        requestId,
      },
    };
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
    timestamp: string,
    path: string,
    requestId?: string,
  ): ErrorResponse {
    const code = exception.code;
    let statusCode = HttpStatus.BAD_REQUEST;
    let message = 'Database operation failed';
    let errorCode = 'DATABASE_ERROR';

    switch (code) {
      case 'P2002': // Unique constraint violation
        statusCode = HttpStatus.CONFLICT;
        errorCode = 'DUPLICATE_ENTRY';
        const target = (exception.meta?.target as string[]) || [];
        message = `Duplicate entry for: ${target.join(', ')}`;
        break;

      case 'P2025': // Record not found
        statusCode = HttpStatus.NOT_FOUND;
        errorCode = 'NOT_FOUND';
        message = 'Record not found';
        break;

      case 'P2003': // Foreign key constraint failed
        statusCode = HttpStatus.BAD_REQUEST;
        errorCode = 'FOREIGN_KEY_VIOLATION';
        message = 'Related record not found';
        break;

      case 'P2014': // Invalid ID
        statusCode = HttpStatus.BAD_REQUEST;
        errorCode = 'INVALID_ID';
        message = 'Invalid ID provided';
        break;

      default:
        this.log.error(`Unhandled Prisma error code: ${code}`, exception);
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message,
        statusCode,
        timestamp,
        path,
        requestId,
        meta: { prismaCode: code },
      },
    };
  }

  private getErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return codeMap[status] || 'UNKNOWN_ERROR';
  }
}
