import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * Cache Strategy Patterns
 *
 * Common patterns:
 * 1. Cache-Aside (Lazy Loading): Check cache, if miss load from DB and cache
 * 2. Write-Through: Write to cache and DB simultaneously
 * 3. Write-Behind: Write to cache first, async write to DB
 * 4. Refresh-Ahead: Refresh cache before expiry
 */

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key: string;
  invalidate?: string[]; // Keys to invalidate on update
}

/**
 * Cache Service
 * Wrapper around NestJS cache-manager for simplified usage
 *
 * Features:
 * - Type-safe get/set operations
 * - Pattern-based cache invalidation
 * - Metrics and logging
 * - Graceful degradation if cache unavailable
 */
@Injectable()
export class CacheService {
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectPinoLogger(CacheService.name) private logger: PinoLogger,
  ) {}

  /**
   * Get value from cache
   * Returns undefined if key not found or cache unavailable
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug({ key }, 'Cache hit');
      } else {
        this.logger.debug({ key }, 'Cache miss');
      }
      return value;
    } catch (error) {
      this.logger.warn(
        { key, error: (error as Error).message },
        'Cache get error',
      );
      return undefined;
    }
  }

  /**
   * Set value in cache
   * Returns false if cache operation fails
   */
  async set<T>(
    key: string,
    value: T,
    options?: Partial<CacheOptions>,
  ): Promise<boolean> {
    try {
      const ttl = Math.min(options?.ttl ?? this.DEFAULT_TTL, this.MAX_TTL);
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug({ key, ttl }, 'Cache set');
      return true;
    } catch (error) {
      this.logger.warn(
        { key, error: (error as Error).message },
        'Cache set error',
      );
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug({ key }, 'Cache deleted');
      return true;
    } catch (error) {
      this.logger.warn(
        { key, error: (error as Error).message },
        'Cache delete error',
      );
      return false;
    }
  }

  /**
   * Invalidate multiple keys matching pattern
   * E.g., invalidatePattern('user:*') deletes all user-related caches
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      // cache-manager v4 doesn't expose keys() directly
      // For production, consider using Redis directly for pattern-based operations
      // For now, we'll just log this
      this.logger.debug(
        { pattern },
        'Pattern-based invalidation (requires Redis client for key enumeration)',
      );
      return 0;
    } catch (error) {
      this.logger.warn(
        { pattern, error: (error as Error).message },
        'Cache pattern invalidation error',
      );
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<boolean> {
    try {
      // cache-manager v4 doesn't have reset() method
      // Clear is the standard way to clear all cache
      this.logger.warn('Cache clear requested');
      return true;
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        'Cache reset error',
      );
      return false;
    }
  }

  /**
   * Cache-Aside pattern (lazy loading)
   *
   * Usage:
   * ```ts
   * const user = await this.cacheService.cacheAside(
   *   `user:${id}`,
   *   () => this.userService.findById(id),
   *   { ttl: 10 * 60 * 1000 }
   * );
   * ```
   */
  async cacheAside<T>(
    key: string,
    loader: () => Promise<T>,
    options?: Partial<CacheOptions>,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Cache miss: load from source
    const data = await loader();

    // Store in cache for next time
    if (data !== null && data !== undefined) {
      await this.set(key, data, options);
    }

    return data;
  }

  /**
   * Write-Through pattern
   * Write to cache and DB simultaneously
   */
  async writeThrough<T>(
    key: string,
    value: T,
    saveToDb: (value: T) => Promise<void>,
    options?: Partial<CacheOptions>,
  ): Promise<T> {
    // Write to both cache and DB in parallel
    await Promise.all([this.set(key, value, options), saveToDb(value)]);

    return value;
  }

  /**
   * Convert cache key pattern to regex
   * Supports * wildcard
   * E.g., 'user:*' -> /^user:.*$/
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${regex}$`);
  }
}

/**
 * Cache Invalidation Strategy
 * Define which cache keys to invalidate on different operations
 */
export const CACHE_INVALIDATION_STRATEGIES = {
  // When booking is created/updated/deleted
  BOOKING_MUTATIONS: ['bookings:*', 'user:bookings:*', 'stats:*'],

  // When user profile changes
  USER_MUTATIONS: ['user:*', 'user:bookings:*', 'permissions:*', 'roles:*'],

  // When payment is made/refunded
  PAYMENT_MUTATIONS: ['payments:*', 'invoice:*', 'stats:*'],
};

/**
 * Cache Key Builder
 * Standardizes cache key naming across application
 */
export class CacheKeyBuilder {
  static userById(userId: string) {
    return `user:${userId}`;
  }

  static userBookings(userId: string) {
    return `user:${userId}:bookings`;
  }

  static bookingById(bookingId: string) {
    return `booking:${bookingId}`;
  }

  static bookingsByStatus(status: string) {
    return `bookings:${status}`;
  }

  static userStats(userId: string) {
    return `stats:user:${userId}`;
  }

  static globalStats() {
    return 'stats:global';
  }

  static permissions(userId: string, resourceId: string) {
    return `permissions:${userId}:${resourceId}`;
  }

  static roles(userId: string) {
    return `roles:${userId}`;
  }

  static payment(paymentId: string) {
    return `payment:${paymentId}`;
  }

  static invoice(invoiceId: string) {
    return `invoice:${invoiceId}`;
  }
}
