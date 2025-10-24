import { SetMetadata } from '@nestjs/common';
export const RATE_LIMIT_METADATA = 'rate_limit_options';

export type RateLimitKeyBy =
  | 'ip'
  | 'user'
  | 'apiKey'
  | 'workspace'
  | 'userOrIp';

export interface RateLimitOptions {
  capacity: number; // B - burst tối đa
  refillPerSec: number; // r - token/giây (R/60 nếu R là req/phút)
  cost?: number; // mặc định 1
  keyBy?: RateLimitKeyBy; // chọn bucket theo ai
  prefix?: string; // tiền tố key redis
  message?: string; // thông điệp riêng cho route
}

export const RateLimit = (opts: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_METADATA, opts);
