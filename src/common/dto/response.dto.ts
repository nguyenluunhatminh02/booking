// common/dto/response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard API response wrapper
 */
export class ResponseDto<T> {
  @ApiProperty({ example: true })
  ok: boolean;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiProperty()
  path?: string;

  @ApiProperty()
  timestamp?: string;
}

/**
 * Paginated response metadata
 */
export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

/**
 * Paginated response wrapper
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ type: 'array' })
  items: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
