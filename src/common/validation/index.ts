/**
 * Input Validation Infrastructure
 *
 * Provides comprehensive request validation using Zod:
 * - Decorators for controller methods
 * - Middleware for global validation
 * - Type-safe validators
 * - Detailed error messages
 * - Request transformation
 */

export {
  ValidateBody,
  ValidateQuery,
  ValidateParams,
} from '../decorators/validate.decorator';
export {
  ValidationMiddleware,
  createValidationMiddleware,
  TypeSafeValidator,
} from './validation.middleware';
export type { ValidateResult } from './validation.middleware';
