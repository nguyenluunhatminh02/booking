import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  body: z.string().optional(),
});

export class UpdateReviewDto extends createZodDto(updateReviewSchema) {
  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  rating?: number;

  @ApiPropertyOptional({ example: 'Updated review text' })
  body?: string;
}
