// utils/validation-options.ts
import { HttpStatus, ValidationPipeOptions } from '@nestjs/common';

/**
 * Global validation options for class-validator
 */
const validationOptions: ValidationPipeOptions = {
  whitelist: true, // Remove properties that don't have decorators
  forbidNonWhitelisted: true, // Throw error if unknown properties
  transform: true, // Auto-transform payloads to DTO instances
  transformOptions: {
    enableImplicitConversion: true, // Convert types automatically
  },
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  exceptionFactory: (errors) => {
    // Custom error format
    return {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.map((error) => ({
        field: error.property,
        constraints: Object.values(error.constraints || {}),
      })),
    };
  },
};

export default validationOptions;
