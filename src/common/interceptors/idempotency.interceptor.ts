import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '@/prisma/prisma.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Request } from 'express';

// Metadata key for idempotency decorator
export const IDEMPOTENCY_KEY = 'idempotency';

// Decorator to enable idempotency on specific routes
export const Idempotent = () => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(IDEMPOTENCY_KEY, true, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    @InjectPinoLogger(IdempotencyInterceptor.name)
    private readonly logger: PinoLogger,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const handler = context.getHandler();
    const isIdempotent = this.reflector.get<boolean>(IDEMPOTENCY_KEY, handler);

    // Skip if not marked as idempotent
    if (!isIdempotent) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const idempotencyKey = request.headers['idempotency-key'] as string;

    // Idempotency key is required for idempotent routes
    if (!idempotencyKey) {
      throw new ConflictException(
        'Idempotency-Key header is required for this endpoint',
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      throw new ConflictException('Idempotency-Key must be a valid UUID v4');
    }

    const method = request.method;
    const path = request.path;
    const userId = (request as any).user?.id || 'anonymous';

    // Check if idempotency key already exists
    const existing = await this.prisma.idempotency.findUnique({
      where: { key: idempotencyKey },
    });

    if (existing) {
      // If status is PENDING, another request is processing
      if (existing.status === 'PENDING') {
        this.logger.warn(
          { idempotencyKey, userId, method, path },
          'Duplicate request in progress',
        );
        throw new ConflictException(
          'Request with this Idempotency-Key is already processing',
        );
      }

      // If status is COMPLETED, return cached response
      if (existing.status === 'COMPLETED') {
        this.logger.info(
          { idempotencyKey, userId, method, path },
          'Returning cached idempotent response',
        );

        // Parse response payload
        const cachedResponse = existing.responsePayload
          ? JSON.parse(existing.responsePayload as string)
          : {};

        return new Observable((subscriber) => {
          subscriber.next(cachedResponse);
          subscriber.complete();
        });
      }

      // If status is FAILED, allow retry
      if (existing.status === 'FAILED') {
        this.logger.info(
          { idempotencyKey, userId, method, path },
          'Retrying failed idempotent request',
        );

        await this.prisma.idempotency.update({
          where: { key: idempotencyKey },
          data: { status: 'PENDING', retries: existing.retries + 1 },
        });
      }
    } else {
      // Create new idempotency record
      await this.prisma.idempotency.create({
        data: {
          key: idempotencyKey,
          method,
          path,
          userId,
          status: 'PENDING',
          requestPayload: JSON.stringify(request.body || {}),
        },
      });

      this.logger.info(
        { idempotencyKey, userId, method, path },
        'Created idempotency record',
      );
    }

    // Execute the request and cache response
    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            await this.prisma.idempotency.update({
              where: { key: idempotencyKey },
              data: {
                status: 'COMPLETED',
                responsePayload: JSON.stringify(response),
              },
            });

            this.logger.info(
              { idempotencyKey, userId },
              'Idempotent request completed successfully',
            );
          } catch (error) {
            this.logger.error(
              { error, idempotencyKey },
              'Failed to update idempotency record',
            );
          }
        },
        error: async (error) => {
          try {
            await this.prisma.idempotency.update({
              where: { key: idempotencyKey },
              data: {
                status: 'FAILED',
                responsePayload: JSON.stringify({
                  error: error.message || 'Unknown error',
                  statusCode: error.status || 500,
                }),
              },
            });

            this.logger.error(
              { error, idempotencyKey, userId },
              'Idempotent request failed',
            );
          } catch (updateError) {
            this.logger.error(
              { updateError, idempotencyKey },
              'Failed to update failed idempotency record',
            );
          }

          throw error;
        },
      }),
    );
  }
}

/**
 * Helper function to generate idempotency key (UUID v4)
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Helper function to validate idempotency key format
 */
export function isValidIdempotencyKey(key: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}
