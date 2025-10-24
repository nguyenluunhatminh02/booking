// src/common/interceptors/slow-request.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * Slow Request Interceptor
 * Logs requests that take longer than threshold
 * Useful for performance monitoring
 */
@Injectable()
export class SlowRequestInterceptor implements NestInterceptor {
  constructor(
    @InjectPinoLogger(SlowRequestInterceptor.name)
    private readonly logger: PinoLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const started = Date.now();
    const req = context.switchToHttp().getRequest();
    const { method, url, headers } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - started;
          const threshold =
            Number(process.env.SLOW_REQUEST_THRESHOLD_MS) || 1000;

          if (duration > threshold) {
            this.logger.warn(
              {
                method,
                url,
                duration: `${duration}ms`,
                threshold: `${threshold}ms`,
                userId: req.user?.id,
                workspaceId: headers['x-workspace-id'] || req.user?.workspaceId,
                requestId: req.id,
              },
              'Slow request detected',
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - started;
          this.logger.error(
            {
              method,
              url,
              duration: `${duration}ms`,
              error: error.message,
              stack: error.stack,
              userId: req.user?.id,
              requestId: req.id,
            },
            'Request failed',
          );
        },
      }),
    );
  }
}
