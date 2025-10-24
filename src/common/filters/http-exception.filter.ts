// common/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { COMMON_MESSAGES } from '../messages/common.message';
import { IErrorResponse } from '../interfaces/response.interface';
import { ERROR_CODES } from '../exceptions/app-error-codes';

/**
 * HTTP Exception Filter - catches all HTTP exceptions
 * Works alongside AllExceptionsFilter for more specific handling
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus() || HttpStatus.INTERNAL_SERVER_ERROR;
    const isServerError = status === 500;

    // Environment toggle
    const isProduction = process.env.NODE_ENV === 'production';
    const showDetails = !isProduction;

    const exceptionResponse = exception.getResponse();
    const message = isServerError
      ? COMMON_MESSAGES.INTERNAL_SERVER_ERROR
      : exception.message;

    // Parse error details
    let errorDetails: any;
    let errorCode: string;

    if (typeof exceptionResponse === 'string') {
      errorDetails = exceptionResponse;
      errorCode = this.getErrorCodeFromStatus(status);
    } else {
      const resp = exceptionResponse as any;
      errorDetails = resp.errors ?? resp.message ?? exceptionResponse;
      errorCode = resp.code ?? this.getErrorCodeFromStatus(status);

      // Clean up response (we don't want to expose status fields)
      delete resp.statusCode;
      delete resp.error;
    }

    // Build error response
    const responseBody: IErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        // Only include detailed error content in non-production environments
        details: showDetails ? errorDetails : undefined,
      },
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId: request.headers['x-request-id'] as string,
    };

    // Attach debug stack (development only)
    if (showDetails && exception.stack) {
      // @ts-ignore - extend response for debug during development
      (responseBody.error as any).debug = { stack: exception.stack };
    }

    // Log error
    if (isServerError) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception.stack,
      );
    } else if (status >= 400) {
      this.logger.warn(`${request.method} ${request.url} - ${status}`);
    }

    response.status(status).json(responseBody);
  }

  private getErrorCodeFromStatus(status: number): string {
    if (status === 400) return ERROR_CODES.BAD_REQUEST;
    if (status === 401) return ERROR_CODES.UNAUTHORIZED;
    if (status === 403) return ERROR_CODES.FORBIDDEN;
    if (status === 404) return ERROR_CODES.NOT_FOUND;
    if (status === 409) return ERROR_CODES.UNIQUE_CONFLICT;
    if (status === 422) return ERROR_CODES.VALIDATION_ERROR;
    if (status === 429) return ERROR_CODES.RATE_LIMITED;
    return ERROR_CODES.INTERNAL_ERROR;
  }
}
