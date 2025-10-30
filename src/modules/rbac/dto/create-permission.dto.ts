import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createPermissionSchema = z.object({
  action: z.string().min(1),
  subject: z.string().min(1),
  desc: z.string().optional(),
});

export class CreatePermissionDto extends createZodDto(createPermissionSchema) {}
