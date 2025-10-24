// src/common/guards/custom-throttler.guard.ts
import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  ThrottlerGuard,
  InjectThrottlerOptions,
  ThrottlerModuleOptions,
  ThrottlerStorage,
  ThrottlerRequest,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_METADATA } from '../../core/rate-limit/rate-limit.decorator';
import { ERROR_CODES } from '../exceptions/app-error-codes';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @Inject(ThrottlerStorage)
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    // must pass all 3 args to base guard
    super(options, storageService, reflector);
  }

  // Skip throttler nếu route/class đã có @RateLimit (Token Bucket)
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const r: any = this.reflector as any;
    const hasBucketMeta = r.getAllAndOverride
      ? r.getAllAndOverride(RATE_LIMIT_METADATA, [
          ctx.getHandler(),
          ctx.getClass(),
        ])
      : (this.reflector.get(RATE_LIMIT_METADATA, ctx.getHandler()) ??
        this.reflector.get(RATE_LIMIT_METADATA, ctx.getClass()));

    if (hasBucketMeta) return true;
    return super.canActivate(ctx);
  }

  // Base expects Promise<string>
  protected getTracker(req: Record<string, any>): Promise<string> {
    return (
      req.user?.id ||
      req.headers['x-api-key'] ||
      req.user?.workspaceId ||
      req.headers['x-workspace-id'] ||
      req.ip ||
      'anonymous'
    );
  }

  // Đúng chữ ký v6: handleRequest(request: ThrottlerRequest)
  protected async handleRequest(request: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl } = request;
    const { req, res } = this.getRequestResponse(context);
    const tracker = await this.getTracker(req);
    const routeKey = `${context.getClass().name}:${context.getHandler().name}`;
    const key = `throttle:${routeKey}:${tracker}`;

    // v6 storage.increment expects 5 args: (key, ttl, limit, blockDuration, tracker)
    const rec = await this.storageService.increment(
      key,
      ttl,
      limit,
      60,
      tracker,
    );

    const totalHits: number = rec.totalHits ?? 0;
    const tteSeconds: number = Math.ceil(rec.timeToExpire ?? ttl);

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(0, limit - totalHits)),
    );
    // Optional:
    // res.setHeader('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + tteSeconds));

    if (totalHits > limit) {
      res.setHeader('Retry-After', String(tteSeconds));
      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
      } as ThrottlerLimitDetail);
    }
    return true;
  }

  protected throwThrottlingException(
    context: ExecutionContext,
    _detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const { req } = this.getRequestResponse(context);
    throw new HttpException(
      {
        success: false,
        error: {
          code: ERROR_CODES?.RATE_LIMITED ?? 'RATE_LIMITED',
          message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
        },
        path: req.url,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
