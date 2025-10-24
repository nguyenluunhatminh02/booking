// common/constants/index.ts

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

/**
 * Rate limiting constants
 */
export const DEFAULT_RATE_LIMIT_TTL = 60; // seconds
export const DEFAULT_RATE_LIMIT_COUNT = 120; // requests

/**
 * JWT constants
 */
export const JWT_ACCESS_TOKEN_EXPIRES_IN = '1d';
export const JWT_REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * Request timeout
 */
export const DEFAULT_REQUEST_TIMEOUT = 30000; // 30 seconds
