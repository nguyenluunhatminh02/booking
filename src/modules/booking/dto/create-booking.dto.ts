import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createBookingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Số tiền không hợp lệ'),
  currency: z.string().default('VND').optional(),
  discount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Giảm giá không hợp lệ')
    .optional(),
  tax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Thuế không hợp lệ')
    .optional(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'startTime phải là ISO8601',
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'endTime phải là ISO8601',
  }),
  timezone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export class CreateBookingDto extends createZodDto(createBookingSchema) {}

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
