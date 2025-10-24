// common/filters/prisma-client-exception.filter.ts
import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response, Request } from 'express';
import { IErrorResponse } from '../interfaces/response.interface';
import { mapPrismaError } from '../exceptions/prisma-exception.mapper';

/**
 * Prisma Client Exception Filter
 * Handles all Prisma-specific errors and maps them to HTTP responses
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Use centralized Prisma error mapper
    const mappedException = mapPrismaError(exception);

    if (mappedException) {
      const status = mappedException.getStatus();
      const errorResponse = mappedException.getResponse() as any;

      // Environment toggle
      const isProduction = process.env.NODE_ENV === 'production';
      const showDetails = !isProduction;

      const details = showDetails
        ? errorResponse.details
        : errorResponse.details
          ? // expose minimal, non-sensitive prisma info in production
            {
              prismaCode: errorResponse.details.prismaCode ?? exception.code,
              target:
                (errorResponse.details &&
                  (errorResponse.details.target ?? undefined)) ||
                undefined,
            }
          : undefined;

      const responseBody: IErrorResponse = {
        success: false,
        error: {
          code: errorResponse.code,
          message: errorResponse.message,
          details,
        },
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        requestId: request.headers['x-request-id'] as string,
      };

      // Log Prisma errors (always keep meta out of the public response)
      this.logger.error(
        `Prisma Error [${exception.code}] on ${request.method} ${request.url}`,
        {
          code: exception.code,
          meta: exception.meta,
        },
      );

      response.status(status).json(responseBody);
    } else {
      // Fallback to generic error
      const responseBody: IErrorResponse = {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Lỗi cơ sở dữ liệu',
          details: { prismaCode: exception.code },
        },
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        requestId: request.headers['x-request-id'] as string,
      };

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(responseBody);
    }
  }
}
