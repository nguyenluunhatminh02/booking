// src/common/dto/response-dtos/booking.response.ts

import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { BaseResponseDto } from './base.response';

/**
 * Booking response DTO
 * Shows only public booking information
 */
export class BookingResponseDto extends BaseResponseDto {
  @ApiProperty({ description: 'Booking title' })
  title: string;

  @ApiProperty({ description: 'Booking description', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Admin notes', nullable: true })
  @Exclude() // Don't show to end users
  notes?: string;

  @ApiProperty({ description: 'Booking amount' })
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Applied discount' })
  discount: number;

  @ApiProperty({ description: 'Applied tax' })
  tax: number;

  @ApiProperty({ description: 'Final amount' })
  finalAmount: number;

  @ApiProperty({ description: 'Start time' })
  startTime: Date;

  @ApiProperty({ description: 'End time' })
  endTime: Date;

  @ApiProperty({ description: 'Duration in minutes' })
  duration: number;

  @ApiProperty({ description: 'Timezone' })
  timezone?: string;

  @ApiProperty({ description: 'Booking status' })
  status: string;

  @ApiProperty({ description: 'Tags/labels', type: [String] })
  tags?: string[];

  @ApiProperty({ description: 'User ID who created booking' })
  userId: string;
}

/**
 * Booking list DTO - Minimal information
 */
export class BookingListResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  finalAmount: number;

  @ApiProperty()
  createdAt: Date;
}
