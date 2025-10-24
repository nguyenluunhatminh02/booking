// common/exceptions/prisma-exception.mapper.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from './app-error-codes';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

/**
 * Maps Prisma errors to HTTP exceptions with proper error codes
 */
export function mapPrismaError(e: unknown): HttpException | null {
  if (e instanceof PrismaClientKnownRequestError) {
    const error = e;
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        return new HttpException(
          {
            message: 'Dữ liệu đã tồn tại',
            code: ERROR_CODES.UNIQUE_CONFLICT,
            details: error.meta,
          },
          HttpStatus.CONFLICT,
        );

      case 'P2025':
        // Record not found
        return new HttpException(
          {
            message: 'Không tìm thấy bản ghi',
            code: ERROR_CODES.NOT_FOUND,
            details: error.meta,
          },
          HttpStatus.NOT_FOUND,
        );

      case 'P2003':
        // Foreign key constraint violation
        return new HttpException(
          {
            message: 'Vi phạm ràng buộc khóa ngoại',
            code: ERROR_CODES.CONSTRAINT_VIOLATION,
            details: error.meta,
          },
          HttpStatus.BAD_REQUEST,
        );

      case 'P2014':
        // Required relation violation
        return new HttpException(
          {
            message: 'Vi phạm mối quan hệ bắt buộc',
            code: ERROR_CODES.CONSTRAINT_VIOLATION,
            details: error.meta,
          },
          HttpStatus.BAD_REQUEST,
        );

      case 'P2015':
        // Related record not found
        return new HttpException(
          {
            message: 'Không tìm thấy bản ghi liên quan',
            code: ERROR_CODES.NOT_FOUND,
            details: error.meta,
          },
          HttpStatus.NOT_FOUND,
        );

      default:
        return new HttpException(
          {
            message: 'Lỗi cơ sở dữ liệu',
            code: ERROR_CODES.DATABASE_ERROR,
            details: { prismaCode: error.code },
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }

  if (e instanceof PrismaClientValidationError) {
    return new HttpException(
      {
        message: 'Dữ liệu không hợp lệ',
        code: ERROR_CODES.VALIDATION_ERROR,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  if (e instanceof PrismaClientInitializationError) {
    return new HttpException(
      {
        message: 'Không thể kết nối cơ sở dữ liệu',
        code: ERROR_CODES.DATABASE_ERROR,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  return null;
}
