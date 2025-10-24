import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Zod Schema for Login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z.string().min(1, 'Password is required'),
});

// DTO class for Swagger documentation
export class LoginDto extends createZodDto(loginSchema) {}

// Type inference
export type LoginInput = z.infer<typeof loginSchema>;
