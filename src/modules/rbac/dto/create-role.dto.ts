import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createRoleSchema = z.object({
  name: z.string().min(1),
  desc: z.string().optional(),
  isSystem: z.boolean().default(false).optional(),
});

export class CreateRoleDto extends createZodDto(createRoleSchema) {}
