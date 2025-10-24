import {
  IsString,
  IsOptional,
  IsNumber,
  IsISO8601,
  Min,
  IsDecimal,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '@prisma/client';

export class CreateBookingDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDecimal({ decimal_digits: '1,2' })
  amount: string;

  @IsOptional()
  @IsString()
  currency?: string = 'VND';

  @IsOptional()
  @IsDecimal({ decimal_digits: '1,2' })
  discount?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '1,2' })
  tax?: string;

  @IsISO8601()
  startTime: string;

  @IsISO8601()
  endTime: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
}
