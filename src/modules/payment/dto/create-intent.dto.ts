import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Payment provider enum
const PaymentProviderEnum = z.enum(['STRIPE', 'VNPAY', 'MOCK']);

// IPv4 regex (simple)
const ipv4Regex =
  /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/;

// Create payment intent schema
export const createPaymentIntentSchema = z.object({
  provider: PaymentProviderEnum.optional(),

  returnUrl: z
    .string()
    .url({ message: 'Return URL không hợp lệ' })
    .max(2048, { message: 'Return URL quá dài (tối đa 2048 ký tự)' })
    .optional(),

  orderInfo: z
    .string()
    .max(500, { message: 'Thông tin đơn hàng quá dài (tối đa 500 ký tự)' })
    .trim()
    // Sanitize HTML/script tags for XSS protection
    .transform((val) => val.replace(/<[^>]*>/g, ''))
    .optional(),

  clientIp: z
    .string()
    .regex(ipv4Regex, { message: 'Địa chỉ IPv4 không hợp lệ' })
    .optional(),
});

export class CreatePaymentIntentDto extends createZodDto(
  createPaymentIntentSchema,
) {}

// Export type for use in service
export type CreatePaymentIntentInput = z.infer<
  typeof createPaymentIntentSchema
>;
