import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const calendarItemSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'date phải là ngày hợp lệ',
  }),
  price: z.number().int().min(0).optional(),
  remaining: z.number().int().min(0).optional(),
  isBlocked: z.boolean().optional(),
});

export const upsertCalendarSchema = z.object({
  items: z.array(calendarItemSchema).min(1),
});

export class CalendarItemDto extends createZodDto(calendarItemSchema) {
  @ApiProperty({ description: 'Date (YYYY-MM-DD or ISO)' })
  date: string;

  @ApiPropertyOptional({ description: 'Price per night' })
  price?: number;

  @ApiPropertyOptional({ description: 'Remaining inventory' })
  remaining?: number;

  @ApiPropertyOptional({ description: 'Is blocked' })
  isBlocked?: boolean;
}

export class UpsertCalendarDto extends createZodDto(upsertCalendarSchema) {
  @ApiProperty({ type: [CalendarItemDto] })
  items: CalendarItemDto[];
}
