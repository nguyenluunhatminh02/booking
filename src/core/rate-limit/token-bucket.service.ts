import { Injectable, Optional } from '@nestjs/common';
import Redis from 'ioredis';

type ConsumeResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

@Injectable()
export class TokenBucketService {
  private readonly redis: Redis;
  private scriptSha?: string;

  constructor(@Optional() redis?: Redis) {
    this.redis =
      redis ?? new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  private readonly lua = `
-- KEYS[1] = bucket key
-- ARGV[1] = capacity
-- ARGV[2] = refill_tokens_per_ms
-- ARGV[3] = now_ms
-- ARGV[4] = cost
local cap  = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now  = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local tokens, ts
local data = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
if not data[1] or not data[2] then
  tokens = cap
  ts = now
else
  tokens = tonumber(data[1]) or cap
  ts = tonumber(data[2]) or now
  local delta = now - ts
  if delta < 0 then delta = 0 end
  if rate > 0 then
    tokens = math.min(cap, tokens + (delta * rate))
  end
  ts = now
end

local allowed = 0
local wait_ms = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
else
  if rate > 0 then
    wait_ms = math.ceil((cost - tokens) / rate)
  else
    wait_ms = 60 * 60 * 1000
  end
end

redis.call('HMSET', KEYS[1], 'tokens', tokens, 'ts', ts)
local ttl_ms = rate > 0 and math.ceil(cap / rate) or (60 * 60 * 1000)
redis.call('PEXPIRE', KEYS[1], ttl_ms)
return {allowed, tokens, wait_ms}
`;

  private async loadScriptOnce() {
    if (!this.scriptSha)
      this.scriptSha = (await this.redis.script('LOAD', this.lua)) as string;
    return this.scriptSha;
  }

  async consume(
    bucketKey: string,
    capacity: number,
    refillPerSec: number,
    cost = 1,
  ): Promise<ConsumeResult> {
    const nowMs = Date.now();
    const rMs = refillPerSec / 1000; // token/ms
    const sha = await this.loadScriptOnce();
    try {
      const [allowed, tokens, wait] = (await this.redis.evalsha(
        sha,
        1,
        bucketKey,
        capacity,
        rMs,
        nowMs,
        cost,
      )) as [number, number, number];

      return {
        allowed: allowed === 1,
        remaining: Math.max(0, Math.floor(tokens)),
        retryAfterMs: Math.max(0, wait),
      };
    } catch (e: any) {
      if (String(e.message || '').includes('NOSCRIPT')) {
        const [allowed, tokens, wait] = (await this.redis.eval(
          this.lua,
          1,
          bucketKey,
          capacity,
          rMs,
          nowMs,
          cost,
        )) as [number, number, number];
        return {
          allowed: allowed === 1,
          remaining: Math.max(0, Math.floor(tokens)),
          retryAfterMs: Math.max(0, wait),
        };
      }
      throw e;
    }
  }
}
