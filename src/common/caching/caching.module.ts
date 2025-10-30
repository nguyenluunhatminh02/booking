import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

/**
 * Caching Module
 *
 * Provides centralized caching infrastructure using cache-manager
 * Supports multiple backends: memory, Redis, Memcached, etc.
 *
 * Configuration in app.module.ts:
 * ```ts
 * CachingModule.forRoot({
 *   isGlobal: true,
 *   ttl: 5 * 60 * 1000, // 5 minutes default
 *   store: 'memory' // or 'redis' for production
 * })
 * ```
 */
@Module({
  imports: [
    NestCacheModule.register({
      ttl: 5 * 60 * 1000, // 5 minutes default
      max: 1000, // Maximum number of items in cache
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CachingModule {}

/**
 * Redis-backed Caching Module (for production)
 *
 * Usage in app.module.ts:
 * ```ts
 * CachingModule.forRoot({
 *   store: redisStore,
 *   host: 'localhost',
 *   port: 6379,
 *   ttl: 60 * 60 * 24, // 24 hours
 * })
 * ```
 *
 * Benefits:
 * - Distributed caching across multiple instances
 * - Persistence across restarts
 * - Better memory management
 * - Shared cache between microservices
 */
export const CachingModuleFactory = {
  /**
   * Memory-based caching (development)
   */
  forMemory: () => CachingModule,

  /**
   * Redis-based caching configuration template
   * Requires: npm install cache-manager-redis-store
   */
  redisConfig: () => ({
    isGlobal: true,
    ttl: 60 * 60 * 24, // 24 hours
    // store: require('cache-manager-redis-store'),
    // host: process.env.REDIS_HOST || 'localhost',
    // port: process.env.REDIS_PORT || 6379,
    // password: process.env.REDIS_PASSWORD,
  }),
};
