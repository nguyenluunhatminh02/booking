import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createBookingSchema } from './create-booking.dto';

export const updateBookingSchema = createBookingSchema.partial().extend({
  status: z.string().optional(),
});

export class UpdateBookingDto extends createZodDto(updateBookingSchema) {}

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
