// common/exceptions/app-error-codes.ts
/**
 * Central list of application error codes.
 * Keys are descriptive identifiers; values are the canonical string codes used at runtime.
 */
export const ERROR_CODES = {
  // Auth & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // User
  USER_EXISTS: 'USER_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // General
  NOT_FOUND: 'NOT_FOUND',
  UNIQUE_CONFLICT: 'UNIQUE_CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
} as const;

// Keys: 'USER_EXISTS' | 'NOT_FOUND' | 'UNIQUE_CONFLICT' | 'VALIDATION_ERROR'
export type AppErrorCode = keyof typeof ERROR_CODES;

// Values: 'USER_EXISTS' | 'NOT_FOUND' | 'UNIQUE_CONFLICT' | 'VALIDATION_ERROR'
export type AppErrorCodeValue = (typeof ERROR_CODES)[AppErrorCode];
