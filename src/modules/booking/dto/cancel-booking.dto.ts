import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const cancelBookingSchema = z.object({
  reason: z.string().min(1),
  refundAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Số tiền hoàn trả không hợp lệ')
    .optional(),
});

export class CancelBookingDto extends createZodDto(cancelBookingSchema) {}

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
