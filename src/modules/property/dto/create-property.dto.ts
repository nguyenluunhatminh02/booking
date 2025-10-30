import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const createPropertySchema = z.object({
  title: z.string().min(1),
  address: z.string().min(1),
  description: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  amenities: z.any().optional(),
});

export class CreatePropertyDto extends createZodDto(createPropertySchema) {
  @ApiProperty({ description: 'Property title' })
  title: string;

  @ApiProperty({ description: 'Property address' })
  address: string;

  @ApiPropertyOptional({ description: 'Property description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  lng?: number;

  @ApiPropertyOptional({ description: 'Amenities JSON' })
  amenities?: any;
}
