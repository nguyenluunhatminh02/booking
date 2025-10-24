import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenBucketService } from './token-bucket.service';
import { TokenBucketGuard } from './token-bucket.guard';

@Module({
  providers: [Reflector, TokenBucketService, TokenBucketGuard],
  exports: [TokenBucketService, TokenBucketGuard],
})
export class RateLimitModule {}
