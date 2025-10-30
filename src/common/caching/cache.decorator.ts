import { createParamDecorator } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Cacheable Decorator
 * Automatically caches method result using Cache-Aside pattern
 *
 * Usage:
 * ```ts
 * @Cacheable({
 *   key: 'user:profile',
 *   ttl: 5 * 60 * 1000, // 5 minutes
 *   invalidateOn: ['USER_UPDATED', 'USER_DELETED']
 * })
 * async getUserProfile(userId: string) {
 *   return await this.db.getUser(userId);
 * }
 * ```
 *
 * The decorated method will:
 * 1. Check cache first using the provided key
 * 2. If cache hit, return cached value
 * 3. If cache miss, execute method
 * 4. Store result in cache with TTL
 * 5. Return result
 */
export function Cacheable(options: {
  key: string | ((args: any[]) => string);
  ttl?: number;
  invalidateOn?: string[];
}) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService: CacheService = this.cacheService || null;
      if (!cacheService) {
        // If CacheService not available, just execute method
        return originalMethod.apply(this, args);
      }

      // Determine cache key (static or dynamic)
      const cacheKey =
        typeof options.key === 'function' ? options.key(args) : options.key;

      // Use cache-aside pattern
      return cacheService.cacheAside(
        cacheKey,
        () => originalMethod.apply(this, args),
        { ttl: options.ttl },
      );
    };

    return descriptor;
  };
}

/**
 * CacheInvalidate Decorator
 * Invalidates cache keys after method execution
 *
 * Usage:
 * ```ts
 * @CacheInvalidate({ keys: ['user:profile', 'stats:*'] })
 * async updateUserProfile(userId: string, data: any) {
 *   // ... update logic
 *   // Cache will be invalidated after this completes
 * }
 * ```
 */
export function CacheInvalidate(options: {
  keys: string | string[];
  delay?: number; // Delay invalidation (useful for eventual consistency)
}) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Execute method first
      const result = await originalMethod.apply(this, args);

      // Then invalidate cache
      const cacheService: CacheService = this.cacheService || null;
      if (cacheService) {
        const keys = Array.isArray(options.keys)
          ? options.keys
          : [options.keys];

        if (options.delay) {
          // Delay invalidation
          setTimeout(() => {
            keys.forEach((key) => void cacheService.invalidatePattern(key));
          }, options.delay);
        } else {
          // Immediate invalidation
          await Promise.all(
            keys.map((key) => cacheService.invalidatePattern(key)),
          );
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache Provider Decorator
 * Marks a method as cache provider (returns cacheable data)
 * Used for documentation and potential future optimizations
 *
 * Usage:
 * ```ts
 * @CacheProvider()
 * async getBookingStats(userId: string) {
 *   return await this.computeStats(userId);
 * }
 * ```
 */
export function CacheProvider(config?: { ttl?: number; patterns?: string[] }) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    // Mark method as cache provider for documentation
    descriptor.value.__isCacheProvider = true;
    descriptor.value.__cacheConfig = config;
    return descriptor;
  };
}

/**
 * Cache Keyable Decorator
 * Marks a parameter as part of cache key generation
 *
 * Usage:
 * ```ts
 * async getBooking(
 *   @CacheKeyable() bookingId: string,
 *   @CacheKeyable() userId: string
 * ) {
 *   // Cache key will be generated from these parameters
 * }
 * ```
 */
export const CacheKeyable = createParamDecorator((data: unknown) => {
  // This is just a marker decorator for documentation
  // Actual cache key generation happens in interceptor
  return data;
});
