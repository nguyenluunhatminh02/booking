import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';

// Zod schema for CreateUser
export const createUserSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }).trim(),
  password: z
    .string()
    .min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
    .max(100)
    .regex(/[A-Z]/, 'Mật khẩu phải có chữ in hoa')
    .regex(/[a-z]/, 'Mật khẩu phải có chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có chữ số')
    .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải có ký tự đặc biệt'),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  role: z
    .enum([SystemRole.USER, SystemRole.ADMIN, SystemRole.MODERATOR] as const)
    .optional(),
});

export class CreateUserDto extends createZodDto(createUserSchema) {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  password: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiPropertyOptional({ example: SystemRole.USER, enum: SystemRole })
  role?: SystemRole;
}

export type CreateUserInput = z.infer<typeof createUserSchema>;
