import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Create refund schema
export const createRefundSchema = z.object({
  amount: z
    .number()
    .int({ message: 'Số tiền phải là số nguyên' })
    .min(1, { message: 'Số tiền hoàn phải ít nhất là 1' })
    .max(100000000, {
      message: 'Số tiền hoàn vượt quá giới hạn cho phép (100,000,000)',
    })
    .optional(),
});

export class CreateRefundDto extends createZodDto(createRefundSchema) {}

// Export type for use in service
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
