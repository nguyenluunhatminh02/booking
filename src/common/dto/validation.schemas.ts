// src/common/dto/validation.schemas.ts

import { z } from 'zod';

/**
 * Shared Zod validation schemas
 * Use across all modules for consistent validation
 */

// ============= Common Schemas =============

export const UUIDSchema = z.string().uuid('Invalid UUID format');
export const CUIDSchema = z
  .string()
  .regex(/^c[a-z0-9]{24}$/, 'Invalid CUID format');
export const IDSchema = z.union([UUIDSchema, CUIDSchema]);

export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .toLowerCase();

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[!@#$%^&*]/, 'Password must contain special character');

export const WeakPasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password too long');

export const PhoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format');

export const URLSchema = z.string().url('Invalid URL format');

export const MoneySchema = z
  .number()
  .positive('Amount must be positive')
  .min(0.01, 'Minimum amount is 0.01')
  .max(999999999.99, 'Amount too large');

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be >= 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be >= 1')
    .max(100, 'Limit must be <= 100')
    .default(10),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============= User Schemas =============

export const CreateUserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name too long'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long'),
});

export const UpdateUserSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  email: EmailSchema.optional(),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ============= Booking Schemas =============

export const CreateBookingSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title too long'),
    description: z.string().max(1000, 'Description too long').optional(),
    notes: z.string().max(500, 'Notes too long').optional(),
    amount: MoneySchema,
    currency: z
      .string()
      .length(3, 'Currency must be 3 characters')
      .default('VND'),
    discount: MoneySchema.optional().default(0),
    tax: MoneySchema.optional().default(0),
    startTime: z.coerce
      .date()
      .refine((d) => d > new Date(), 'Start time must be in the future'),
    endTime: z.coerce.date(),
    timezone: z
      .string()
      .regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, 'Invalid timezone format')
      .optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export const UpdateBookingSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  notes: z.string().max(500).optional(),
  amount: MoneySchema.optional(),
  discount: MoneySchema.optional(),
  tax: MoneySchema.optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============= Payment Schemas =============

export const CreatePaymentIntentSchema = z.object({
  provider: z.enum(['STRIPE', 'VNPAY', 'MOCK']).default('MOCK'),
  returnUrl: URLSchema.optional(),
  orderInfo: z.string().max(500).optional(),
  clientIp: z
    .string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Invalid IPv4 format')
    .optional(),
});

export const RefundSchema = z.object({
  amount: MoneySchema.optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

// ============= Permission Schemas =============

export const CreatePermissionSchema = z.object({
  action: z
    .enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'])
    .transform((v) => v.toLowerCase()),
  subject: z.string().min(1, 'Subject is required').max(50),
  desc: z.string().max(500).optional(),
});

export const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50),
  description: z.string().max(500).optional(),
  permissions: z.array(IDSchema).optional(),
});

// ============= General Helpers =============

/**
 * Validate and parse data with Zod schema
 * Throws ValidationError if invalid
 */
export function validateInput<T>(schema: z.ZodSchema, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => issue.message).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }
  return result.data as T;
}

/**
 * Safely parse with Zod schema
 * Returns null if invalid
 */
export function safeValidateInput<T>(
  schema: z.ZodSchema,
  data: unknown,
): T | null {
  const result = schema.safeParse(data);
  return result.success ? (result.data as T) : null;
}
