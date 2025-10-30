// src/common/dto/response-dtos/base.response.ts

import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

/**
 * Base response DTO - Use for all API responses
 * Automatically excludes sensitive fields
 */
export class BaseResponseDto {
  @ApiProperty({ description: 'Entity ID' })
  id: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt: Date;

  /**
   * Soft delete timestamp - NOT returned to clients
   */
  @Exclude()
  deletedAt?: Date | null;

  /**
   * Version for cache invalidation - NOT returned
   */
  @Exclude()
  version?: number;

  /**
   * Internal metadata - NOT returned
   */
  @Exclude()
  metadata?: Record<string, any>;
}

/**
 * Transform entity to response DTO
 * Removes sensitive fields automatically
 */
export function toResponseDto<T extends BaseResponseDto>(
  entity: any,
  DtoClass: new () => T,
): T {
  const dto = new DtoClass();
  Object.assign(dto, entity);
  // class-transformer will use @Exclude() decorator
  return dto;
}
