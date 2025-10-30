/**
 * Caching Infrastructure
 *
 * Provides production-grade caching with multiple patterns:
 * - Cache-Aside (lazy loading)
 * - Write-Through (consistent writes)
 * - Write-Behind (async writes)
 *
 * Features:
 * - Automatic cache invalidation on data mutations
 * - Pattern-based cache key management
 * - Metrics and logging
 * - Support for Redis, Memcached, and in-memory backends
 * - Type-safe operations
 * - Graceful degradation if cache unavailable
 */

export { CacheService } from './cache.service';
export {
  CacheKeyBuilder,
  CACHE_INVALIDATION_STRATEGIES,
} from './cache.service';
export {
  Cacheable,
  CacheInvalidate,
  CacheProvider,
  CacheKeyable,
} from './cache.decorator';
export { CachingModule, CachingModuleFactory } from './caching.module';
