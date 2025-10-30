import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const checkAccessSchema = z.object({
  userId: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  action: z.string().min(1),
  context: z.record(z.string(), z.any()).optional(),
});

export class CheckAccessDto extends createZodDto(checkAccessSchema) {}
