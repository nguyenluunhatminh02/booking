// common/interceptors/logging.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logging interceptor - logs all incoming requests and their responses
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const requestId = headers['x-request-id'] || '-';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const { statusCode } = res;
          const responseTime = Date.now() - now;

          this.logger.log(
            `${method} ${url} ${statusCode} ${responseTime}ms - ${ip} - ${userAgent} - ${requestId}`,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          const status = error?.status || 500;

          this.logger.error(
            `${method} ${url} ${status} ${responseTime}ms - ${ip} - ${userAgent} - ${requestId}`,
            error?.message,
          );
        },
      }),
    );
  }
}
