import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ACLEffect } from '@prisma/client';

export const grantAccessSchema = z.object({
  userId: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  action: z.string().min(1),
  effect: z
    .enum([ACLEffect.ALLOW, ACLEffect.DENY] as const)
    .default(ACLEffect.ALLOW)
    .optional(),
  conditions: z.record(z.string(), z.any()).optional(),
});

export class GrantAccessDto extends createZodDto(grantAccessSchema) {}
