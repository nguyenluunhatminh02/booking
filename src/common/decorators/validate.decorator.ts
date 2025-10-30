import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Zod Validation Decorator
 *
 * Validates and transforms request body using Zod schema
 * Automatically returns 400 with validation errors if validation fails
 *
 * Usage:
 * ```ts
 * @Post('bookings')
 * async create(
 *   @ValidateBody(CreateBookingSchema) dto: CreateBookingDto
 * ) {
 *   // dto is already validated and transformed
 * }
 * ```
 *
 * Benefits:
 * - Declarative validation at method level
 * - Runtime schema validation
 * - Type-safe DTOs via Zod inference
 * - Centralized error handling
 * - Automatic transformation (trim strings, convert types, etc.)
 */
export const ValidateBody = (schema: ZodSchema) =>
  createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    try {
      // Parse and validate request body with Zod schema
      const validated = schema.parse(req.body);
      // Replace body with validated data (includes transformations)
      req.body = validated;
      return validated;
    } catch (error: any) {
      // Format Zod validation errors into readable format
      const zodErrors = error.errors || [];
      const messages = zodErrors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }
  })('');

/**
 * Query Validation Decorator
 *
 * Validates query parameters using Zod schema
 *
 * Usage:
 * ```ts
 * @Get('bookings')
 * async list(
 *   @ValidateQuery(ListBookingsQuerySchema) query: ListBookingsQuery
 * ) {
 *   // query is already validated
 * }
 * ```
 */
export const ValidateQuery = (schema: ZodSchema) =>
  createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      return validated;
    } catch (error: any) {
      const zodErrors = error.errors || [];
      const messages = zodErrors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      throw new BadRequestException({
        message: 'Query validation failed',
        errors: messages,
      });
    }
  })('');

/**
 * Params Validation Decorator
 *
 * Validates route parameters using Zod schema
 *
 * Usage:
 * ```ts
 * @Get('bookings/:id')
 * async getOne(
 *   @ValidateParams(ParamIdSchema) params: { id: string }
 * ) {
 *   // params.id is validated
 * }
 * ```
 */
export const ValidateParams = (schema: ZodSchema) =>
  createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      return validated;
    } catch (error: any) {
      const zodErrors = error.errors || [];
      const messages = zodErrors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      throw new BadRequestException({
        message: 'Params validation failed',
        errors: messages,
      });
    }
  })('');
