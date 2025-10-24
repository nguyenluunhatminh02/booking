import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

// Strong password schema
const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(100, 'Mật khẩu không được vượt quá 100 ký tự')
  .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ in hoa')
  .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ thường')
  .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt');

// Register Schema - Flexible: supports both name OR firstName+lastName
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email là bắt buộc')
      .email({ message: 'Email không hợp lệ' })
      .toLowerCase()
      .trim(),
    password: passwordSchema,
    confirmPassword: z.string().optional(),
    // Option 1: Single name field
    name: z
      .string()
      .min(2, 'Tên phải có ít nhất 2 ký tự')
      .max(100, 'Tên không được vượt quá 100 ký tự')
      .trim()
      .optional(),
    // Option 2: Separate first and last name
    firstName: z
      .string()
      .min(2, 'Họ phải có ít nhất 2 ký tự')
      .max(50, 'Họ không được vượt quá 50 ký tự')
      .trim()
      .optional(),
    lastName: z
      .string()
      .min(2, 'Tên phải có ít nhất 2 ký tự')
      .max(50, 'Tên không được vượt quá 50 ký tự')
      .trim()
      .optional(),
  })
  .refine(
    (data) => !data.confirmPassword || data.password === data.confirmPassword,
    {
      message: 'Mật khẩu xác nhận không khớp',
      path: ['confirmPassword'],
    },
  )
  .refine((data) => data.name || (data.firstName && data.lastName), {
    message:
      'Vui lòng cung cấp tên (name) hoặc cả họ và tên (firstName và lastName)',
    path: ['name'],
  });

// DTO class for Swagger
export class RegisterDto extends createZodDto(registerSchema) {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'kronosss2002@gmail.com',
  })
  email!: string;

  @ApiProperty({
    description:
      'Password (min 8 chars, must contain uppercase, lowercase, number, special char)',
    example: 'Test123456!',
    minLength: 8,
  })
  password!: string;

  @ApiProperty({
    description: 'Confirm password (optional)',
    example: 'Test123456!',
    required: false,
  })
  confirmPassword?: string;

  @ApiProperty({
    description: 'Full name of the user (alternative to firstName + lastName)',
    example: 'Test User',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'First name (use with lastName, alternative to name)',
    example: 'Test',
    required: false,
  })
  firstName?: string;

  @ApiProperty({
    description: 'Last name (use with firstName, alternative to name)',
    example: 'User',
    required: false,
  })
  lastName?: string;
}

// Type inference
export type RegisterInput = z.infer<typeof registerSchema>;
