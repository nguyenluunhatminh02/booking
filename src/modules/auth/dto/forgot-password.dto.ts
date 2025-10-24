import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
});

export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}
