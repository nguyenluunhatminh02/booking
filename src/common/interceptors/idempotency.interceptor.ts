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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
    const userId = (request as any).user?.id;

    // Check if idempotency key already exists
    const existing = await this.prisma.idempotency.findUnique({
      where: {
        userId_endpoint_key: {
          userId: userId ?? undefined,
          endpoint: `${method} ${path}`,
          key: idempotencyKey,
        },
      },
    });

    if (existing) {
      // If status is IN_PROGRESS, another request is processing
      if (existing.status === 'IN_PROGRESS') {
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
        const cachedResponse = existing.response
          ? (existing.response as any)
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

        const now = new Date();

        await this.prisma.idempotency.update({
          where: {
            userId_endpoint_key: {
              userId: userId !== 'anonymous' ? userId : null,
              endpoint: `${method} ${path}`,
              key: idempotencyKey,
            },
          },
          data: { status: 'IN_PROGRESS', updatedAt: now },
        });
      }
    } else {
      // Create new idempotency record
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await this.prisma.idempotency.create({
        data: {
          userId: userId !== 'anonymous' ? userId : null,
          endpoint: `${method} ${path}`,
          key: idempotencyKey,
          requestHash: '', // Would need crypto.createHash for real implementation
          status: 'IN_PROGRESS',
          expiresAt,
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
        next: (response) => {
          // Fire-and-forget: update cache without blocking response
          this.prisma.idempotency
            .update({
              where: {
                userId_endpoint_key: {
                  userId: userId !== 'anonymous' ? userId : null,
                  endpoint: `${method} ${path}`,
                  key: idempotencyKey,
                },
              },
              data: {
                status: 'COMPLETED',
                response: response,
              },
            })
            .catch((error) => {
              this.logger.error(
                { error, idempotencyKey },
                'Failed to update idempotency record',
              );
            });

          this.logger.info(
            { idempotencyKey, userId },
            'Idempotent request completed successfully',
          );
        },
        error: (error) => {
          // Fire-and-forget: update error cache without blocking response
          this.prisma.idempotency
            .update({
              where: {
                userId_endpoint_key: {
                  userId: userId !== 'anonymous' ? userId : null,
                  endpoint: `${method} ${path}`,
                  key: idempotencyKey,
                },
              },
              data: {
                status: 'FAILED',
                error: {
                  message: error.message || 'Unknown error',
                  statusCode: error.status || 500,
                } as any,
              },
            })
            .catch((updateError) => {
              this.logger.error(
                { updateError, idempotencyKey },
                'Failed to update failed idempotency record',
              );
            });

          this.logger.error(
            { error, idempotencyKey, userId },
            'Idempotent request failed',
          );

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
