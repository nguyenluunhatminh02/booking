import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const createReviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().optional(),
});

export class CreateReviewDto extends createZodDto(createReviewSchema) {
  @ApiProperty({ example: 'booking-uuid-123' })
  bookingId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  rating: number;

  @ApiPropertyOptional({ example: 'Great place to stay!' })
  body?: string;
}
