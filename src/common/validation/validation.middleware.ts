import {
  Injectable,
  BadRequestException,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Validation Middleware for request body
 *
 * Can be used globally or for specific routes
 * Validates request.body against Zod schema
 *
 * Usage in module:
 * ```ts
 * export class BookingModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(new ValidationMiddleware(CreateBookingSchema))
 *       .forRoutes('POST /bookings');
 *   }
 * }
 * ```
 */
@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  constructor(private schema: ZodSchema) {}

  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate and transform request body
      const validated = this.schema.parse(req.body);
      // Replace body with validated data
      req.body = validated;
      next();
    } catch (error: any) {
      // Format Zod errors for API response
      const zodErrors = error.errors || [];
      const formatted = zodErrors.map((err: any) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
        expected: err.expected,
        received: err.received,
      }));

      throw new BadRequestException({
        message: 'Request validation failed',
        errors: formatted,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * Create a validation middleware for a specific schema
 *
 * Usage:
 * ```ts
 * export class BookingModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(createValidationMiddleware(CreateBookingSchema))
 *       .forRoutes('POST /bookings');
 *   }
 * }
 * ```
 */
export function createValidationMiddleware(schema: ZodSchema) {
  return new ValidationMiddleware(schema);
}

/**
 * Generic type-safe request validator
 * Use in controllers or services to validate data
 *
 * Usage:
 * ```ts
 * const validator = new TypeSafeValidator();
 * const result = validator.validate(CreateBookingSchema, requestData);
 * if (!result.success) {
 *   throw new BadRequestException(result.errors);
 * }
 * ```
 */
export class TypeSafeValidator {
  /**
   * Validate data against schema
   * Returns success status and errors
   */
  validate<T>(schema: ZodSchema, data: unknown): ValidateResult<T> {
    try {
      const result = schema.parse(data);
      return {
        success: true,
        data: result as T,
        errors: undefined,
      };
    } catch (error: any) {
      const zodErrors = error.errors || [];
      const errors = zodErrors.map((err: any) => ({
        field: err.path.join('.') || 'root',
        message: err.message,
        code: err.code,
      }));

      return {
        success: false,
        data: undefined,
        errors,
      };
    }
  }

  /**
   * Validate and throw on error
   * For use in services where you want exceptions
   */
  validateOrThrow<T>(schema: ZodSchema, data: unknown): T {
    const result = this.validate<T>(schema, data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.errors,
      });
    }
    return result.data!;
  }

  /**
   * Safely validate without throwing
   * Returns validated data or undefined
   */
  validateSafe<T>(schema: ZodSchema, data: unknown): T | undefined {
    try {
      return schema.parse(data) as T;
    } catch {
      return undefined;
    }
  }
}

/**
 * Validation result type
 */
export interface ValidateResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}
