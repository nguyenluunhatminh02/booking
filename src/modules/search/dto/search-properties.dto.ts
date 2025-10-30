import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const searchPropertiesSchema = z.object({
  q: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusKm: z.number().min(1).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  amenities: z.array(z.string()).optional(),
  sort: z.enum(['price', 'rating', 'distance', 'relevance']).optional(),
  limit: z.number().min(1).max(200).optional(),
  offset: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const suggestSchema = z.object({
  q: z.string().min(1),
  field: z.enum(['title', 'address']).optional(),
});

export class SearchPropertiesDto extends createZodDto(searchPropertiesSchema) {}

export class SuggestDto extends createZodDto(suggestSchema) {}
