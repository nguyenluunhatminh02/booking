// common/pipes/validation.pipe.ts
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import { ERROR_CODES } from '../exceptions/app-error-codes';

/**
 * Custom validation pipe with better error messages
 */
@Injectable()
export class ValidationPipe
  extends NestValidationPipe
  implements PipeTransform
{
  constructor() {
    super({
      whitelist: true, // Strip properties without decorators
      forbidNonWhitelisted: true, // Throw error for extra properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert types implicitly
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          field: error.property,
          constraints: Object.values(error.constraints || {}),
        }));

        return new BadRequestException({
          message: 'Dữ liệu không hợp lệ',
          code: ERROR_CODES.VALIDATION_ERROR,
          details: messages,
        });
      },
    });
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    return super.transform(value, metadata);
  }
}
