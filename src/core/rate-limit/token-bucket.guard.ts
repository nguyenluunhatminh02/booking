import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_METADATA, RateLimitOptions } from './rate-limit.decorator';
import { TokenBucketService } from './token-bucket.service';

@Injectable()
export class TokenBucketGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly bucket: TokenBucketService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_METADATA,
      ctx.getHandler(),
    );
    if (!opts) return true; // route không dùng token bucket

    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();

    const key = this.buildKey(opts, req);
    const result = await this.bucket.consume(
      key,
      opts.capacity,
      opts.refillPerSec,
      opts.cost ?? 1,
    );

    res.setHeader('X-RateLimit-Limit', String(opts.capacity));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      res.setHeader(
        'Retry-After',
        String(Math.ceil(result.retryAfterMs / 1000)),
      );
      throw new HttpException(
        {
          ok: false,
          error: {
            code: 'RATE_LIMITED',
            message: opts.message ?? 'Bạn đã vượt quá giới hạn, thử lại sau.',
          },
          retryAfterMs: result.retryAfterMs,
          path: req.url,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private buildKey(opts: RateLimitOptions, req: any): string {
    const by = opts.keyBy ?? 'ip';
    let who = 'anonymous';
    switch (by) {
      case 'user':
        who = req.user?.id ?? 'anon';
        break;
      case 'workspace':
        who =
          req.user?.workspaceId ?? req.headers['x-workspace-id'] ?? 'unknown';
        break;
      case 'apiKey':
        who = req.headers['x-api-key'] ?? 'missing';
        break;
      case 'userOrIp':
        who = req.user?.id ?? req.ip ?? 'anon';
        break;
      case 'ip':
      default:
        who = req.ip ?? 'unknown';
    }
    const prefix = opts.prefix ?? 'rl';
    const route = `${req.method}:${req.baseUrl || req.path || req.url}`;
    return `${prefix}:${route}:${by}:${who}`;
  }
}
