// src/common/pipes/my-zod.pipe.ts
import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError } from 'zod';
import { createZodValidationPipe } from 'nestjs-zod';

const BaseZodPipe = createZodValidationPipe({
  createValidationException: (error: ZodError) =>
    new BadRequestException({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: error.issues.map((i) => ({
          field: i.path.join('.'),
          code: i.code,
          message: i.message,
        })),
      },
    }),
});

// ✅ Export factory (không lộ kiểu nội bộ)
export const makeZodValidationPipe = (): PipeTransform => new BaseZodPipe();
