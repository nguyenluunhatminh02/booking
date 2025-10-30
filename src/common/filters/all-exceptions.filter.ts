// common/filters/all-exceptions.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { mapPrismaError } from '../exceptions/prisma-exception.mapper';
import { ERROR_CODES } from '../exceptions/app-error-codes';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(err: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    // Environment toggle: detailed responses in non-production
    const isProduction = process.env.NODE_ENV === 'production';
    const showDetails = !isProduction;

    // Shared helper to redact sensitive fields from objects
    const maskSensitive = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      try {
        const copy = JSON.parse(JSON.stringify(obj));
        const sensitiveKeys = [
          'password',
          'confirmPassword',
          'oldPassword',
          'newPassword',
          'token',
          'accessToken',
          'refreshToken',
        ];
        const recurse = (o: any) => {
          if (!o || typeof o !== 'object') return;
          for (const k of Object.keys(o)) {
            if (sensitiveKeys.includes(k)) {
              o[k] = '***REDACTED***';
            } else if (typeof o[k] === 'object') {
              recurse(o[k]);
            }
          }
        };
        recurse(copy);
        return copy;
      } catch {
        return undefined;
      }
    };

    const safeBody = maskSensitive(req?.body);

    // Try to map Prisma errors first
    const mapped = mapPrismaError(err);

    let status: number;
    let errorResponse: any;

    if (mapped) {
      // Prisma error was mapped
      status = mapped.getStatus();
      errorResponse = mapped.getResponse();

      // In production hide verbose prisma meta; in dev keep full details
      if (!showDetails && errorResponse && typeof errorResponse === 'object') {
        const respCopy = { ...errorResponse };
        if (respCopy.details) {
          // Keep minimal useful information for clients (e.g. prismaCode / target)
          const minimal: any = {};
          if (respCopy.details.prismaCode)
            minimal.prismaCode = respCopy.details.prismaCode;
          if (respCopy.details.target) minimal.target = respCopy.details.target;
          respCopy.details = Object.keys(minimal).length ? minimal : undefined;
        }
        errorResponse = respCopy;
      }
    } else if (err instanceof HttpException) {
      // Standard HTTP exception
      status = err.getStatus();
      const response = err.getResponse();

      if (typeof response === 'string') {
        errorResponse = {
          message: response,
          code: this.getErrorCodeFromStatus(status),
        };
      } else {
        const resp = response as any;

        if (showDetails) {
          // In development return full response object for easier debugging
          errorResponse = {
            ...resp,
            code: resp.code ?? this.getErrorCodeFromStatus(status),
          };
          if (err?.stack) {
            errorResponse.debug = { stack: err.stack };
          }
        } else {
          // In production keep responses minimal and non-sensitive
          errorResponse = {
            message:
              resp?.message ||
              (status === HttpStatus.INTERNAL_SERVER_ERROR
                ? 'Lỗi hệ thống, vui lòng thử lại sau'
                : resp?.error || 'Bad Request Exception'),
            code: resp?.code ?? this.getErrorCodeFromStatus(status),
          };
        }
      }
    } else {
      // Unknown error
      status = HttpStatus.INTERNAL_SERVER_ERROR;

      if (showDetails) {
        // Development: include useful debug information (stack, sanitized request)
        errorResponse = {
          message: err?.message ?? 'Internal Server Error',
          code: err?.code ?? ERROR_CODES.INTERNAL_ERROR,
          debug: {
            stack: err?.stack,
          },
        };
      } else {
        // Production: generic message
        errorResponse = {
          message: 'Lỗi hệ thống, vui lòng thử lại sau',
          code: ERROR_CODES.INTERNAL_ERROR,
        };
      }

      // Log internal errors (keep existing logger call for normal logging)
      this.logger.error(
        `Internal Server Error: ${err?.message}`,
        err?.stack,
        `${req.method} ${req.url}`,
      );

      // Additional debug logging to stderr (always logged but response only contains details in dev)
      try {
        console.error('AllExceptionsFilter — unhandled error', {
          message: err?.message,
          name: err?.name,
          code: err?.code,
          stack: err?.stack,
          request: {
            id: req?.headers?.['x-request-id'] ?? null,
            method: req?.method,
            url: req?.url,
            ip: req?.ip || req?.connection?.remoteAddress,
            headers: {
              'user-agent': req?.headers?.['user-agent'],
              host: req?.headers?.host,
            },
            body: safeBody,
          },
        });
      } catch (loggingErr) {
        try {
          console.error(
            'Failed to write detailed exception info in AllExceptionsFilter',
            loggingErr,
          );
        } catch {
          // swallow
        }
      }
    }

    // Ensure error response has proper structure
    if (!errorResponse || typeof errorResponse !== 'object') {
      errorResponse = {
        message: String(errorResponse ?? ''),
        code: this.getErrorCodeFromStatus(status),
      };
    }

    if (!errorResponse.code) {
      errorResponse.code = this.getErrorCodeFromStatus(status);
    }

    if (!errorResponse.message) {
      errorResponse.message =
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Lỗi hệ thống, vui lòng thử lại sau'
          : '';
    }

    // Attach sanitized debug/request info only in non-production
    if (showDetails) {
      errorResponse.debug = errorResponse.debug ?? {};
      errorResponse.debug.request = {
        id: req?.headers?.['x-request-id'] ?? null,
        method: req?.method,
        url: req?.url,
        ip: req?.ip || req?.connection?.remoteAddress,
        headers: {
          'user-agent': req?.headers?.['user-agent'],
          host: req?.headers?.host,
        },
        body: safeBody,
      };
    }

    const responseBody = {
      ok: false,
      error: errorResponse,
      path: req.url,
      method: req.method,
      requestId: req.headers['x-request-id'] ?? undefined,
      timestamp: new Date().toISOString(),
    };

    res.status(status).json(responseBody);
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
