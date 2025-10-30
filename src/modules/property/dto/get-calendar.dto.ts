import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const getCalendarSchema = z.object({
  from: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'from phải là ngày hợp lệ',
    })
    .optional(),
  to: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'to phải là ngày hợp lệ',
    })
    .optional(),
});

export class GetCalendarDto extends createZodDto(getCalendarSchema) {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD or ISO)' })
  from?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD or ISO)' })
  to?: string;
}
