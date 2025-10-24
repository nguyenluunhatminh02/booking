import { IsString, IsOptional, IsDecimal } from 'class-validator';

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '1,2' })
  refundAmount?: string;
}
