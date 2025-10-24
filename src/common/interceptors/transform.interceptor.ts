// common/interceptors/transform.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

/**
 * Metadata key to skip transform interceptor
 */
export const SKIP_TRANSFORM = 'SKIP_TRANSFORM';

/**
 * Transform interceptor - wraps all successful responses in standard format
 * Can be skipped by using @SetMetadata(SKIP_TRANSFORM, true)
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if this route should skip transformation
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped (has 'success' or 'ok' property), return as is
        if (
          data &&
          typeof data === 'object' &&
          ('success' in data || 'ok' in data)
        ) {
          return data;
        }

        // Otherwise wrap it with standard format
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
